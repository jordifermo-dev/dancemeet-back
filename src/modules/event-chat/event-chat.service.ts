import { EventChatRepository } from './event-chat.repository';
import { EventMessageDto, EventMessageWithSenderDto, GroupedReactionDto } from './event-chat.dto';
import { ForbiddenActionException, ResourceNotFoundException } from '../../common';
import { UserService } from '../user/user.service';
import { EventService } from '../event/event.service';
import { AttendanceService } from '../attendance/attendance.service';
import { NotificationService } from '../notification/notification.service';
import { GalleryService } from '../gallery/gallery.service';

const MESSAGE_PREVIEW_LENGTH = 80;

export class EventChatService {
  constructor(
    private readonly repository: EventChatRepository,
    private readonly userService: UserService,
    private readonly eventService: EventService,
    private readonly attendanceService: AttendanceService,
    private readonly notificationService: NotificationService,
    private readonly galleryService: GalleryService,
  ) {}

  /**
   * Resolves how far back requestingUserId is allowed to see - the creator/
   * manager/attendee check (assertCanAccessPrivateArea) already guarantees
   * they have an Attendance row (every path into the private area grants
   * one, see EventService.createEvent/EventManagerService.respondToInvite/
   * AttendanceService.addAttendance), so falling back to 0 below is just
   * defensive, not an expected case.
   */
  private async resolveVisibleFrom(eventId: string, userId: string): Promise<number> {
    const attendance = await this.attendanceService.findByUserAndEvent(userId, eventId);
    return attendance?.chatVisibleFrom ?? attendance?.createdAt ?? 0;
  }

  async getMessagesDetailed(eventId: string, requestingUserId: string, before?: number): Promise<EventMessageWithSenderDto[]> {
    await this.eventService.assertCanAccessPrivateArea(eventId, requestingUserId);
    const since = await this.resolveVisibleFrom(eventId, requestingUserId);
    const messages = await this.repository.findByEvent(eventId, since, before);
    return this.hydrate(messages, requestingUserId);
  }

  /** Only ever called from EventChatGateway's send-message handler - there's
   * no REST write route for the xat (see EventChatController's own doc
   * comment), a message can only be sent while genuinely connected. */
  async sendMessage(
    eventId: string,
    senderId: string,
    text: string,
    replyToMessageId?: string,
    attachedPhotoId?: string,
  ): Promise<EventMessageWithSenderDto> {
    const event = await this.eventService.assertCanAccessPrivateArea(eventId, senderId);

    // A mention only ever references a photo that already exists in this
    // event's own gallery (public or private) - never an upload. Reusing
    // getPhotoDetailed also re-confirms the sender can actually see it
    // (redundant with the assertCanAccessPrivateArea above for a private-
    // only photo, but cheap and keeps this one gate as the single source of
    // truth for "can this user see this photo" rather than duplicating it).
    let attachedPhotoUrl: string | undefined;
    if (attachedPhotoId) {
      const photo = await this.galleryService.getPhotoDetailed(eventId, attachedPhotoId, senderId);
      attachedPhotoUrl = photo.photoUrl;
    }

    const created = await this.repository.create({
      eventId,
      senderId,
      text,
      ...(replyToMessageId ? { replyToMessageId } : {}),
      ...(attachedPhotoId ? { attachedPhotoId, attachedPhotoUrl } : {}),
    });

    const sender = await this.userService.findById(senderId);
    const attendees = await this.attendanceService.getEventAttendeesDetailed(eventId);
    const recipientIds = attendees.map((attendee) => attendee.id).filter((id) => id !== senderId);
    const preview = text.length > MESSAGE_PREVIEW_LENGTH ? `${text.slice(0, MESSAGE_PREVIEW_LENGTH)}…` : text;
    await this.notificationService.notifyMany(recipientIds, 'event_chat_message', {
      eventId,
      eventTitle: event.title,
      name: sender?.name ?? '',
      message: preview,
    });

    const [hydrated] = await this.hydrate([created], senderId);
    return hydrated;
  }

