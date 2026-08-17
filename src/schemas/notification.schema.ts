import { Document, Model, Schema, model } from 'mongoose';

export type NotificationType =
  | 'new_follower'
  | 'event_attendee'
  | 'event_updated'
  | 'event_reminder_today'
  | 'following_new_event'
  | 'preference_new_event'
  | 'recurring_series_created';

export const NOTIFICATION_TYPES: NotificationType[] = [
  'new_follower',
  'event_attendee',
  'event_updated',
  'event_reminder_today',
  'following_new_event',
  'preference_new_event',
  'recurring_series_created',
];

export interface NotificationDocument extends Document {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: number;
}

export const NotificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    data: { type: Schema.Types.Mixed },
    read: { type: Boolean, required: true, default: false },
    createdAt: { type: Number, default: () => Date.now() },
  },
  {
    collection: 'notifications',
    versionKey: false,
  },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const NotificationModel: Model<NotificationDocument> = model<NotificationDocument>(
  'Notification',
  NotificationSchema,
);
