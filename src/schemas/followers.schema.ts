import { Document, Model, Schema, model } from 'mongoose';

export interface FollowersDocument extends Document {
  userId: string;
  followerId: string;
  createdAt: number;
}

export const FollowersSchema = new Schema<FollowersDocument>(
  {
    userId: { type: String, required: true },
    followerId: { type: String, required: true },
    createdAt: { type: Number, default: () => Date.now() },
  },
  {
    collection: 'followers',
    versionKey: false,
  },
);

FollowersSchema.index({ userId: 1, followerId: 1 }, { unique: true });

export const FollowersModel: Model<FollowersDocument> = model<FollowersDocument>(
  'Followers',
  FollowersSchema,
);
