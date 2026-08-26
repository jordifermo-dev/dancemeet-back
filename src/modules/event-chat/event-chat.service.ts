import { EventChatRepository } from './event-chat.repository';
import { EventMessageDto, EventMessageWithSenderDto, GroupedReactionDto } from './event-chat.dto';
import { ResourceNotFoundException } from '../../common';
import { UserService } from '../user/user.service';
import { EventService } from '../event/event.service';
import { AttendanceService } from '../attendance/attendance.service';
import { NotificationService } from '../notification/notification.service';

const MESSAGE_PREVIEW_LENGTH = 80;

export class EventChatService {
  constructor(
    private readonly repository: EventChatRepository,
    private readonly userService: UserService,
    private readonly eventService: EventService,
    private readonly attendanceService: AttendanceService,
    private readonly notificationService: NotificationService,
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
  async sendMessage(eventId: string, senderId: string, text: string): Promise<EventMessageWithSenderDto> {
    const event = await this.eventService.assertCanAccessPrivateArea(eventId, senderId);
    const created = await this.repository.create({ eventId, senderId, text });

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
    const senders = await this.userService.findByIds([...new Set(messages.map((message) => message.senderId))]);
    const senderById = new Map(senders.map((sender) => [sender.id, sender]));
    return messages
      .map((message): EventMessageWithSenderDto | null => {
        const sender = senderById.get(message.senderId);
        if (!sender) {
          return null;
        }
        return {
          id: message.id!,
          eventId: message.eventId,
          senderId: message.senderId,
          senderName: sender.name,
          senderPhotoUrl: sender.photoUrl,
          text: message.text,
          reactions: this.groupReactions(message.reactions, requestingUserId),
          createdAt: message.createdAt,
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