  /** Only the message's own author can edit it (see EventDetail plan's own
   * "Fase 3" decision - no organizer moderation in this phase). */
  async editMessage(eventId: string, messageId: string, userId: string, text: string): Promise<EventMessageWithSenderDto> {
    await this.eventService.assertCanAccessPrivateArea(eventId, userId);
    const message = await this.repository.findById(messageId);
    if (!message || message.eventId !== eventId) {
      throw new ResourceNotFoundException('EventMessage', messageId);
    }
    if (message.senderId !== userId) {
      throw new ForbiddenActionException(
        `User "${userId}" is not allowed to edit message "${messageId}"`,
        'errors.FORBIDDEN_EDIT_MESSAGE',
      );
    }
    if (message.deletedAt) {
      throw new ForbiddenActionException(
        `Message "${messageId}" has been deleted and can no longer be edited`,
        'errors.FORBIDDEN_EDIT_MESSAGE',
      );
    }
    const updated = await this.repository.update(messageId, { text, editedAt: Date.now() });
    const [hydrated] = await this.hydrate([updated!], userId);
    return hydrated;
  }

  /** Soft delete - text is blanked and `deleted:true` surfaced to every
   * reader from here on (see hydrate), the row itself is kept so any reply
   * quoting it still has something to show. */
  async deleteMessage(eventId: string, messageId: string, userId: string): Promise<EventMessageWithSenderDto> {
    await this.eventService.assertCanAccessPrivateArea(eventId, userId);
    const message = await this.repository.findById(messageId);
    if (!message || message.eventId !== eventId) {
      throw new ResourceNotFoundException('EventMessage', messageId);
    }
    if (message.senderId !== userId) {
      throw new ForbiddenActionException(
        `User "${userId}" is not allowed to delete message "${messageId}"`,
        'errors.FORBIDDEN_DELETE_MESSAGE',
      );
    }
    const updated = await this.repository.update(messageId, { deletedAt: Date.now() });
    const [hydrated] = await this.hydrate([updated!], userId);
    return hydrated;
  }

  async markChatRead(eventId: string, userId: string): Promise<void> {
    await this.eventService.assertCanAccessPrivateArea(eventId, userId);
    await this.attendanceService.markChatRead(userId, eventId);
  }

  async getUnreadCount(eventId: string, userId: string): Promise<number> {
    await this.eventService.assertCanAccessPrivateArea(eventId, userId);
    const [visibleFrom, attendance] = await Promise.all([
      this.resolveVisibleFrom(eventId, userId),
      this.attendanceService.findByUserAndEvent(userId, eventId),
    ]);
    const since = Math.max(visibleFrom, attendance?.lastReadChatAt ?? 0);
    return this.repository.countUnread(eventId, since, userId);
  }

  /** Batched getUnreadCount, for event-card badges (see FavoriteService) -
   * no assertCanAccessPrivateArea per event (would defeat the point of
   * batching); scoped naturally instead, since only events with a real
   * Attendance row get a threshold at all, so a merely-favorited/non-attended
   * event just never appears in the result. */
  async getUnreadCountsByEvents(eventIds: string[], userId: string): Promise<Map<string, number>> {
    if (!eventIds.length) {
      return new Map();
    }
    const attendances = await this.attendanceService.findByUserAndEvents(userId, eventIds);
    const thresholdByEventId = new Map(
      attendances.map((attendance) => [
        attendance.eventId,
        Math.max(attendance.chatVisibleFrom ?? attendance.createdAt, attendance.lastReadChatAt ?? 0),
      ]),
    );
    return this.repository.countUnreadManyByEvents(thresholdByEventId, userId);
  }

  /** Batched "most recent message per event" - no assertCanAccessPrivateArea
   * per event, same reasoning as getUnreadCountsByEvents above (this is only
   * ever called with an eventIds list the caller already scoped to events
   * the viewer can access). Used to order the Chats tab by recency. */
  async getLatestMessagesByEvents(eventIds: string[]): Promise<Map<string, { createdAt: number; senderId: string; text: string }>> {
    return this.repository.findLatestMessageByEvents(eventIds);
  }

