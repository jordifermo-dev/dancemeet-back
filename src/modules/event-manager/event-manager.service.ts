import { ModuleRef } from '@nestjs/core';
import { EventManagerRepository } from './event-manager.repository';
import { EventManagerDetailedDto } from './event-manager.dto';
import { ChatHistoryAccess, EventManagerRole } from './event-manager.schema';
import { BusinessRuleException, ResourceNotFoundException } from '../../common';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notification/notification.service';
import { EventService } from '../event/event.service';
import { FavoriteService } from '../favorite/favorite.service';
import { AttendanceService } from '../attendance/attendance.service';

export class EventManagerService {
  constructor(
    private readonly eventManagerRepository: EventManagerRepository,
    private readonly moduleRef: ModuleRef,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
  ) {}

  /** See UserService.followersService for why this is resolved lazily via
   * ModuleRef instead of constructor-injected: EventService.assertCanManage
   * needs isAcceptedManager() below, so this pair is circular. */
  private get eventService(): EventService {
    return this.moduleRef.get(EventService, { strict: false });
  }

  /** Same reasoning as eventService above - circular with FavoriteModule
   * (respondToInvite() below auto-favorites on accept, FavoriteService's own
   * getFavoritedEventsDetailed calls getAcceptedEventIdsForUser). */
  private get favoriteService(): FavoriteService {
    return this.moduleRef.get(FavoriteService, { strict: false });
  }

  /** Same reasoning as favoriteService above - circular with
   * AttendanceModule (respondToInvite() below grants real attendance on
   * accept, AttendanceService's own getAttendedEventsDetailed calls
   * getAcceptedEventIdsForUser). */
  private get attendanceService(): AttendanceService {
    return this.moduleRef.get(AttendanceService, { strict: false });
  }

  /**
   * Invites a user to participate in an event, either as a plain attendee
   * (accepting just favorites them, same as tapping the heart themselves -
   * e.g. a teacher inviting last term's students to a new course event) or
   * as a manager/organizer (accepting also grants edit/delete/invite-others
   * rights). Only someone who can already manage the event (creator or
   * accepted manager) may invite, for either role. If the event is part of a
   * recurring series, the invite (and later acceptance) applies to every
   * instance at once, same reasoning as FavoriteService.addSeriesToFavorites.
   *
   * Inviting someone who already has a row for this event as 'attendee' up
   * to 'manager' *upgrades* that row (fresh pending invite they must accept
   * for the extra rights) instead of bouncing off the unique index - a
   * teacher very plausibly wants to promote an already-invited attendee to
   * co-organizer. Inviting an existing 'manager' row again (any status)
   * still errors - there's nothing to upgrade to.
   */
  async inviteParticipant(
    eventId: string,
    invitedUserId: string,
    invitedByUserId: string,
    role: EventManagerRole,
    chatHistoryAccess: ChatHistoryAccess,
  ): Promise<void> {
    const event = await this.eventService.assertCanManage(eventId, invitedByUserId);

    const invitedUser = await this.userService.findById(invitedUserId);
    if (!invitedUser) {
      throw new ResourceNotFoundException('User', invitedUserId);
    }

    if (invitedUserId === event.creatorId) {
      throw new BusinessRuleException(
        `User "${invitedUserId}" already fully manages this event as its creator`,
        'errors.BUSINESS_ALREADY_MANAGER',
        { userId: invitedUserId },
      );
    }

    const eventIds = await this.resolveSeriesEventIds(event.seriesId, eventId);
    const existing = await this.eventManagerRepository.findByEventsAndUser(eventIds, invitedUserId);
    const isUpgradeToManager = existing.length > 0 && role === 'manager' && existing.every((row) => row.role === 'attendee');
    if (existing.length && !isUpgradeToManager) {
      throw new BusinessRuleException(
        `User "${invitedUserId}" already has an invite for this event`,
        'errors.BUSINESS_ALREADY_MANAGER',
        { userId: invitedUserId },
      );
    }

    if (isUpgradeToManager) {
      await this.eventManagerRepository.upsertAsPending(eventIds, invitedUserId, invitedByUserId, role, chatHistoryAccess);
    } else if (eventIds.length > 1) {
      await this.eventManagerRepository.createMany(eventIds, invitedUserId, invitedByUserId, role, chatHistoryAccess);
    } else {
      await this.eventManagerRepository.create({
        eventId,
        userId: invitedUserId,
        invitedByUserId,
        role,
        chatHistoryAccess,
      });
    }

    const inviter = await this.userService.findById(invitedByUserId);
    await this.notificationService.notify(
      invitedUserId,
      role === 'manager' ? 'event_manager_invite' : 'event_attendee_invite',
      {
        eventId,
        eventTitle: event.title,
        name: inviter?.name ?? '',
      },
    );
  }

