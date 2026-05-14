import { Router } from 'express';
import { TrackingEvent } from '@causalfunnel/shared';
import { EventModel } from '../models/event.js';

const SKEW_MS = 5 * 60 * 1000;

export const eventsRouter = Router();

eventsRouter.post('/api/events', async (req, res, next) => {
  try {
    const body = Array.isArray(req.body) ? req.body : [req.body];
    const parsed = body.map((e) => TrackingEvent.parse(e));
    const now = Date.now();
    const docs = parsed.map((e) => ({
      ...e,
      timestamp: e.timestamp.getTime() > now + SKEW_MS ? new Date(now) : e.timestamp,
      receivedAt: new Date(),
    }));
    await EventModel.insertMany(docs, { ordered: false });
    res.status(202).json({ ok: true, count: docs.length });
  } catch (err) {
    next(err);
  }
});
