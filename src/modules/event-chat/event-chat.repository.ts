import { Model } from 'mongoose';
import { mapEventMessageToDto } from '../../config/mongoose.config';
import { EventMessageDto } from './event-chat.dto';
import { EventMessageDocument } from './event-chat.schema';
import { handleDbOperation } from '../../common';

const DEFAULT_PAGE_SIZE = 50;

export class EventChatRepository {
  private readonly resourceName = 'EventMessage';

  constructor(private readonly eventMessageModel: Model<EventMessageDocument>) {}

  async create(data: { eventId: string; senderId: string; text: string }): Promise<EventMessageDto> {
    return handleDbOperation(this.resourceName, 'create', async () => {
      const createdDocument = await this.eventMessageModel.create({ ...data, reactions: [], createdAt: Date.now() });
      return mapEventMessageToDto(createdDocument);
    });
  }

  async findById(id: string): Promise<EventMessageDto | null> {
    return handleDbOperation(this.resourceName, 'findById', async () => {
      const document = await this.eventMessageModel.findById(id).lean();
      return document ? mapEventMessageToDto(document) : null;
    });
  }

  /** since (the reader's own Attendance.chatVisibleFrom cutoff, already
   * resolved by the service) is always applied - no caller ever sees a
   * message from before their own access started. before (a message's own
   * createdAt) narrows further for "load older messages" pagination.
   * Returns oldest-first (ready to render top-to-bottom), even though the
   * underlying query runs newest-first-limited to grab the right page. */
  async findByEvent(eventId: string, since: number, before?: number, limit = DEFAULT_PAGE_SIZE): Promise<EventMessageDto[]> {
    return handleDbOperation(this.resourceName, 'findByEvent', async () => {
      const documents = await this.eventMessageModel
        .find({
          eventId,
          createdAt: { $gte: since, ...(before !== undefined ? { $lt: before } : {}) },
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return documents.reverse().map((document) => mapEventMessageToDto(document));
    });
  }

  /** One reaction per user per message - pulls any reaction this user
   * already left on this message (whatever emoji it was) before pushing the
   * new one, so picking a different emoji replaces theirs instead of
   * stacking a second one alongside it. */
  async addReaction(messageId: string, emoji: string, userId: string): Promise<EventMessageDto | null> {
    return handleDbOperation(this.resourceName, 'addReaction', async () => {
      await this.eventMessageModel.updateOne({ _id: messageId }, { $pull: { reactions: { userId } } });
      const document = await this.eventMessageModel.findByIdAndUpdate(
        messageId,
        { $push: { reactions: { emoji, userId } } },
        { new: true },
      );
      return document ? mapEventMessageToDto(document) : null;
    });
  }

  async removeReaction(messageId: string, emoji: string, userId: string): Promise<EventMessageDto | null> {
    return handleDbOperation(this.resourceName, 'removeReaction', async () => {
      const document = await this.eventMessageModel.findByIdAndUpdate(
        messageId,
        { $pull: { reactions: { emoji, userId } } },
        { new: true },
      );
      return document ? mapEventMessageToDto(document) : null;
    });
  }

  async update(
    messageId: string,
    patch: Partial<{ text: string; editedAt: number; deletedAt: number }>,
  ): Promise<EventMessageDto | null> {
    return handleDbOperation(this.resourceName, 'update', async () => {
      const document = await this.eventMessageModel.findByIdAndUpdate(messageId, { $set: patch }, { new: true });
      return document ? mapEventMessageToDto(document) : null;
    });
  }

  /** Batch lookup for resolving reply-quote previews - mirrors the same
   * "fetch many by id in one query" shape UserService.findByIds already uses
   * for hydrating senders. */
  async findByIds(ids: string[]): Promise<EventMessageDto[]> {
    return handleDbOperation(this.resourceName, 'findByIds', async () => {
      const documents = await this.eventMessageModel.find({ _id: { $in: ids } }).lean();
      return documents.map((document) => mapEventMessageToDto(document));
    });
  }

  async countUnread(eventId: string, since: number, excludeUserId: string): Promise<number> {
    return handleDbOperation(this.resourceName, 'countUnread', async () => {
      return this.eventMessageModel.countDocuments({
        eventId,
        createdAt: { $gt: since },
        senderId: { $ne: excludeUserId },
        deletedAt: { $exists: false },
      });
    });
  }
}