  /**
   * Accepts or declines a pending invite - declining deletes the row(s),
   * accepting flips them to 'accepted' and, same as EventService.createEvent
   * does for the creator, grants every affected event's real attendance
   * (counted in the attendee list/count, gallery permission - see
   * AttendanceService.ensureAttendingMany) *and* likes it (heart filled -
   * see FavoriteService.ensureFavoritedMany), regardless of role - a
   * confirmed participant is unambiguously both. A manager-role acceptance
   * additionally shows as "Organizas" instead of "Asistes" on
   * Favorites/Mis-eventos (see AttendanceService.getAttendedEventsDetailed).
   * Applies across the whole series when the event has one, mirroring
   * inviteParticipant()'s series-wide grant.
   */
  async respondToInvite(eventId: string, userId: string, accept: boolean): Promise<void> {
    const event = await this.eventService.findById(eventId);
    if (!event) {
      throw new ResourceNotFoundException('Event', eventId);
    }
    const eventIds = await this.resolveSeriesEventIds(event.seriesId, eventId);
    const pending = await this.eventManagerRepository.findByEventsAndUser(eventIds, userId);
    if (!pending.length) {
      throw new ResourceNotFoundException('EventManagerInvite', `event "${eventId}" / user "${userId}"`);
    }
    await this.applyResponse(eventIds, userId, accept, pending[0].chatHistoryAccess);
  }

  /** Shared accept/decline mechanics behind respondToInvite (the invitee
   * responding to their own invite) and approveJoinRequest/declineJoinRequest
   * (an organizer responding to someone else's self-requested join, see
   * requestToJoin) - declining deletes the row(s), accepting flips them to
   * 'accepted' and grants real attendance + favorite, identically either way. */
  private async applyResponse(eventIds: string[], userId: string, accept: boolean, chatHistoryAccess: ChatHistoryAccess): Promise<void> {
    if (accept) {
      await this.eventManagerRepository.updateStatusManyByEventsAndUser(eventIds, userId, 'accepted');
      // Same choice on every instance of a series - one invite covers all
      // of them, see inviteParticipant's own series handling.
      const chatVisibleFrom = chatHistoryAccess === 'full' ? 0 : undefined;
      await Promise.all([
        this.attendanceService.ensureAttendingMany(userId, eventIds, chatVisibleFrom),
        this.favoriteService.ensureFavoritedMany(userId, eventIds),
      ]);
    } else {
      await this.eventManagerRepository.deleteManyByEventsAndUser(eventIds, userId);
    }
  }

