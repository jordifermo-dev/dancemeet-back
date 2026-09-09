import { ConversationRepository } from './conversation.repository';
import { DirectMessageRepository } from './direct-message.repository';
import {
  ConversationDetailedDto,
  DirectMessageDto,
  DirectMessageQuoteDto,
  DirectMessageWithSenderDto,
} from './direct-message.dto';
import { GroupedReactionDto } from '../event-chat/event-chat.dto';
import { ForbiddenActionException, ResourceNotFoundException, BusinessRuleException } from '../../common';
import { UserService } from '../user/user.service';
import { FollowersService } from '../followers/followers.service';
import { NotificationService } from '../notification/notification.service';

const MESSAGE_PREVIEW_LENGTH = 80;

/** Owns both the Conversation (the 1:1 thread + its permission state) and
 * its DirectMessages - kept as one service (unlike event-chat, split across
 * EventService/EventChatService because an event exists independently of
 * its xat) since a Conversation has no reason to exist without messages. */
export class ConversationService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly directMessageRepository: DirectMessageRepository,
    private readonly userService: UserService,
    private readonly followersService: FollowersService,
    private readonly notificationService: NotificationService,
  ) {}

  private assertParticipant(participantIds: string[], userId: string): void {
    if (!participantIds.includes(userId)) {
      throw new ForbiddenActionException(
        `User "${userId}" is not a participant of this conversation`,
        'errors.FORBIDDEN_CONVERSATION_ACCESS',
      );
    }
  }

  /** Public guard for DirectMessageGateway's join-conversation handler - same
   * role as EventService.assertCanAccessPrivateArea for EventChatGateway's
   * join-event. */
  async assertCanAccess(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new ResourceNotFoundException('Conversation', conversationId);
    }
    this.assertParticipant(conversation.participantIds, userId);
  }

  /** The single entry point for "start (or resume) a DM with this person" -
   * POST /api/conversations. Reuses the existing pair if one already exists
   * (in either direction/state) instead of ever creating a second one - see
   * ConversationDocument's own doc comment on the unique pair index. */
  async getOrCreateConversation(userId: string, peerId: string): Promise<ConversationDetailedDto> {
    if (userId === peerId) {
      throw new BusinessRuleException(
        'A user cannot start a conversation with themselves',
        'errors.BUSINESS_CANNOT_MESSAGE_SELF',
      );
    }
    const existing = await this.conversationRepository.findByPair(userId, peerId);
    if (existing) {
      return this.hydrateOne(existing, userId);
    }
    const hasRelationship = await this.followersService.hasAnyRelationship(userId, peerId);
    const created = await this.conversationRepository.create({
      participantIds: [userId, peerId],
      status: hasRelationship ? 'accepted' : 'pending',
      requestedBy: userId,
    });
    return this.hydrateOne(created, userId);
  }

  async getConversation(conversationId: string, userId: string): Promise<ConversationDetailedDto> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new ResourceNotFoundException('Conversation', conversationId);
    }
    this.assertParticipant(conversation.participantIds, userId);
    return this.hydrateOne(conversation, userId);
  }

  async listConversationsForUser(userId: string): Promise<ConversationDetailedDto[]> {
    const conversations = await this.conversationRepository.findByUser(userId);
    if (!conversations.length) {
      return [];
    }
    return Promise.all(conversations.map((conversation) => this.hydrateOne(conversation, userId)));
  }

  private async hydrateOne(conversation: { id?: string; participantIds: string[]; status: 'accepted' | 'pending'; requestedBy: string; createdAt: number; lastMessageAt?: number; lastReadAt: Record<string, number> }, viewerId: string): Promise<ConversationDetailedDto> {
    const peerId = conversation.participantIds.find((id) => id !== viewerId) ?? conversation.participantIds[0];
    const [peer, latestByConversationId, unreadByConversationId] = await Promise.all([
      this.userService.findById(peerId),
      this.directMessageRepository.findLatestMessageByConversations([conversation.id!]),
      this.directMessageRepository.countUnreadManyByConversations(
        new Map([[conversation.id!, conversation.lastReadAt[viewerId] ?? 0]]),
        viewerId,
      ),
    ]);
    const latest = latestByConversationId.get(conversation.id!);
    return {
      id: conversation.id!,
      status: conversation.status,
      requestedBy: conversation.requestedBy,
      createdAt: conversation.createdAt,
      lastMessageAt: conversation.lastMessageAt,
      peerId,
      peerName: peer?.name ?? '',
      peerPhotoUrl: peer?.photoUrl,
      lastMessagePreview: latest?.text,
      unreadCount: unreadByConversationId.get(conversation.id!) ?? 0,
    };
  }

  /** Only ever called from DirectMessageGateway's send-message handler - no
   * REST write route, same reasoning as EventChatController. */
  async sendMessage(conversationId: string, senderId: string, text: string, replyToMessageId?: string): Promise<DirectMessageWithSenderDto> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new ResourceNotFoundException('Conversation', conversationId);
    }
    this.assertParticipant(conversation.participantIds, senderId);

    // A message request is implicitly accepted the moment its recipient
    // replies - same idea as tapping "Aceptar" explicitly, just one action
    // instead of two.
    if (conversation.status === 'pending' && conversation.requestedBy !== senderId) {
      await this.conversationRepository.updateStatus(conversationId, 'accepted');
    }

    const created = await this.directMessageRepository.create({
      conversationId,
      senderId,
      text,
      ...(replyToMessageId ? { replyToMessageId } : {}),
    });
    await this.conversationRepository.updateLastMessageAt(conversationId, created.createdAt);

    const sender = await this.userService.findById(senderId);
    const recipientId = conversation.participantIds.find((id) => id !== senderId);
    if (recipientId) {
      const preview = text.length > MESSAGE_PREVIEW_LENGTH ? `${text.slice(0, MESSAGE_PREVIEW_LENGTH)}…` : text;
      await this.notificationService.notify(recipientId, 'direct_message', {
        conversationId,
        fromUserId: senderId,
        name: sender?.name ?? '',
        message: preview,
      });
    }

    const [hydrated] = await this.hydrateMessages([created], senderId);
    return hydrated;
  }

  async getMessagesDetailed(conversationId: string, requestingUserId: string, before?: number): Promise<DirectMessageWithSenderDto[]> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new ResourceNotFoundException('Conversation', conversationId);
    }
    this.assertParticipant(conversation.participantIds, requestingUserId);
    const messages = await this.directMessageRepository.findByConversation(conversationId, before);
    return this.hydrateMessages(messages, requestingUserId);
  }

  async editMessage(conversationId: string, messageId: string, userId: string, text: string): Promise<DirectMessageWithSenderDto> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new ResourceNotFoundException('Conversation', conversationId);
    }
    this.assertParticipant(conversation.participantIds, userId);
    const message = await this.directMessageRepository.findById(messageId);
    if (!message || message.conversationId !== conversationId) {
      throw new ResourceNotFoundException('DirectMessage', messageId);
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
    const updated = await this.directMessageRepository.update(messageId, { text, editedAt: Date.now() });
    const [hydrated] = await this.hydrateMessages([updated!], userId);
    return hydrated;
  }

  async deleteMessage(conversationId: string, messageId: string, userId: string): Promise<DirectMessageWithSenderDto> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new ResourceNotFoundException('Conversation', conversationId);
    }
    this.assertParticipant(conversation.participantIds, userId);
    const message = await this.directMessageRepository.findById(messageId);
    if (!message || message.conversationId !== conversationId) {
      throw new ResourceNotFoundException('DirectMessage', messageId);
    }
    if (message.senderId !== userId) {
      throw new ForbiddenActionException(
        `User "${userId}" is not allowed to delete message "${messageId}"`,
        'errors.FORBIDDEN_DELETE_MESSAGE',
      );
    }
    const updated = await this.directMessageRepository.update(messageId, { deletedAt: Date.now() });
    const [hydrated] = await this.hydrateMessages([updated!], userId);
    return hydrated;
  }

  async reactToMessage(conversationId: string, messageId: string, userId: string, emoji: string): Promise<GroupedReactionDto[]> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new ResourceNotFoundException('Conversation', conversationId);
    }
    this.assertParticipant(conversation.participantIds, userId);
    const updated = await this.directMessageRepository.addReaction(messageId, emoji, userId);
    if (!updated || updated.conversationId !== conversationId) {
      throw new ResourceNotFoundException('DirectMessage', messageId);
    }
    return this.groupReactions(updated.reactions, userId);
  }

  async removeReaction(conversationId: string, messageId: string, userId: string, emoji: string): Promise<GroupedReactionDto[]> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new ResourceNotFoundException('Conversation', conversationId);
    }
    this.assertParticipant(conversation.participantIds, userId);
    const updated = await this.directMessageRepository.removeReaction(messageId, emoji, userId);
    if (!updated || updated.conversationId !== conversationId) {
      throw new ResourceNotFoundException('DirectMessage', messageId);
    }
    return this.groupReactions(updated.reactions, userId);
  }

  async markRead(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new ResourceNotFoundException('Conversation', conversationId);
    }
    this.assertParticipant(conversation.participantIds, userId);
    await this.conversationRepository.updateLastReadAt(conversationId, userId, Date.now());
  }

  /** The recipient of a pending request accepting it explicitly - a reply
   * (see sendMessage above) does the same thing implicitly. */
  async acceptConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new ResourceNotFoundException('Conversation', conversationId);
    }
    this.assertParticipant(conversation.participantIds, userId);
    if (conversation.requestedBy === userId) {
      throw new BusinessRuleException(
        'The requester cannot accept their own request',
        'errors.BUSINESS_CANNOT_ACCEPT_OWN_REQUEST',
      );
    }
    await this.conversationRepository.updateStatus(conversationId, 'accepted');
  }

  /** Declining deletes the conversation and its messages outright, with no
   * notification to the requester - same "silent no" as rejecting an event
   * join request today. */
  async declineConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new ResourceNotFoundException('Conversation', conversationId);
    }
    this.assertParticipant(conversation.participantIds, userId);
    await this.directMessageRepository.deleteByConversation(conversationId);
    await this.conversationRepository.deleteById(conversationId);
  }

  private async hydrateMessages(messages: DirectMessageDto[], requestingUserId: string): Promise<DirectMessageWithSenderDto[]> {
    if (!messages.length) {
      return [];
    }
    const replyToIds = [...new Set(messages.map((message) => message.replyToMessageId).filter((id): id is string => !!id))];
    const [senders, replyTargets] = await Promise.all([
      this.userService.findByIds([...new Set(messages.map((message) => message.senderId))]),
      replyToIds.length ? this.directMessageRepository.findByIds(replyToIds) : Promise.resolve<DirectMessageDto[]>([]),
    ]);
    const senderById = new Map(senders.map((sender) => [sender.id, sender]));
    const replyTargetSenders = replyTargets.length
      ? await this.userService.findByIds([...new Set(replyTargets.map((m) => m.senderId))])
      : [];
    const replyTargetSenderById = new Map(replyTargetSenders.map((sender) => [sender.id, sender]));
    const replyById = new Map(replyTargets.map((target) => [target.id!, target]));

    return messages
      .map((message): DirectMessageWithSenderDto | null => {
        const sender = senderById.get(message.senderId);
        if (!sender) {
          return null;
        }
        const deleted = !!message.deletedAt;
        const replyTarget = message.replyToMessageId ? replyById.get(message.replyToMessageId) : undefined;
        const replyTo: DirectMessageQuoteDto | null = replyTarget
          ? {
              id: replyTarget.id!,
              senderName: replyTargetSenderById.get(replyTarget.senderId)?.name ?? '',
              text: replyTarget.deletedAt ? '' : replyTarget.text,
              deleted: !!replyTarget.deletedAt,
            }
          : null;
        return {
          id: message.id!,
          conversationId: message.conversationId,
          senderId: message.senderId,
          senderName: sender.name,
          senderPhotoUrl: sender.photoUrl,
          text: deleted ? '' : message.text,
          reactions: deleted ? [] : this.groupReactions(message.reactions, requestingUserId),
          createdAt: message.createdAt,
          editedAt: message.editedAt,
          deleted,
          replyTo,
        };
      })
      .filter((item): item is DirectMessageWithSenderDto => item !== null);
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
