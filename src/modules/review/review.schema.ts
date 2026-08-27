import { Document, Model, Schema, model } from 'mongoose';

/** One user's rating+comment for one event, only after attending it and only
 * once it has finished (enforced in ReviewService, not here). At most one
 * review per {authorUserId, eventId} - re-reviewing updates the existing
 * document rather than creating a second one, same idea as AttendanceSchema's
 * own unique index.
 *
 * organizerId is denormalized from the event's own creatorId at write time -
 * an organizer's aggregate rating (ReviewRepository.getOrganizerRating) is
 * read far more often than a review is written, so it's worth avoiding an
 * event lookup on every aggregation (same reasoning as posterUserName on
 * GalleryPhotoWithPosterDto).
 *
 * organizerReply is an embedded subdocument, not a collection of its own -
 * there is at most one reply per review (see ReviewService.replyToReview),
 * written by whichever manager/creator of the event replies, and replaced
 * wholesale on edit rather than appended to. */
export interface ReviewDocument extends Document {
  eventId: string;
  authorUserId: string;
  organizerId: string;
  rating: number;
  comment?: string;
  createdAt: number;
  updatedAt?: number;
  organizerReply?: {
    text: string;
    repliedByUserId: string;
    createdAt: number;
    updatedAt?: number;
  };
}

export const ReviewSchema = new Schema<ReviewDocument>(
  {
    eventId: { type: String, required: true },
    authorUserId: { type: String, required: true },
    organizerId: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: false },
    createdAt: { type: Number, default: () => Date.now() },
    updatedAt: { type: Number, required: false },
    organizerReply: {
      type: {
        text: { type: String, required: true },
        repliedByUserId: { type: String, required: true },
        createdAt: { type: Number, required: true },
        updatedAt: { type: Number, required: false },
      },
      required: false,
    },
  },
  {
    collection: 'reviews',
    versionKey: false,
  },
);

ReviewSchema.index({ authorUserId: 1, eventId: 1 }, { unique: true });
ReviewSchema.index({ organizerId: 1 });

export const ReviewModel: Model<ReviewDocument> = model<ReviewDocument>('Review', ReviewSchema);