  /**
   * Self-serve counterpart of inviteParticipant - lets a non-participant ask
   * to join an event whose organizer requires approval (event.joinMode ===
   * 'approval'; for 'open' events, AttendanceService.addAttendance's plain
   * self-attend is the right call instead - see event-detail.page.ts's
   * joinMode branch). Creates a pending 'attendee'-role row exactly like an
   * invite, except invitedByUserId is the requester's own id instead of an
   * organizer's (see EventManagerDetailedDto's own doc comment) - that's the
   * only signal the "Asistentes" screen uses to tell a self-request apart
   * from an organizer-sent invite. Grants no attendance/private-area access
   * until approveJoinRequest actually accepts it, same as any other pending
   * row (see EventService.assertCanAccessPrivateArea).
   */
  async requestToJoin(eventId: string, requestingUserId: string): Promise<void> {
    const event = await this.eventService.findById(eventId);
    if (!event) {
      throw new ResourceNotFoundException('Event', eventId);
    }
    if (event.joinMode !== 'approval') {
      throw new BusinessRuleException(
        `Event "${eventId}" doesn't require approval to join`,
        'errors.BUSINESS_EVENT_NOT_APPROVAL_MODE',
        { eventId },
      );
    }
    if (requestingUserId === event.creatorId) {
      throw new BusinessRuleException(
        `User "${requestingUserId}" already fully manages this event as its creator`,
        'errors.BUSINESS_ALREADY_MANAGER',
        { userId: requestingUserId },
      );
    }
    const eventIds = await this.resolveSeriesEventIds(event.seriesId, eventId);
    const existing = await this.eventManagerRepository.findByEventsAndUser(eventIds, requestingUserId);
    if (existing.length) {
      throw new BusinessRuleException(
        `User "${requestingUserId}" already has an invite or request for this event`,
        'errors.BUSINESS_ALREADY_MANAGER',
        { userId: requestingUserId },
      );
    }
    if (await this.attendanceService.isAttending(requestingUserId, eventId)) {
      throw new BusinessRuleException(
        `User "${requestingUserId}" already attends event "${eventId}"`,
        'errors.BUSINESS_ALREADY_ATTENDING',
        { userId: requestingUserId, eventId },
      );
    }
    if (eventIds.length > 1) {
      await this.eventManagerRepository.createMany(eventIds, requestingUserId, requestingUserId, 'attendee', 'fromJoin');
    } else {
      await this.eventManagerRepository.create({
        eventId,
        userId: requestingUserId,
        invitedByUserId: requestingUserId,
        role: 'attendee',
        chatHistoryAccess: 'fromJoin',
      });
    }
    const requester = await this.userService.findById(requestingUserId);
    const notifiableIds = await this.getNotifiableManagerIds(eventId, event.creatorId);
    await this.notificationService.notifyMany(notifiableIds, 'event_join_request', {
      eventId,
      eventTitle: event.title,
      name: requester?.name ?? '',
    });
  }

  /** The creator plus every accepted manager - who a new join request
   * notifies, same audience allowed to approve/decline it (assertCanManage). */
  private async getNotifiableManagerIds(eventId: string, creatorId: string): Promise<string[]> {
    const rows = await this.eventManagerRepository.findByEvent(eventId);
    const managerIds = rows.filter((row) => row.role === 'manager' && row.status === 'accepted').map((row) => row.userId);
    return [...new Set([creatorId, ...managerIds])];
  }

  /**
   * Organizer-side accept for a self-requested join (see requestToJoin) -
   * same permission level as inviting (assertCanManage: creator or any
   * accepted manager), reuses applyResponse's accept branch. Errors the same
   * way respondToInvite does if there's nothing pending for this requester.
   */
  async approveJoinRequest(eventId: string, requesterId: string, approvingUserId: string): Promise<void> {
    const event = await this.eventService.assertCanManage(eventId, approvingUserId);
    const eventIds = await this.resolveSeriesEventIds(event.seriesId, eventId);
    const pending = await this.eventManagerRepository.findByEventsAndUser(eventIds, requesterId);
    if (!pending.length) {
      throw new ResourceNotFoundException('EventManagerInvite', `event "${eventId}" / user "${requesterId}"`);
    }
    await this.applyResponse(eventIds, requesterId, true, pending[0].chatHistoryAccess);
    const approver = await this.userService.findById(approvingUserId);
    await this.notificationService.notify(requesterId, 'event_join_approved', {
      eventId,
      eventTitle: event.title,
      name: approver?.name ?? '',
    });
  }

  /** Organizer-side decline for a self-requested join - same permission as
   * approveJoinRequest, silently deletes the row(s) (no notification), same
   * as declining an invite today. */
  async declineJoinRequest(eventId: string, requesterId: string, decliningUserId: string): Promise<void> {
    const event = await this.eventService.assertCanManage(eventId, decliningUserId);
    const eventIds = await this.resolveSeriesEventIds(event.seriesId, eventId);
    const pending = await this.eventManagerRepository.findByEventsAndUser(eventIds, requesterId);
    if (!pending.length) {
      throw new ResourceNotFoundException('EventManagerInvite', `event "${eventId}" / user "${requesterId}"`);
    }
    await this.applyResponse(eventIds, requesterId, false, pending[0].chatHistoryAccess);
  }

