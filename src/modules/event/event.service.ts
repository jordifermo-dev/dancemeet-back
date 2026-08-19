import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventRepository } from './event.repository';
import { CreateEventDto, EventDto, SearchedEventDto, UpdateEventDto } from './event.dto';
import { CreateEventSeriesDto, PatchEventSeriesDto, RecurrenceRuleDto } from './event-series.dto';
import { ResourceNotFoundException } from '../../common';
import { RecurrenceRule, expandRecurrence, formatHHmm, isSameLocalDay, MAX_SERIES_OCCURRENCES } from './recurrence';
import { NotificationService } from '../notification/notification.service';
import { UserService } from '../user/user.service';
import { FollowersService } from '../followers/followers.service';
import { FavoriteService } from '../favorite/favorite.service';

export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly userService: UserService,
    private readonly followersService: FollowersService,
    private readonly moduleRef: ModuleRef,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * See UserService.followersService for why this is resolved lazily via
   * ModuleRef instead of constructor-injected.
   */
  private get favoriteService(): FavoriteService {
    return this.moduleRef.get(FavoriteService, { strict: false });
  }

  /**
   * Create a new event
   */
  async createEvent(eventData: CreateEventDto): Promise<EventDto> {
    if (eventData.eventDateTo <= eventData.eventDateFrom) {
      throw new BadRequestException('eventDateTo must be after eventDateFrom');
    }
    const created = await this.eventRepository.create(eventData);
    // Organizing an event means attending it - this is what actually
    // makes the creator count as an attendee (heart filled, attendee
    // list/count includes them), not just a display-only default.
    await this.favoriteService.createFavorite({
      userId: created.creatorId,
      eventId: created.id!,
      createdAt: Date.now(),
    });
    await this.notifyAboutNewEvent(created);
    return created;
  }

  /** Two audiences for a freshly published event: people following the
   * organizer, and (separately) people whose saved discipline/type/status
   * preferences match it - the second group excludes anyone already
   * reached through the first, and the organizer themselves, so nobody gets
   * the same event announced to them twice. */
  private async notifyAboutNewEvent(event: EventDto): Promise<void> {
    const creator = await this.userService.findById(event.creatorId);
    const followers = await this.followersService.findByUser(event.creatorId);
    const followerIds = followers.map((f) => f.followerId);
    if (followerIds.length) {
      await this.notificationService.notifyMany(followerIds, 'following_new_event', {
        eventId: event.id!,
        eventTitle: event.title,
        name: creator?.name ?? '',
      });
    }
    const matching = await this.userService.findMatchingEventPreferences(
      event.disciplineIds,
      event.typeIds,
      event.status,
    );
    const alreadyNotified = new Set([...followerIds, event.creatorId]);
    const preferenceIds = matching.map((u) => u.id!).filter((id) => !alreadyNotified.has(id));
    if (preferenceIds.length) {
      await this.notificationService.notifyMany(preferenceIds, 'preference_new_event', {
        eventId: event.id!,
        eventTitle: event.title,
      });
    }
  }

  /**
   * Create a recurring series: expands the rule into concrete occurrences
   * server-side, bulk-inserts one real Event per occurrence (all sharing a
   * seriesId - see EventRepository.createSeries), auto-favorites the
   * creator for every instance, and sends a single series-level
   * notification instead of one per instance (createEvent()'s
   * notifyAboutNewEvent would otherwise fan out N times to the same
   * followers for what the user experiences as one action).
   */
  async createEventSeries(dto: CreateEventSeriesDto): Promise<{ seriesId: string; events: EventDto[] }> {
    if (dto.timeTo <= dto.timeFrom) {
      throw new BadRequestException('timeTo must be after timeFrom');
    }
    const rule: RecurrenceRule = {
      frequency: dto.recurrence.frequency,
      interval: dto.recurrence.interval,
      weekdays: dto.recurrence.weekdays,
      nthWeekdays: dto.recurrence.nthWeekdays,
      dateFrom: dto.recurrence.dateFrom,
      dateTo: dto.recurrence.dateTo ?? null,
    };
    const occurrences = expandRecurrence(rule, dto.timeFrom, dto.timeTo);
    if (!occurrences.length) {
      throw new BadRequestException('The recurrence rule did not generate any occurrences');
    }
    if (occurrences.length > MAX_SERIES_OCCURRENCES) {
      throw new BadRequestException(
        `The recurrence rule would generate ${occurrences.length} events, more than the maximum of ${MAX_SERIES_OCCURRENCES}`,
      );
    }
    const { recurrence, timeFrom, timeTo, ...baseFields } = dto;
    const seriesId = randomUUID();
    const events = await this.eventRepository.createSeries(baseFields, occurrences, seriesId);
    // Same reasoning as createEvent()'s single favorite.create() call -
    // organizing means attending every instance too.
    await Promise.all(
      events.map((event) =>
        this.favoriteService.createFavorite({ userId: event.creatorId, eventId: event.id!, createdAt: Date.now() }),
      ),
    );
    await this.notifyAboutRecurringSeries(events);
    return { seriesId, events };
  }

  private async notifyAboutRecurringSeries(events: EventDto[]): Promise<void> {
    const first = events[0];
    const followers = await this.followersService.findByUser(first.creatorId);
    const followerIds = followers.map((f) => f.followerId);
    if (followerIds.length) {
      await this.notificationService.notifyMany(followerIds, 'recurring_series_created', {
        eventId: first.id!,
        eventTitle: first.title,
        count: String(events.length),
      });
    }
    const matching = await this.userService.findMatchingEventPreferences(
      first.disciplineIds,
      first.typeIds,
      first.status,
    );
    const alreadyNotified = new Set([...followerIds, first.creatorId]);
    const preferenceIds = matching.map((u) => u.id!).filter((id) => !alreadyNotified.has(id));
    if (preferenceIds.length) {
      await this.notificationService.notifyMany(preferenceIds, 'recurring_series_created', {
        eventId: first.id!,
        eventTitle: first.title,
        count: String(events.length),
      });
    }
  }

  async getEventsBySeriesId(seriesId: string): Promise<EventDto[]> {
    return this.eventRepository.findBySeriesId(seriesId);
  }

  /**
   * Bulk-edits every instance of a series: non-date fields via a plain
   * updateMany, and timeFrom/timeTo (if both given) via a per-document date
   * recompute (see EventRepository.bulkShiftSeriesTime) since each instance
   * keeps its own date. Notifies every series attendee once, reusing the
   * existing 'event_updated' type pointed at the series' first instance.
   */
  async updateEventSeries(seriesId: string, patch: PatchEventSeriesDto): Promise<number> {
    const { timeFrom, timeTo, ...rest } = patch;
    if ((timeFrom === undefined) !== (timeTo === undefined)) {
      throw new BadRequestException('timeFrom and timeTo must be provided together');
    }
    let modifiedCount = 0;
    if (Object.keys(rest).length) {
      modifiedCount = await this.eventRepository.updateManyBySeriesId(seriesId, rest);
    }
    if (timeFrom !== undefined && timeTo !== undefined) {
      if (timeTo <= timeFrom) {
        throw new BadRequestException('timeTo must be after timeFrom');
      }
      modifiedCount = await this.eventRepository.bulkShiftSeriesTime(seriesId, timeFrom, timeTo);
    }
    await this.notifyAttendeesOfSeriesUpdate(seriesId);
    return modifiedCount;
  }

  private async notifyAttendeesOfSeriesUpdate(seriesId: string): Promise<void> {
    const events = await this.eventRepository.findBySeriesId(seriesId);
    if (!events.length) {
      return;
    }
    const first = events[0];
    const attendeeSets = await Promise.all(events.map((event) => this.favoriteService.findByEvent(event.id!)));
    const attendeeIds = [...new Set(attendeeSets.flat().map((a) => a.userId))].filter((id) => id !== first.creatorId);
    if (attendeeIds.length) {
      await this.notificationService.notifyMany(attendeeIds, 'event_updated', {
        eventId: first.id!,
        eventTitle: first.title,
      });
    }
  }

  /**
   * Deletes every instance of a series - no attendee notification, matching
   * deleteEvent()'s own single-event behavior (which doesn't notify either).
   */
  async deleteEventSeries(seriesId: string): Promise<number> {
    return this.eventRepository.deleteManyBySeriesId(seriesId);
  }

  /**
   * Turns an already-published single event into the first instance of a
   * brand-new series - the event keeps its id (and therefore its existing
   * favorites/notification history), and the remaining occurrences are
   * created as new documents sharing a fresh seriesId. The rule's own
   * dateFrom is ignored (always forced to the existing event's day, since
   * that day has to be part of the series) and timeFrom/timeTo are derived
   * from the existing event's own eventDateFrom/eventDateTo rather than
   * being resent by the caller.
   */
  async attachRecurrenceToEvent(
    eventId: string,
    ruleDto: RecurrenceRuleDto,
  ): Promise<{ seriesId: string; events: EventDto[] }> {
    const existing = await this.eventRepository.findById(eventId);
    if (!existing) {
      throw new ResourceNotFoundException('Event', eventId);
    }
    if (existing.seriesId) {
      throw new BadRequestException('This event is already part of a recurring series');
    }
    const timeFrom = formatHHmm(existing.eventDateFrom);
    const timeTo = formatHHmm(existing.eventDateTo);
    const rule: RecurrenceRule = {
      frequency: ruleDto.frequency,
      interval: ruleDto.interval,
      weekdays: ruleDto.weekdays,
      nthWeekdays: ruleDto.nthWeekdays,
      dateFrom: existing.eventDateFrom,
      dateTo: ruleDto.dateTo ?? null,
    };
    const occurrences = expandRecurrence(rule, timeFrom, timeTo);
    if (!occurrences.length || !isSameLocalDay(occurrences[0].eventDateFrom, existing.eventDateFrom)) {
      throw new BadRequestException("The recurrence rule must include this event's own day");
    }
    if (occurrences.length > MAX_SERIES_OCCURRENCES) {
      throw new BadRequestException(
        `The recurrence rule would generate ${occurrences.length} events, more than the maximum of ${MAX_SERIES_OCCURRENCES}`,
      );
    }
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      seriesId: _seriesId,
      seriesIndex: _seriesIndex,
      seriesTotal: _seriesTotal,
      eventDateFrom: _eventDateFrom,
      eventDateTo: _eventDateTo,
      status: _status,
      ...baseFields
    } = existing;
    const seriesId = randomUUID();
    const events = await this.eventRepository.attachToExistingSeries(eventId, baseFields, seriesId, occurrences);
    // The existing event is already favorited by its creator (from
    // createEvent()) - only the newly-created instances need it.
    await Promise.all(
      events
        .slice(1)
        .map((event) =>
          this.favoriteService.createFavorite({ userId: event.creatorId, eventId: event.id!, createdAt: Date.now() }),
        ),
    );
    await this.notifyAboutRecurringSeries(events);
    return { seriesId, events };
  }

  /**
   * Raw, tolerant lookup (null if missing) - for other services that need a
   * single event without the 404-throwing behavior of getEventById, so they
   * don't have to depend on EventRepository directly.
   */
  async findById(eventId: string): Promise<EventDto | null> {
    return await this.eventRepository.findById(eventId);
  }

  /**
   * Raw passthrough - for other services that need a batch of events by id
   * without depending on EventRepository directly.
   */
  async findByIds(eventIds: string[]): Promise<EventDto[]> {
    return await this.eventRepository.findByIds(eventIds);
  }

  /**
   * Raw passthrough - for other services (e.g. FavoriteService's "events I
   * organize or favorited" list) that need a user's created events without
   * depending on EventRepository directly.
   */
  async findByCreator(creatorId: string): Promise<EventDto[]> {
    return await this.eventRepository.findByCreator(creatorId);
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string): Promise<EventDto> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new ResourceNotFoundException('Event', eventId);
    }
    return event;
  }

  /**
   * Get event by ID, hydrated with the creator's name - for the event-detail
   * screen, same idea as SearchedEventDto for the search list.
   */
  async getEventDetail(eventId: string): Promise<SearchedEventDto> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new ResourceNotFoundException('Event', eventId);
    }
    const creator = await this.userService.findById(event.creatorId);
    return { ...event, creatorName: creator?.name ?? '' };
  }

  /**
   * Get all events
   */
  async getAllEvents(): Promise<EventDto[]> {
    return await this.eventRepository.findAll();
  }

  /**
   * Update event
   */
  async updateEvent(eventId: string, updateData: UpdateEventDto): Promise<boolean> {
    if (
      updateData.eventDateFrom !== undefined &&
      updateData.eventDateTo !== undefined &&
      updateData.eventDateTo <= updateData.eventDateFrom
    ) {
      throw new BadRequestException('eventDateTo must be after eventDateFrom');
    }
    const updated = await this.eventRepository.update(eventId, {
      ...updateData,
      updatedAt: Date.now(),
    });
    if (!updated) {
      throw new ResourceNotFoundException('Event', eventId);
    }
    await this.notifyAttendeesOfUpdate(eventId);
    return true;
  }

  private async notifyAttendeesOfUpdate(eventId: string): Promise<void> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      return;
    }
    const attendees = await this.favoriteService.findByEvent(eventId);
    const attendeeIds = attendees.map((a) => a.userId).filter((id) => id !== event.creatorId);
    if (attendeeIds.length) {
      await this.notificationService.notifyMany(attendeeIds, 'event_updated', {
        eventId,
        eventTitle: event.title,
      });
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    const deleted = await this.eventRepository.delete(eventId);
    if (!deleted) {
      throw new ResourceNotFoundException('Event', eventId);
    }
    return true;
  }

  /**
   * Find events by discipline
   */
  async getEventsByDiscipline(disciplineId: string): Promise<EventDto[]> {
    return await this.eventRepository.findByDiscipline(disciplineId);
  }

  /**
   * Find events by type
   */
  async getEventsByType(typeId: string): Promise<EventDto[]> {
    return await this.eventRepository.findByType(typeId);
  }

  /**
   * Find events by city
   */
  async getEventsByCity(city: string): Promise<EventDto[]> {
    return await this.eventRepository.findByCity(city);
  }

  /**
   * Find upcoming events
   */
  async getUpcomingEvents(currentTime?: number): Promise<EventDto[]> {
    const time = currentTime || Date.now();
    return await this.eventRepository.findUpcoming(time);
  }

  /**
   * Find events nearby
   */
  async getEventsNearby(
    latitude: number,
    longitude: number,
    maxDistance: number,
  ): Promise<EventDto[]> {
    return await this.eventRepository.findNearby(latitude, longitude, maxDistance);
  }

  /**
   * Combined filter search: discipline(s), type(s), status(es), date range,
   * geo radius and free-text search, any combination optional. The free-text
   * term matches either the event title or the organizer's name (e.g.
   * searching a username finds the events they organize).
   */
  async searchEvents(params: {
    disciplineIds?: string[];
    typeIds?: string[];
    statuses?: string[];
    dateFrom?: number;
    dateTo?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
    search?: string;
    priceOptions?: string[];
  }): Promise<SearchedEventDto[]> {
    const matchingCreatorIds = params.search
      ? (await this.userService.findByNameContains(params.search)).map((u) => u.id!)
      : undefined;
    const events = await this.eventRepository.findFiltered({ ...params, matchingCreatorIds });
    if (!events.length) {
      return [];
    }
    const creators = await this.userService.findByIds([...new Set(events.map((e) => e.creatorId))]);
    const creatorNameById = new Map(creators.map((creator) => [creator.id, creator.name]));
    return events.map((event) => ({
      ...event,
      creatorName: creatorNameById.get(event.creatorId) ?? '',
    }));
  }

  /**
   * Count all events
   */
  async countEvents(): Promise<number> {
    return await this.eventRepository.count();
  }

  /**
   * Count events by creator
   */
  async countEventsByCreator(creatorId: string): Promise<number> {
    return await this.eventRepository.count({ creatorId });
  }
}
