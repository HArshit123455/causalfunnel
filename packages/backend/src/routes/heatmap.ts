import { Router } from 'express';
import { EventModel } from '../models/event.js';
import { errorEnvelope } from '../errors.js';

const MAX_POINTS = 5000;

export const heatmapRouter = Router();

heatmapRouter.get('/api/heatmap', async (req, res, next) => {
  try {
    const path = typeof req.query.path === 'string' ? req.query.path : '';
    if (!path) return res.status(400).json(errorEnvelope('VALIDATION_FAILED', 'path is required'));

    const total = await EventModel.countDocuments({ path, type: 'click' });
    const ratio = total > MAX_POINTS ? total / MAX_POINTS : 1;

    const pipeline: object[] = [
      { $match: { path, type: 'click' } },
      { $project: { _id: 0, x: 1, y: 1, pageX: 1, pageY: 1, viewportW: 1, viewportH: 1 } },
    ];
    if (ratio > 1) pipeline.push({ $sample: { size: MAX_POINTS } });

    const points = await EventModel.aggregate(pipeline);
    res.json({ points, total, sampled: ratio > 1, max: MAX_POINTS });
  } catch (err) { next(err); }
});

heatmapRouter.get('/api/pages', async (_req, res, next) => {
  try {
    const pages = await EventModel.aggregate([
      { $match: { type: 'click' } },
      { $group: { _id: '$path', clickCount: { $sum: 1 } } },
      { $project: { _id: 0, path: '$_id', clickCount: 1 } },
      { $sort: { clickCount: -1 } },
    ]);
    res.json({ pages });
  } catch (err) { next(err); }
});
