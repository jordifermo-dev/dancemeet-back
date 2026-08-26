import { Document, Model, Schema, model } from 'mongoose';

/** One reaction on one message - a flat "who put what emoji" list, not
 * grouped by emoji. Grouping (with per-viewer reactedByMe) is hydration
 * logic, not storage - see EventChatService.getMessagesDetailed. */
export interface MessageReaction {
  emoji: string;
  userId: string;
}

/** One message in one event's private xat - only ever created by
 * EventChatGateway.handleSendMessage (never a plain REST POST, see
 * EventChatController's own doc comment on why there's no write route
 * there). Who can *see* a given message depends on the reader's own
 * Attendance.chatVisibleFrom cutoff, resolved per-request in
 * EventChatService - this document itself carries no per-viewer state. */
export interface EventMessageDocument extends Document {
  eventId: string;
  senderId: string;
  text: string;
  reactions: MessageReaction[];
  createdAt: number;
}

export const EventMessageSchema = new Schema<EventMessageDocument>(
  {
    eventId: { type: String, required: true },
    senderId: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    reactions: {
      type: [{ emoji: { type: String, required: true }, userId: { type: String, required: true }, _id: false }],
      default: [],
    },
    createdAt: { type: Number, default: () => Date.now() },
  },
  {
    collection: 'event_chat_messages',
    versionKey: false,
  },
);

EventMessageSchema.index({ eventId: 1, createdAt: -1 });

export const EventMessageModel: Model<EventMessageDocument> = model<EventMessageDocument>(
  'EventMessage',
  EventMessageSchema,
);
