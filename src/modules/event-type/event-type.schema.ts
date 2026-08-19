import { Document, Model, Schema, model } from 'mongoose';

export interface EventTypeDocument extends Document {
  name: string;
  createdAt: number;
}

export const EventTypeSchema = new Schema<EventTypeDocument>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    createdAt: { type: Number, default: () => Date.now() },
  },
  {
    collection: 'eventTypes',
    versionKey: false,
  },
);

export const EventTypeModel: Model<EventTypeDocument> = model<EventTypeDocument>(
  'EventType',
  EventTypeSchema,
);
