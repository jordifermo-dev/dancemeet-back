import { Document, Model, Schema, model } from 'mongoose';

/** A plain "me gusta" a user puts on an event - marks the heart filled and
 * lists it under Favoritos, nothing more. Does NOT mean the user is
 * attending - see src/modules/attendance/attendance.schema.ts for the real
 * RSVP. */
export interface FavoriteDocument extends Document {
  userId: string;
  eventId: string;
  createdAt: number;
}

export const FavoriteSchema = new Schema<FavoriteDocument>(
  {
    userId: { type: String, required: true },
    eventId: { type: String, required: true },
    createdAt: { type: Number, default: () => Date.now() },
  },
  {
    collection: 'favorites',
    versionKey: false,
  },
);

FavoriteSchema.index({ userId: 1, eventId: 1 }, { unique: true });

export const FavoriteModel: Model<FavoriteDocument> = model<FavoriteDocument>(
  'Favorite',
  FavoriteSchema,
);
