import { Model } from 'mongoose';
import { DirectMessageDto } from './direct-message.dto';
import { DirectMessageDocument } from './direct-message.schema';
import { handleDbOperation } from '../../common';
import { mapDirectMessageToDto } from '../../config/mongoose.config';

const DEFAULT_PAGE_SIZE = 50;

/** Mirrors EventChatRepository's shape and query patterns exactly (same
 * batch-$in-plus-reduce approach, never `.aggregate()`), just scoped to
 * conversationId instead of eventId - see 15_tab-chats-implementacion.md's
 * doc comment on why this is a sibling module rather than a generalization
 * of event-chat to N participants. */
export class DirectMessageRepository {
  private readonly resourceName = 'DirectMessage';

  constructor(private readonly directMessageModel: Model<DirectMessageDocument>) {}

  async create(data: { conversationId: string; senderId: string; text: string; replyToMessageId?: string }): Promise<DirectMessageDto> {
    return handleDbOperation(this.resourceName, 'create', async () => {
      const created = await this.directMessageModel.create({ ...data, reactions: [], createdAt: Date.now() });
      return mapDirectMessageToDto(created);
    });
  }

  async findById(id: string): Promise<DirectMessageDto | null> {
    return handleDbOperation(this.resourceName, 'findById', async () => {
      const document = await this.directMessageModel.findById(id).lean();
      return document ? mapDirectMessageToDto(document) : null;
    });
  }

  /** Always the whole history (no chatVisibleFrom-style cutoff - a DM has no
   * "joined late" concept, both participants have always been able to see
   * everything since the conversation started). */
  async findByConversation(conversationId: string, before?: number, limit = DEFAULT_PAGE_SIZE): Promise<DirectMessageDto[]> {
    return handleDbOperation(this.resourceName, 'findByConversation', async () => {
      const documents = await this.directMessageModel
        .find({ conversationId, ...(before !== undefined ? { createdAt: { $lt: before } } : {}) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return documents.reverse().map(mapDirectMessageToDto);
    });
  }

  async findByIds(ids: string[]): Promise<DirectMessageDto[]> {
    return handleDbOperation(this.resourceName, 'findByIds', async () => {
      const documents = await this.directMessageModel.find({ _id: { $in: ids } }).lean();
      return documents.map(mapDirectMessageToDto);
    });
  }

  async addReaction(messageId: string, emoji: string, userId: string): Promise<DirectMessageDto | null> {
    return handleDbOperation(this.resourceName, 'addReaction', async () => {
      await this.directMessageModel.updateOne({ _id: messageId }, { $pull: { reactions: { userId } } });
      const document = await this.directMessageModel.findByIdAndUpdate(
        messageId,
        { $push: { reactions: { emoji, userId } } },
        { new: true },
      );
      return document ? mapDirectMessageToDto(document) : null;
    });
  }

  async removeReaction(messageId: string, emoji: string, userId: string): Promise<DirectMessageDto | null> {
    return handleDbOperation(this.resourceName, 'removeReaction', async () => {
      const document = await this.directMessageModel.findByIdAndUpdate(
        messageId,
        { $pull: { reactions: { emoji, userId } } },
        { new: true },
      );
      return document ? mapDirectMessageToDto(document) : null;
    });
  }

  async update(messageId: string, patch: Partial<{ text: string; editedAt: number; deletedAt: number }>): Promise<DirectMessageDto | null> {
    return handleDbOperation(this.resourceName, 'update', async () => {
      const document = await this.directMessageModel.findByIdAndUpdate(messageId, { $set: patch }, { new: true });
      return document ? mapDirectMessageToDto(document) : null;
    });
  }

  /** Batched "most recent message per conversation" - see EventChatRepository.
   * findLatestMessageByEvents's own doc comment, same pattern. */
  async findLatestMessageByConversations(conversationIds: string[]): Promise<Map<string, { createdAt: number; senderId: string; text: string }>> {
    return handleDbOperation(this.resourceName, 'findLatestMessageByConversations', async () => {
      const latestByConversationId = new Map<string, { createdAt: number; senderId: string; text: string }>();
      if (!conversationIds.length) {
        return latestByConversationId;
      }
      const documents = await this.directMessageModel
        .find({ conversationId: { $in: conversationIds }, deletedAt: { $exists: false } })
        .sort({ conversationId: 1, createdAt: -1 })
        .select('conversationId createdAt senderId text')
        .lean();
      for (const document of documents) {
        if (!latestByConversationId.has(document.conversationId)) {
          latestByConversationId.set(document.conversationId, { createdAt: document.createdAt, senderId: document.senderId, text: document.text });
        }
      }
      return latestByConversationId;
    });
  }

  /** Batched unread count per conversation - same reduce-in-memory shape as
   * EventChatRepository.countUnreadManyByEvents, thresholded by each
   * conversation's own lastReadAt[userId] instead of an Attendance row. */
  async countUnreadManyByConversations(thresholdByConversationId: Map<string, number>, excludeUserId: string): Promise<Map<string, number>> {
    return handleDbOperation(this.resourceName, 'countUnreadManyByConversations', async () => {
      const countByConversationId = new Map<string, number>();
      const conversationIds = [...thresholdByConversationId.keys()];
      if (!conversationIds.length) {
        return countByConversationId;
      }
      const documents = await this.directMessageModel
        .find({ conversationId: { $in: conversationIds }, senderId: { $ne: excludeUserId }, deletedAt: { $exists: false } })
        .select('conversationId createdAt')
        .lean();
      for (const document of documents) {
        const threshold = thresholdByConversationId.get(document.conversationId) ?? 0;
        if (document.createdAt > threshold) {
          countByConversationId.set(document.conversationId, (countByConversationId.get(document.conversationId) ?? 0) + 1);
        }
      }
      return countByConversationId;
    });
  }

  async countUnread(conversationId: string, since: number, excludeUserId: string): Promise<number> {
    return handleDbOperation(this.resourceName, 'countUnread', async () => {
      return this.directMessageModel.countDocuments({
        conversationId,
        createdAt: { $gt: since },
        senderId: { $ne: excludeUserId },
        deletedAt: { $exists: false },
      });
    });
  }

  async deleteByConversation(conversationId: string): Promise<void> {
    await handleDbOperation(this.resourceName, 'deleteByConversation', async () => {
      await this.directMessageModel.deleteMany({ conversationId });
    });
  }
}