  async reactToMessage(eventId: string, messageId: string, userId: string, emoji: string): Promise<GroupedReactionDto[]> {
    await this.eventService.assertCanAccessPrivateArea(eventId, userId);
    const updated = await this.repository.addReaction(messageId, emoji, userId);
    if (!updated || updated.eventId !== eventId) {
      throw new ResourceNotFoundException('EventMessage', messageId);
    }
    return this.groupReactions(updated.reactions, userId);
  }

  async removeReaction(eventId: string, messageId: string, userId: string, emoji: string): Promise<GroupedReactionDto[]> {
    await this.eventService.assertCanAccessPrivateArea(eventId, userId);
    const updated = await this.repository.removeReaction(messageId, emoji, userId);
    if (!updated || updated.eventId !== eventId) {
      throw new ResourceNotFoundException('EventMessage', messageId);
    }
    return this.groupReactions(updated.reactions, userId);
  }

  private async hydrate(messages: EventMessageDto[], requestingUserId: string): Promise<EventMessageWithSenderDto[]> {
    if (!messages.length) {
      return [];
    }
    const replyToIds = [...new Set(messages.map((message) => message.replyToMessageId).filter((id): id is string => !!id))];
    const [senders, replyTargets] = await Promise.all([
      this.userService.findByIds([...new Set(messages.map((message) => message.senderId))]),
      replyToIds.length ? this.repository.findByIds(replyToIds) : Promise.resolve<EventMessageDto[]>([]),
    ]);
    const senderById = new Map(senders.map((sender) => [sender.id, sender]));
    // Reply targets need their own senders resolved too (a quote shows the
    // original author's name) - a second, smaller sender lookup rather than
    // widening the first one, since most messages have no reply at all.
    const replyTargetSenders = replyTargets.length
      ? await this.userService.findByIds([...new Set(replyTargets.map((m) => m.senderId))])
      : [];
    const replyTargetSenderById = new Map(replyTargetSenders.map((sender) => [sender.id, sender]));
    const replyById = new Map(replyTargets.map((target) => [target.id!, target]));

    return messages
      .map((message): EventMessageWithSenderDto | null => {
        const sender = senderById.get(message.senderId);
        if (!sender) {
          return null;
        }
        const deleted = !!message.deletedAt;
        const replyTarget = message.replyToMessageId ? replyById.get(message.replyToMessageId) : undefined;
        const replyTo = replyTarget
          ? {
              id: replyTarget.id!,
              senderName: replyTargetSenderById.get(replyTarget.senderId)?.name ?? '',
              text: replyTarget.deletedAt ? '' : replyTarget.text,
              deleted: !!replyTarget.deletedAt,
            }
          : null;
        const attachedPhoto =
          !deleted && message.attachedPhotoId && message.attachedPhotoUrl
            ? { galleryPhotoId: message.attachedPhotoId, photoUrl: message.attachedPhotoUrl }
            : null;
        return {
          id: message.id!,
          eventId: message.eventId,
          senderId: message.senderId,
          senderName: sender.name,
          senderPhotoUrl: sender.photoUrl,
          text: deleted ? '' : message.text,
          reactions: deleted ? [] : this.groupReactions(message.reactions, requestingUserId),
          createdAt: message.createdAt,
          editedAt: message.editedAt,
          deleted,
          replyTo,
          attachedPhoto,
        };
      })
      .filter((item): item is EventMessageWithSenderDto => item !== null);
  }

  private groupReactions(reactions: { emoji: string; userId: string }[], requestingUserId: string): GroupedReactionDto[] {
    const byEmoji = new Map<string, string[]>();
    for (const reaction of reactions) {
      const userIds = byEmoji.get(reaction.emoji) ?? [];
      userIds.push(reaction.userId);
      byEmoji.set(reaction.emoji, userIds);
    }
    return [...byEmoji.entries()].map(([emoji, userIds]) => ({
      emoji,
      count: userIds.length,
      reactedByMe: userIds.includes(requestingUserId),
    }));
  }
}
