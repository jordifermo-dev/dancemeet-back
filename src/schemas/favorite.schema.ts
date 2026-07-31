import { Document, Model, Schema, model } from 'mongoose';

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
