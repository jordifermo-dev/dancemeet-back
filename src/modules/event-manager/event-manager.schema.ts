import { Document, Model, Schema, model } from 'mongoose';

export type EventManagerStatus = 'pending' | 'accepted';
/** 'attendee': just favorites the event on accept, no extra rights.
 * 'manager': same, plus edit/delete/invite-others rights (see
 * EventService.assertCanManage). Called "Organizador/Administrador" in the
 * UI - kept as 'manager' here since this is the pre-existing field/token
 * name and renaming it would ripple through every consumer for no
 * behavioral gain. */
export type EventManagerRole = 'attendee' | 'manager';

export interface EventManagerDocument extends Document {
  eventId: string;
  userId: string;
  invitedByUserId: string;
  role: EventManagerRole;
  status: EventManagerStatus;
  createdAt: number;
  respondedAt?: number;
}

export const EventManagerSchema = new Schema<EventManagerDocument>(
  {
    eventId: { type: String, required: true },
    userId: { type: String, required: true },
    invitedByUserId: { type: String, required: true },
    role: { type: String, required: true, default: 'manager' },
    status: { type: String, required: true, default: 'pending' },
    createdAt: { type: Number, default: () => Date.now() },
    respondedAt: { type: Number },
  },
  {
    collection: 'event_managers',
    versionKey: false,
  },
);

EventManagerSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export const EventManagerModel: Model<EventManagerDocument> = model<EventManagerDocument>(
  'EventManager',
  EventManagerSchema,
);
