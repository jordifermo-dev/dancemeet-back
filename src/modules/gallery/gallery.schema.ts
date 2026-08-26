import { Document, Model, Schema, model } from 'mongoose';

/** One photo shared by one user, optionally on one event - queryable both by
 * eventId (event's own gallery) and by posterUserId (that user's own gallery
 * across every event they've shared to, plus any photo posted straight to
 * their profile), so the same photo shows up in both places without
 * duplicating the row. eventId is absent for a photo posted directly to a
 * profile, with no event involved. No unique index on {eventId,userId}
 * (unlike EventManagerSchema) - a user can post many photos to the same
 * event.
 *
 * showInPublicGallery/showInPrivateGallery are independent, not two ends of
 * one boolean - a photo posted privately can later also be shared publicly
 * (both true at once), and a public photo shared by mistake can be moved to
 * private-only (see GalleryService.shareToPublicGallery/moveToPrivateGallery).
 * Both only matter when eventId is set - a profile-only photo has no
 * privacy concept and ignores them (see getUserGalleryDetailed). */
export interface GalleryPhotoDocument extends Document {
  eventId?: string;
  posterUserId: string;
  photoUrl: string;
  showInPublicGallery: boolean;
  showInPrivateGallery: boolean;
  createdAt: number;
  /** One reaction per {emoji,userId} - same flat, ungrouped shape as
   * MessageReaction on EventMessageDocument (see event-chat.schema.ts),
   * copied rather than shared across domains. Grouping/reactedByMe is
   * hydration logic in GalleryService, never stored this way. */
  reactions: { emoji: string; userId: string }[];
}

export const GalleryPhotoSchema = new Schema<GalleryPhotoDocument>(
  {
    eventId: { type: String, required: false },
    posterUserId: { type: String, required: true },
    photoUrl: { type: String, required: true },
    showInPublicGallery: { type: Boolean, required: true, default: true },
    showInPrivateGallery: { type: Boolean, required: true, default: false },
    createdAt: { type: Number, default: () => Date.now() },
    reactions: {
      type: [{ emoji: { type: String, required: true }, userId: { type: String, required: true }, _id: false }],
      default: [],
    },
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
