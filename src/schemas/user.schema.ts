import { Document, Model, Schema, model } from 'mongoose';
import { ISocialLinks } from '../common';
import { NotificationType } from './notification.schema';

export interface UserDocument extends Document {
  name: string;
  email: string;
  phone?: string;
  socialLinks?: ISocialLinks;
  photoUrl?: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  location?: { type: string; coordinates: number[] };
  distanceRange: number;
  eventDateFrom?: number | null;
  eventDateTo?: number | null;
  disabledNotificationTypes: NotificationType[];
  disciplineIds: string[];
  eventTypeIds: string[];
  statusIds: string[];
  priceOptions: string[];
  relationTypes: string[];
  language: string;
  showEmail: boolean;
  showPhone: boolean;
  showCity: boolean;
  showLocation: boolean;
  createdAt: number;
  updatedAt?: number;
  followedId: string[];
  followingId: string[];
  blockedIds: string[];
  fcmTokens: string[];
}

const SocialLinksSchema = new Schema<ISocialLinks>(
  {
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },
    pinterest: { type: String, trim: true },
    tiktok: { type: String, trim: true },
    website: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    youtube: { type: String, trim: true },
  },
  { _id: false },
);

export const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, unique: true },
    phone: { type: String, trim: true },
    socialLinks: { type: SocialLinksSchema },
    photoUrl: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    distanceRange: { type: Number, required: true },
    eventDateFrom: { type: Number },
    eventDateTo: { type: Number, default: null },
    disabledNotificationTypes: { type: [String], default: [] },
    disciplineIds: { type: [String], default: [] },
    eventTypeIds: { type: [String], default: [] },
    statusIds: { type: [String], default: [] },
    priceOptions: { type: [String], default: [] },
    relationTypes: { type: [String], default: [] },
    language: { type: String, default: 'es' },
    showEmail: { type: Boolean, required: true, default: false },
    showPhone: { type: Boolean, required: true, default: false },
    showCity: { type: Boolean, required: true, default: false },
    showLocation: { type: Boolean, required: true, default: false },
    createdAt: { type: Number, default: () => Date.now() },
    updatedAt: { type: Number },
    followedId: { type: [String], default: [] },
    followingId: { type: [String], default: [] },
    blockedIds: { type: [String], default: [] },
    fcmTokens: { type: [String], default: [] },
  },
  {
    collection: 'users',
    versionKey: false,
  },
);

UserSchema.index({ city: 1 });
UserSchema.index({ disciplineIds: 1 });
UserSchema.index({ eventTypeIds: 1 });
UserSchema.index({ statusIds: 1 });
UserSchema.index({ location: '2dsphere' });

export const UserModel: Model<UserDocument> = model<UserDocument>('User', UserSchema);
