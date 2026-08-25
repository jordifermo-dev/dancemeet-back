import { Document, Model, Schema, model } from 'mongoose';

/** One user genuinely attending one event - distinct from Favorite, which
 * now means only "liked" (see favorite.schema.ts's own doc comment). This
 * is the source of truth for the attendee list, the attendee count, the
 * gallery photo-posting permission (EventService.assertCanPostPhoto), and
 * the "new attendee" notification to the organizer. */
export interface AttendanceDocument extends Document {
  userId: string;
  eventId: string;
  createdAt: number;
}

export const AttendanceSchema = new Schema<AttendanceDocument>(
  {
    userId: { type: String, required: true },
    eventId: { type: String, required: true },
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
