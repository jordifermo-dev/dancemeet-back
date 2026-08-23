import { Document, Model, Schema, model } from 'mongoose';

/** One photo shared by one user, optionally on one event - queryable both by
 * eventId (event's own gallery) and by posterUserId (that user's own gallery
 * across every event they've shared to, plus any photo posted straight to
 * their profile), so the same photo shows up in both places without
 * duplicating the row. eventId is absent for a photo posted directly to a
 * profile, with no event involved. No unique index on {eventId,userId}
 * (unlike EventManagerSchema) - a user can post many photos to the same
 * event. */
export interface GalleryPhotoDocument extends Document {
  eventId?: string;
  posterUserId: string;
  photoUrl: string;
  createdAt: number;
}

export const GalleryPhotoSchema = new Schema<GalleryPhotoDocument>(
  {
    eventId: { type: String, required: false },
    posterUserId: { type: String, required: true },
    photoUrl: { type: String, required: true },
    createdAt: { type: Number, default: () => Date.now() },
  },
  {
    collection: 'gallery_photos',
    versionKey: false,
  },
);

GalleryPhotoSchema.index({ eventId: 1, createdAt: -1 });
GalleryPhotoSchema.index({ posterUserId: 1, createdAt: -1 });

export const GalleryPhotoModel: Model<GalleryPhotoDocument> = model<GalleryPhotoDocument>(
  'GalleryPhoto',
  GalleryPhotoSchema,
);
