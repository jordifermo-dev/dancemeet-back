import { BadRequestException } from '@nestjs/common';
import { EventRepository, FavoriteRepository, FollowersRepository, UserRepository } from '../repositories';
import { CreateEventDto, EventDto, SearchedEventDto, UpdateEventDto } from '../dto';
import { ResourceNotFoundException } from '../common';
import { NotificationService } from './notification.service';

export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly userRepository: UserRepository,
    private readonly followersRepository: FollowersRepository,
    private readonly favoriteRepository: FavoriteRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new event
   */
  async createEvent(eventData: CreateEventDto): Promise<EventDto> {
    try {
      if (eventData.eventDateTo <= eventData.eventDateFrom) {
        throw new BadRequestException('eventDateTo must be after eventDateFrom');
      }
      const created = await this.eventRepository.create(eventData);
      await this.notifyAboutNewEvent(created);
      return created;
    } catch (err) {
      throw err;
    }
  }

  /** Two audiences for a freshly published event: people following the
   * organizer, and (separately) people whose saved discipline/type/status
   * preferences match it - the second group excludes anyone already
   * reached through the first, and the organizer themselves, so nobody gets
   * the same event announced to them twice. */
  private async notifyAboutNewEvent(event: EventDto): Promise<void> {
    const creator = await this.userRepository.findById(event.creatorId);
    const followers = await this.followersRepository.findByUser(event.creatorId);
    const followerIds = followers.map((f) => f.followerId);
    if (followerIds.length) {
      await this.notificationService.notifyMany(followerIds, 'following_new_event', {
        eventId: event.id!,
        eventTitle: event.title,
        name: creator?.name ?? '',
      });
    }
    const matching = await this.userRepository.findMatchingEventPreferences(
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
   * Get event by ID
   */
  async getEventById(eventId: string): Promise<EventDto> {
    try {
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        throw new ResourceNotFoundException('Event', eventId);
      }
      return event;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get event by ID, hydrated with the creator's name - for the event-detail
   * screen, same idea as SearchedEventDto for the search list.
   */
  async getEventDetail(eventId: string): Promise<SearchedEventDto> {
    try {
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        throw new ResourceNotFoundException('Event', eventId);
      }
      const creator = await this.userRepository.findById(event.creatorId);
      return { ...event, creatorName: creator?.name ?? '' };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all events
   */
  async getAllEvents(): Promise<EventDto[]> {
    try {
      return await this.eventRepository.findAll();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Update event
   */
  async updateEvent(eventId: string, updateData: UpdateEventDto): Promise<boolean> {
    try {
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
    } catch (err) {
      throw err;
    }
  }

  private async notifyAttendeesOfUpdate(eventId: string): Promise<void> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      return;
    }
    const attendees = await this.favoriteRepository.findByEvent(eventId);
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
    try {
      const deleted = await this.eventRepository.delete(eventId);
      if (!deleted) {
        throw new ResourceNotFoundException('Event', eventId);
      }
      return true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Find events by discipline
   */
  async getEventsByDiscipline(disciplineId: string): Promise<EventDto[]> {
    try {
      return await this.eventRepository.findByDiscipline(disciplineId);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Find events by type
   */
  async getEventsByType(typeId: string): Promise<EventDto[]> {
    try {
      return await this.eventRepository.findByType(typeId);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Find events by city
   */
  async getEventsByCity(city: string): Promise<EventDto[]> {
    try {
      return await this.eventRepository.findByCity(city);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Find upcoming events
   */
  async getUpcomingEvents(currentTime?: number): Promise<EventDto[]> {
    try {
      const time = currentTime || Date.now();
      return await this.eventRepository.findUpcoming(time);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Find events nearby
   */
  async getEventsNearby(
    latitude: number,
    longitude: number,
    maxDistance: number,
  ): Promise<EventDto[]> {
    try {
      return await this.eventRepository.findNearby(latitude, longitude, maxDistance);
    } catch (err) {
      throw err;
    }
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
    try {
      const matchingCreatorIds = params.search
        ? (await this.userRepository.findByNameContains(params.search)).map((u) => u.id!)
        : undefined;
      const events = await this.eventRepository.findFiltered({ ...params, matchingCreatorIds });
      if (!events.length) {
        return [];
      }
      const creators = await this.userRepository.findByIds([...new Set(events.map((e) => e.creatorId))]);
      const creatorNameById = new Map(creators.map((creator) => [creator.id, creator.name]));
      return events.map((event) => ({
        ...event,
        creatorName: creatorNameById.get(event.creatorId) ?? '',
      }));
    } catch (err) {
      throw err;
    }
  }

  /**
   * Count all events
   */
  async countEvents(): Promise<number> {
    try {
      return await this.eventRepository.count();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Count events by creator
   */
  async countEventsByCreator(creatorId: string): Promise<number> {
    try {
      return await this.eventRepository.count({ creatorId });
    } catch (err) {
      throw err;
    }
  }
}
