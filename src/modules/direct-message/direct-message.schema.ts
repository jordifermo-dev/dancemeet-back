import { Document, Model, Schema, model } from 'mongoose';
import { MessageReaction } from '../event-chat/event-chat.schema';

/** One message in one 1:1 conversation - same shape as event-chat's
 * EventMessageDocument minus the gallery-photo-mention fields (no gallery to
 * mention anything from in a DM, out of scope). Only ever created by
 * DirectMessageGateway.handleSendMessage, same "no plain REST write route"
 * reasoning as EventChatController. */
export interface DirectMessageDocument extends Document {
  conversationId: string;
  senderId: string;
  text: string;
  reactions: MessageReaction[];
  createdAt: number;
  editedAt?: number;
  deletedAt?: number;
  replyToMessageId?: string;
}

export const DirectMessageSchema = new Schema<DirectMessageDocument>(
  {
    conversationId: { type: String, required: true },
    senderId: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    reactions: {
      type: [{ emoji: { type: String, required: true }, userId: { type: String, required: true }, _id: false }],
      default: [],
    },
    createdAt: { type: Number, default: () => Date.now() },
    editedAt: { type: Number, required: false },
    deletedAt: { type: Number, required: false },
    replyToMessageId: { type: String, required: false },
  },
  {
    collection: 'direct_messages',
    versionKey: false,
  },
);

DirectMessageSchema.index({ conversationId: 1, createdAt: -1 });

export const DirectMessageModel: Model<DirectMessageDocument> = model<DirectMessageDocument>(
  'DirectMessage',
  DirectMessageSchema,
);
