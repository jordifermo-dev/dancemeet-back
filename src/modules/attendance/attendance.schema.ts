import { Document, Model, Schema, model } from 'mongoose';

/** One user genuinely attending one event - distinct from Favorite, which
 * now means only "liked" (see favorite.schema.ts's own doc comment). This
 * is the source of truth for the attendee list, the attendee count, the
 * gallery photo-posting permission (EventService.assertCanPostPhoto), the
 * "new attendee" notification to the organizer, and (see chatVisibleFrom
 * below) how much of the event's private chat history this person can see.
 *
 * chatVisibleFrom is optional and deliberately NOT backfilled/defaulted at
 * the schema level - its absence already means the right thing (see
 * EventChatService.getMessagesDetailed): fall back to this row's own
 * createdAt, i.e. "only messages from when I joined", the safe default for
 * anyone who wasn't explicitly granted full history by whoever invited them
 * (see EventManagerService.respondToInvite). 0 means no cutoff at all (full
 * history) - always explicit, never a schema default, since only the
 * creator (createEvent) or an accepted 'full' invite should ever get it. */
export interface AttendanceDocument extends Document {
  userId: string;
  eventId: string;
  chatVisibleFrom?: number;
  createdAt: number;
}

export const AttendanceSchema = new Schema<AttendanceDocument>(
  {
    userId: { type: String, required: true },
    eventId: { type: String, required: true },
    chatVisibleFrom: { type: Number, required: false },
    createdAt: { type: Number, default: () => Date.now() },
  },
  {
    collection: 'attendances',
    versionKey: false,
  },
);

AttendanceSchema.index({ userId: 1, eventId: 1 }, { unique: true });

export const AttendanceModel: Model<AttendanceDocument> = model<AttendanceDocument>(
  'Attendance',
  AttendanceSchema,
);
