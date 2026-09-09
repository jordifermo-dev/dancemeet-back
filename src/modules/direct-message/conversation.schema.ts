import { Document, Model, Schema, model } from 'mongoose';

export type ConversationStatus = 'accepted' | 'pending';

/** A 1:1 conversation between exactly two users - strictly two-party, unlike
 * event-chat's group xat (N participants, membership by event attendance).
 * See 15_tab-chats-implementacion.md's own doc comment on why the two are
 * separate models rather than one generalized to N participants.
 *
 * participantIds carries both ids (for the $in-friendly "conversations I'm
 * part of" query); participantIdLow/High are the same pair in a fixed
 * (lexicographic) order, existing purely so the unique index below can
 * enforce "at most one conversation per pair" regardless of who started it -
 * a plain unique index on the participantIds array would index each element
 * separately (multikey), not the pair as a whole.
 *
 * lastReadAt is a per-participant read marker (userId -> timestamp) kept
 * directly on the conversation, rather than a separate collection - there's
 * no "attendance" concept to hang it off like event-chat's Attendance rows,
 * and a conversation only ever has two participants to track. */
export interface ConversationDocument extends Document {
  participantIds: string[];
  participantIdLow: string;
  participantIdHigh: string;
  status: ConversationStatus;
  requestedBy: string;
  createdAt: number;
  lastMessageAt?: number;
  lastReadAt: Map<string, number>;
}

export const ConversationSchema = new Schema<ConversationDocument>(
  {
    participantIds: { type: [String], required: true },
    participantIdLow: { type: String, required: true },
    participantIdHigh: { type: String, required: true },
    status: { type: String, required: true, default: 'pending' },
    requestedBy: { type: String, required: true },
    createdAt: { type: Number, default: () => Date.now() },
    lastMessageAt: { type: Number, required: false },
    lastReadAt: { type: Map, of: Number, default: () => new Map() },
  },
  {
    collection: 'conversations',
    versionKey: false,
  },
);

ConversationSchema.index({ participantIdLow: 1, participantIdHigh: 1 }, { unique: true });
ConversationSchema.index({ participantIds: 1, lastMessageAt: -1 });

export const ConversationModel: Model<ConversationDocument> = model<ConversationDocument>(
  'Conversation',
  ConversationSchema,
);
