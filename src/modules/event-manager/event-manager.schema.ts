import { Document, Model, Schema, model } from 'mongoose';

export type EventManagerStatus = 'pending' | 'accepted';
/** 'attendee': just favorites the event on accept, no extra rights.
 * 'manager': same, plus edit/delete/invite-others rights (see
 * EventService.assertCanManage). Called "Organizador/Administrador" in the
 * UI - kept as 'manager' here since this is the pre-existing field/token
 * name and renaming it would ripple through every consumer for no
 * behavioral gain. */
export type EventManagerRole = 'attendee' | 'manager';

/** Chosen by whoever sends the invite (see EventManagerService.inviteParticipant)
 * - whether accepting grants the full chat history or only messages from
 * the moment of acceptance onward. Translated into Attendance.chatVisibleFrom
 * on accept (see EventManagerService.respondToInvite). Defaults to the more
 * restrictive 'fromJoin' - an invite created before this field existed (or
 * from any code path that doesn't set it explicitly) never silently grants
 * full history. */
export type ChatHistoryAccess = 'full' | 'fromJoin';

export interface EventManagerDocument extends Document {
  eventId: string;
  userId: string;
  invitedByUserId: string;
  role: EventManagerRole;
  status: EventManagerStatus;
  chatHistoryAccess: ChatHistoryAccess;
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
    chatHistoryAccess: { type: String, required: true, default: 'fromJoin' },
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
