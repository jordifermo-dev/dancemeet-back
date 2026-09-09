import { Model } from 'mongoose';
import { ConversationDto } from './direct-message.dto';
import { ConversationDocument, ConversationStatus } from './conversation.schema';
import { handleDbOperation } from '../../common';
import { mapConversationToDto } from '../../config/mongoose.config';

function canonicalPair(userIdA: string, userIdB: string): [string, string] {
  return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
}

export class ConversationRepository {
  private readonly resourceName = 'Conversation';

  constructor(private readonly conversationModel: Model<ConversationDocument>) {}

  /** Throws DuplicateKeyException (via the unique participantIdLow/High
   * index) if a conversation for this pair already exists - the service
   * always checks findByPair first, so this is only ever a defensive
   * safety net against a race between two concurrent "start chat" taps. */
  async create(data: { participantIds: [string, string]; status: ConversationStatus; requestedBy: string }): Promise<ConversationDto> {
    return handleDbOperation(this.resourceName, 'create', async () => {
      const [participantIdLow, participantIdHigh] = canonicalPair(data.participantIds[0], data.participantIds[1]);
      const created = await this.conversationModel.create({
        participantIds: data.participantIds,
        participantIdLow,
        participantIdHigh,
        status: data.status,
        requestedBy: data.requestedBy,
        createdAt: Date.now(),
        lastReadAt: new Map(),
      });
      return mapConversationToDto(created);
    });
  }

  async findByPair(userIdA: string, userIdB: string): Promise<ConversationDto | null> {
    return handleDbOperation(this.resourceName, 'findByPair', async () => {
      const [participantIdLow, participantIdHigh] = canonicalPair(userIdA, userIdB);
      const document = await this.conversationModel.findOne({ participantIdLow, participantIdHigh }).lean();
      return document ? mapConversationToDto(document) : null;
    });
  }

  async findById(id: string): Promise<ConversationDto | null> {
    return handleDbOperation(this.resourceName, 'findById', async () => {
      const document = await this.conversationModel.findById(id).lean();
      return document ? mapConversationToDto(document) : null;
    });
  }

  async findByUser(userId: string): Promise<ConversationDto[]> {
    return handleDbOperation(this.resourceName, 'findByUser', async () => {
      const documents = await this.conversationModel
        .find({ participantIds: userId })
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .lean();
      return documents.map(mapConversationToDto);
    });
  }

  async updateStatus(id: string, status: ConversationStatus): Promise<ConversationDto | null> {
    return handleDbOperation(this.resourceName, 'updateStatus', async () => {
      const document = await this.conversationModel.findByIdAndUpdate(id, { $set: { status } }, { new: true });
      return document ? mapConversationToDto(document) : null;
    });
  }

  async updateLastMessageAt(id: string, lastMessageAt: number): Promise<void> {
    await handleDbOperation(this.resourceName, 'updateLastMessageAt', async () => {
      await this.conversationModel.updateOne({ _id: id }, { $set: { lastMessageAt } });
    });
  }

  async updateLastReadAt(id: string, userId: string, readAt: number): Promise<void> {
    await handleDbOperation(this.resourceName, 'updateLastReadAt', async () => {
      await this.conversationModel.updateOne({ _id: id }, { $set: { [`lastReadAt.${userId}`]: readAt } });
    });
  }

  async deleteById(id: string): Promise<void> {
    await handleDbOperation(this.resourceName, 'deleteById', async () => {
      await this.conversationModel.deleteOne({ _id: id });
    });
  }
}
