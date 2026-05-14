import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const eventSchema = new Schema({
  sessionId: { type: String, required: true, index: true },
  type:      { type: String, required: true, enum: ['page_view', 'click'], index: true },
  url:       { type: String, required: true },
  path:      { type: String, required: true, index: true },
  timestamp: { type: Date,   required: true, index: true },
  receivedAt:{ type: Date,   required: true, default: () => new Date() },

  x:         { type: Number, default: null },
  y:         { type: Number, default: null },
  pageX:     { type: Number, default: null },
  pageY:     { type: Number, default: null },
  viewportW: { type: Number, default: null },
  viewportH: { type: Number, default: null },
  selector:  { type: String, default: null },

  userAgent: { type: String, default: '' },
  referrer:  { type: String, default: null },
}, { versionKey: false });

eventSchema.index({ sessionId: 1, timestamp: 1 });
eventSchema.index({ path: 1, type: 1 });
eventSchema.index({ receivedAt: -1 });

export type EventDoc = InferSchemaType<typeof eventSchema>;
export const EventModel: Model<EventDoc> = model<EventDoc>('Event', eventSchema);