  /**
   * Fully removes someone from the event's attendee list, from the
   * organizer's side - whether they're a plain attendee (self-marked, no
   * EventManager row at all) or a pending/accepted manager. Strips both any
   * EventManager row (role/invite) and the Attendance row(s) (so they stop
   * counting as attending), across every instance of a recurring series.
   * Deliberately leaves their Favorite/like rows alone - whether they still
   * "like" this event is their own preference, not something an organizer
   * removing them should be able to take away. Also unrelated to any Follow
   * relationship between the organizer and this person. Only someone who can
   * already manage the event may do this, and the creator can't be removed
   * (their rights are implicit via event.creatorId, not a row here).
   */
  async removeParticipant(eventId: string, requestingUserId: string, targetUserId: string): Promise<void> {
    const event = await this.eventService.assertCanManage(eventId, requestingUserId);
    if (targetUserId === event.creatorId) {
      throw new BusinessRuleException(
        `The creator of event "${eventId}" cannot be removed`,
        'errors.CANNOT_REMOVE_CREATOR',
        { eventId },
      );
    }
    const eventIds = await this.resolveSeriesEventIds(event.seriesId, eventId);
    const removedManagerCount = await this.eventManagerRepository.deleteManyByEventsAndUser(eventIds, targetUserId);
    const removedAttendanceCount = await this.attendanceService.removeAttendingMany(targetUserId, eventIds);
    if (!removedManagerCount && !removedAttendanceCount) {
      throw new ResourceNotFoundException('EventParticipant', `event "${eventId}" / user "${targetUserId}"`);
    }
  }

  /**
   * Hydrated list (pending + accepted, both roles) for the "Asistentes"
   * screen's organizer-only sections (pending invites list, "Organizador/
   * Administrador" badge cross-referencing).
   */
  async getParticipantsDetailed(eventId: string): Promise<EventManagerDetailedDto[]> {
    const rows = await this.eventManagerRepository.findByEvent(eventId);
    if (!rows.length) {
      return [];
    }
    const users = await this.userService.findByIds(rows.map((row) => row.userId));
    const userById = new Map(users.map((user) => [user.id, user]));
    return rows
      .map((row): EventManagerDetailedDto | null => {
        const user = userById.get(row.userId);
        if (!user) {
          return null;
        }
        return {
          id: row.id!,
          eventId: row.eventId,
          userId: row.userId,
          userName: user.name,
          userPhotoUrl: user.photoUrl,
          userEmail: user.email,
          userShowEmail: user.showEmail,
          userDisciplineIds: user.disciplineIds,
          role: row.role,
          status: row.status,
          invitedByUserId: row.invitedByUserId,
          createdAt: row.createdAt,
        };
      })
      .filter((item): item is EventManagerDetailedDto => item !== null);
  }

  /**
   * Raw passthrough - used by EventService.assertCanManage without depending
   * on EventManagerRepository directly. Only an accepted 'manager'-role row
   * counts - an accepted attendee-role invite grants no management rights.
   */
  async isAcceptedManager(eventId: string, userId: string): Promise<boolean> {
    const row = await this.eventManagerRepository.findByEventAndUser(eventId, userId, 'manager');
    return row?.status === 'accepted';
  }

  /**
   * Raw passthrough - used by FavoriteService.getFavoritedEventsDetailed to
   * treat an accepted manager the same as the creator, without depending on
   * EventManagerRepository directly. Only 'manager'-role rows, same
   * reasoning as isAcceptedManager above.
   */
  async getAcceptedEventIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.eventManagerRepository.findAcceptedByUser(userId, 'manager');
    return rows.map((row) => row.eventId);
  }

  private async resolveSeriesEventIds(seriesId: string | undefined, eventId: string): Promise<string[]> {
    if (!seriesId) {
      return [eventId];
    }
    const events = await this.eventService.getEventsBySeriesId(seriesId);
    return events.map((event) => event.id!);
  }
}
