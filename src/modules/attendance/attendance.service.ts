import { ModuleRef } from '@nestjs/core';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceDto, AttendedEventDto, EventAttendeeDto } from './attendance.dto';
import {
  ResourceNotFoundException,
  BusinessRuleException,
  DuplicateKeyException,
} from '../../common';
import { NotificationService } from '../notification/notification.service';
import { UserService } from '../user/user.service';
import { EventService } from '../event/event.service';
import { EventManagerService } from '../event-manager/event-manager.service';
import { ReviewService } from '../review/review.service';
import { EventChatService } from '../event-chat/event-chat.service';
import { GalleryService } from '../gallery/gallery.service';
import { FavoriteService } from '../favorite/favorite.service';

export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly moduleRef: ModuleRef,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * See UserService.followersService for why this is resolved lazily via
   * ModuleRef instead of constructor-injected.
   */
  private get eventService(): EventService {
    return this.moduleRef.get(EventService, { strict: false });
  }

  /** Same reasoning as eventService above - circular with EventManagerModule
   * (EventManagerService.respondToInvite calls ensureAttendingMany below). */
  private get eventManagerService(): EventManagerService {
    return this.moduleRef.get(EventManagerService, { strict: false });
  }

  /** Same reasoning as eventService above - circular with ReviewModule. */
  private get reviewService(): ReviewService {
    return this.moduleRef.get(ReviewService, { strict: false });
  }

  private get eventChatService(): EventChatService {
    return this.moduleRef.get(EventChatService, { strict: false });
  }

  private get galleryService(): GalleryService {
    return this.moduleRef.get(GalleryService, { strict: false });
  }

  private get favoriteService(): FavoriteService {
    return this.moduleRef.get(FavoriteService, { strict: false });
  }

  async createAttendance(
    attendanceData: { userId: string; eventId: string; chatVisibleFrom?: number; createdAt?: number },
  ): Promise<AttendanceDto> {
    return await this.attendanceRepository.create(attendanceData);
  }

  /**
   * Get the events a user organizes (creatorId) and/or genuinely attends,
   * hydrated with the creator's name so "Mis eventos" can render a full card
   * without a request per event. Each event is tagged with how the user
   * relates to it - creating it always wins over attending it (organizing
   * your own event already means you're attending, so there's nothing extra
   * to signal by also marking it attended).
   */
  async getAttendedEventsDetailed(userId: string): Promise<AttendedEventDto[]> {
    const attendances = await this.attendanceRepository.findByUser(userId);
    const attendedEventIds = new Set(attendances.map((a) => a.eventId));

    const createdEvents = await this.eventService.findByCreator(userId);
    const createdEventIds = new Set(createdEvents.map((e) => e.id!));
    // An accepted manager has the same organizer-level relationship to the
    // event as its creator (see EventManagerService.respondToInvite, which
    // already grants them attendance on accept the same way createEvent()
    // does for the creator) - treated identically here so "Organizas" shows
    // for both, not just the literal creatorId match.
    const managedEventIds = new Set(await this.eventManagerService.getAcceptedEventIdsForUser(userId));

    const allEventIds = [...new Set([...attendedEventIds, ...createdEventIds])];
    if (!allEventIds.length) {
      return [];
    }

    const events = await this.eventService.findByIds(allEventIds);
    const creators = await this.userService.findByIds([...new Set(events.map((e) => e.creatorId))]);
    const creatorNameById = new Map(creators.map((creator) => [creator.id, creator.name]));
    const eventIds = events.map((event) => event.id!);
    const [
      attendeesCountByEventId,
      likesCountByEventId,
      ratingByEventId,
      unreadChatByEventId,
      unreadGalleryByEventId,
      unreadPrivateGalleryByEventId,
      latestMessageByEventId,
    ] = await Promise.all([
      this.countAttendanceByEvents(eventIds),
      this.favoriteService.countFavoritesByEvents(eventIds),
      this.reviewService.getRatingsByEventIds(eventIds),
      // Same batched-badge pattern FavoriteService.getFavoritedEventsDetailed
      // already uses - every event here genuinely has an Attendance row, so
      // none of these three ever come back empty the way they legitimately
      // can for a merely-favorited event there.
      this.eventChatService.getUnreadCountsByEvents(eventIds, userId),
      this.galleryService.getUnreadCountsByEvents(eventIds, userId, 'public'),
      this.galleryService.getUnreadCountsByEvents(eventIds, userId, 'private'),
      this.eventChatService.getLatestMessagesByEvents(eventIds),
    ]);

    return events
      .map((event) => {
        const isCreator = createdEventIds.has(event.id!) || managedEventIds.has(event.id!);
        const relation: 'creator' | 'attendee' = isCreator ? 'creator' : 'attendee';
        const rating = ratingByEventId.get(event.id!);
        return {
          ...event,
          creatorName: creatorNameById.get(event.creatorId) ?? '',
          relation,
          attendeesCount: attendeesCountByEventId.get(event.id!) ?? 0,
          likesCount: likesCountByEventId.get(event.id!) ?? 0,
          reviewsCount: rating?.count ?? 0,
          averageRating: rating?.averageRating ?? 0,
          isAttending: true,
          unreadChatCount: unreadChatByEventId.get(event.id!),
          unreadGalleryCount: unreadGalleryByEventId.get(event.id!),
          unreadPrivateGalleryCount: unreadPrivateGalleryByEventId.get(event.id!),
          lastChatActivityAt: latestMessageByEventId.get(event.id!)?.createdAt,
        };
      })
      // A draft has no eventDateFrom yet - surfaced first (unfinished, so
      // the creator notices it) rather than crashing the comparator.
      .sort((a, b) => (b.eventDateFrom ?? Infinity) - (a.eventDateFrom ?? Infinity));
  }

  /**
   * Get everyone genuinely attending an event, hydrated with just enough
   * profile info to render an attendee list - same hydration pattern as
   * UserService.getFollowersDetailed/getFollowingDetailed. This is the real
   * attendee list (event-detail, gallery_photo_attending fan-out) - a plain
   * Favorite (like) no longer counts.
   */
  async getEventAttendeesDetailed(eventId: string): Promise<EventAttendeeDto[]> {
    const attendances = await this.attendanceRepository.findByEvent(eventId);
    const users = await this.userService.findByIds(attendances.map((a) => a.userId));
    const userById = new Map(users.map((user) => [user.id, user]));

    return attendances
      .map((attendance): EventAttendeeDto | null => {
        const user = userById.get(attendance.userId);
        if (!user) {
          return null;
        }
        return {
          id: user.id!,
          name: user.name,
          photoUrl: user.photoUrl,
          disciplineIds: user.disciplineIds,
          attendedAt: attendance.createdAt,
        };
      })
      .filter((item): item is EventAttendeeDto => item !== null);
  }

  /**
   * Raw passthrough - for other services (e.g. EventService's attendee
   * notification fan-out, EventReminderService) that need an event's real
   * attendees without depending on AttendanceRepository directly.
   */
  async findByEvent(eventId: string): Promise<AttendanceDto[]> {
    return await this.attendanceRepository.findByEvent(eventId);
  }

  /**
   * Raw passthrough - for EventChatService to resolve a reader's own
   * chatVisibleFrom cutoff without depending on AttendanceRepository
   * directly.
   */
  async findByUserAndEvent(userId: string, eventId: string): Promise<AttendanceDto | null> {
    return await this.attendanceRepository.findByUserAndEvent(userId, eventId);
  }

  /** Which of the given events this user genuinely attends (real Attendance
   * row - covers the creator, any accepted manager, and a plain attendee
   * alike, see AttendanceDocument's own doc comment) - events they merely
   * favorited without attending are simply absent from the result. Used to
   * scope card-level unread badges (see EventChatService/GalleryService's
   * own batched getUnreadCounts*ByEvents) to events the viewer is actually
   * part of. */
  async findByUserAndEvents(userId: string, eventIds: string[]): Promise<AttendanceDto[]> {
    return await this.attendanceRepository.findByUserAndEvents(userId, eventIds);
  }

  /** Called when a user opens (or re-enters) an event's xat - resets the
   * unread-chat-count badge from here on (see EventChatService.getUnreadCount). */
  async markChatRead(userId: string, eventId: string): Promise<void> {
    await this.attendanceRepository.updateLastReadChatAt(userId, eventId, Date.now());
  }

  /** Same as markChatRead, but for either gallery tab (see
   * GalleryService.getUnreadCount). */
  async markGalleryRead(userId: string, eventId: string, scope: 'public' | 'private'): Promise<void> {
    await this.attendanceRepository.updateLastReadGalleryAt(userId, eventId, Date.now(), scope);
  }

  /**
   * Check if user is genuinely attending an event - this is the gate
   * EventService.assertCanPostPhoto uses, not a plain Favorite/like.
   */
  async isAttending(userId: string, eventId: string): Promise<boolean> {
    const attendance = await this.attendanceRepository.findByUserAndEvent(userId, eventId);
    return attendance !== null;
  }

  /**
   * Mark a user as attending - a real RSVP with the actual consequences
   * (attendee list, count, gallery permission, organizer notification).
   * Unlike a plain like/heart, this has no "sin más implicaciones" - it's
   * the deliberate, consequential action.
   */
  async addAttendance(userId: string, eventId: string): Promise<AttendanceDto> {
    const existing = await this.attendanceRepository.findByUserAndEvent(userId, eventId);
    if (existing) {
      throw new BusinessRuleException(
        `User "${userId}" is already attending event "${eventId}"`,
        'errors.BUSINESS_ALREADY_ATTENDING',
        { userId, eventId },
      );
    }
    try {
      const created = await this.createAttendance({
        userId,
        eventId,
        createdAt: Date.now(),
      });
      const event = await this.eventService.findById(eventId);
      const attendee = await this.userService.findById(userId);
      if (event && attendee && event.creatorId !== userId) {
        await this.notificationService.notify(event.creatorId, 'event_attendee', {
          eventId,
          fromUserId: userId,
          name: attendee.name,
          eventTitle: event.title,
        });
      }
      return created;
    } catch (err) {
      if (err instanceof DuplicateKeyException) {
        throw new BusinessRuleException(
          `User "${userId}" is already attending event "${eventId}"`,
          'errors.BUSINESS_ALREADY_ATTENDING',
          { userId, eventId },
        );
      }
      throw err;
    }
  }

  async removeAttendance(userId: string, eventId: string): Promise<boolean> {
    const existing = await this.attendanceRepository.findByUserAndEvent(userId, eventId);
    if (!existing) {
      throw new ResourceNotFoundException(
        'Attendance',
        `user "${userId}" / event "${eventId}"`,
        'errors.ATTENDANCE_NOT_FOUND_BY_USER_EVENT',
        { userId, eventId },
      );
    }
    await this.attendanceRepository.deleteByUserAndEvent(userId, eventId);
    return true;
  }

  /**
   * Marks every instance of a recurring series as attended at once - the
   * events the user is already attending (e.g. the one they tapped "Asistiré"
   * on) are left alone, only the missing instances get a new Attendance row.
   * Notifies the organizer once for the whole series (mirrors EventService's
   * own notifyAboutRecurringSeries), not once per instance.
   */
  async addSeriesAttendance(userId: string, seriesId: string): Promise<void> {
    const events = await this.eventService.getEventsBySeriesId(seriesId);
    if (!events.length) {
      throw new ResourceNotFoundException('Event series', seriesId);
    }
    const existing = await this.attendanceRepository.findByUserAndEvents(
      userId,
      events.map((event) => event.id!),
    );
    const alreadyAttendingIds = new Set(existing.map((attendance) => attendance.eventId));
    const toCreate = events.filter((event) => !alreadyAttendingIds.has(event.id!));
    if (!toCreate.length) {
      return;
    }
    await Promise.all(
      toCreate.map((event) =>
        this.attendanceRepository.create({ userId, eventId: event.id!, createdAt: Date.now() }),
      ),
    );
    const first = events[0];
    if (first.creatorId === userId) {
      return;
    }
    const attendee = await this.userService.findById(userId);
    if (attendee) {
      await this.notificationService.notify(first.creatorId, 'event_attendee', {
        eventId: first.id!,
        fromUserId: userId,
        name: attendee.name,
        eventTitle: first.title,
      });
    }
  }

  /**
   * Un-marks every instance of a recurring series as attended at once.
   */
  async removeSeriesAttendance(userId: string, seriesId: string): Promise<void> {
    const events = await this.eventService.getEventsBySeriesId(seriesId);
    if (!events.length) {
      throw new ResourceNotFoundException('Event series', seriesId);
    }
    await this.attendanceRepository.deleteManyByUserAndEvents(
      userId,
      events.map((event) => event.id!),
    );
  }

  async countEventAttendance(eventId: string): Promise<number> {
    return await this.attendanceRepository.count({ eventId });
  }

  async countAttendanceByEvents(eventIds: string[]): Promise<Map<string, number>> {
    return await this.attendanceRepository.countManyByEvents(eventIds);
  }

  /**
   * Idempotent bulk-attend - creates an Attendance row for any of the given
   * events the user isn't already attending, skips the rest. Unlike
   * addAttendance/addSeriesAttendance (a user-initiated action that notifies
   * the organizer), this has no notification - it's the automatic side
   * effect of accepting a manager invite (any role) or of EventService.
   * createEvent's own auto-attendance for the creator. Used by
   * EventManagerService.respondToInvite.
   */
  /**
   * chatVisibleFrom (see AttendanceDocument's own doc comment) - passed
   * through untouched to every newly-created row: 0 for a 'full' history
   * invite, undefined (falls back to createdAt) for a 'fromJoin' one. Only
   * ever applies to the rows this call actually creates - an existing row
   * (already attending some other way) keeps whatever cutoff it already had,
   * see this module's own plan doc for why that's an accepted simplification.
   */
  async ensureAttendingMany(userId: string, eventIds: string[], chatVisibleFrom?: number): Promise<void> {
    if (!eventIds.length) {
      return;
    }
    const existing = await this.attendanceRepository.findByUserAndEvents(userId, eventIds);
    const alreadyAttendingIds = new Set(existing.map((attendance) => attendance.eventId));
    const toCreate = eventIds.filter((eventId) => !alreadyAttendingIds.has(eventId));
    if (!toCreate.length) {
      return;
    }
    await Promise.all(
      toCreate.map((eventId) =>
        this.attendanceRepository.create({ userId, eventId, chatVisibleFrom, createdAt: Date.now() }),
      ),
    );
  }

  /**
   * Idempotent bulk-un-attend (mirror of ensureAttendingMany above) - used
   * by EventManagerService.removeParticipant so an organizer forcing someone
   * off the attendee list strips their attendance across every instance of a
   * recurring series in one call, without erroring on instances they never
   * attended in the first place. Deliberately doesn't touch the person's own
   * Favorite/like rows - that's their personal preference, not something an
   * organizer removing them should be able to take away.
   */
  async removeAttendingMany(userId: string, eventIds: string[]): Promise<number> {
    if (!eventIds.length) {
      return 0;
    }
    return await this.attendanceRepository.deleteManyByUserAndEvents(userId, eventIds);
  }
}
