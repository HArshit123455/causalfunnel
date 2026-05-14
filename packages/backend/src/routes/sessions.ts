import { Router } from 'express';
import { EventModel } from '../models/event.js';

export const sessionsRouter = Router();

sessionsRouter.get('/api/sessions', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 200);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const search = String(req.query.search ?? '').trim();

    const match: Record<string, unknown> = {};
    if (search) match.sessionId = { $regex: search, $options: 'i' };

    const [agg] = await EventModel.aggregate([
      { $match: match },
      { $group: {
          _id: '$sessionId',
          firstSeen: { $min: '$timestamp' },
          lastSeen:  { $max: '$timestamp' },
          eventCount:{ $sum: 1 },
          pages:     { $addToSet: '$path' },
        } },
      { $project: {
          _id: 0,
          sessionId: '$_id',
          firstSeen: 1, lastSeen: 1, eventCount: 1,
          pageCount: { $size: '$pages' },
          durationMs: { $subtract: ['$lastSeen', '$firstSeen'] },
        } },
      { $sort: { lastSeen: -1 } },
      { $facet: {
          sessions: [{ $skip: offset }, { $limit: limit }],
          totalArr: [{ $count: 'n' }],
        } },
    ]);

    const total = agg?.totalArr?.[0]?.n ?? 0;
    res.json({ sessions: agg?.sessions ?? [], total, limit, offset });
  } catch (err) { next(err); }
});

sessionsRouter.get('/api/sessions/:id/events', async (req, res, next) => {
  try {
    const events = await EventModel.find({ sessionId: req.params.id })
      .sort({ timestamp: 1, receivedAt: 1 })
      .lean();
    res.json({ events });
  } catch (err) { next(err); }
});
