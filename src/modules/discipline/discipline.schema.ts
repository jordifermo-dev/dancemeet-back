import { Document, Model, Schema, model } from 'mongoose';

export interface DisciplineDocument extends Document {
  name: string;
  color: string;
  iconUrl: string;
  createdAt: number;
}

export const DisciplineSchema = new Schema<DisciplineDocument>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    color: { type: String, required: true, trim: true },
    iconUrl: { type: String, required: true, trim: true },
    createdAt: { type: Number, default: () => Date.now() },
  },
  {
    collection: 'disciplines',
    versionKey: false,
  },
);

export const DisciplineModel: Model<DisciplineDocument> = model<DisciplineDocument>(
  'Discipline',
  DisciplineSchema,
);
