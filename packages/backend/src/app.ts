import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { healthRouter } from './routes/health.js';
import { eventsRouter } from './routes/events.js';
import { sessionsRouter } from './routes/sessions.js';
import { heatmapRouter } from './routes/heatmap.js';
import { notFound, errorHandler } from './errors.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: (process.env.CORS_ORIGINS ?? '*').split(','), credentials: false }));
  app.use(express.json({ limit: '256kb', type: ['application/json', 'text/plain'] }));

  const eventsLimiter = rateLimit({
    windowMs: 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'too many requests' } }),
  });
  app.use('/api/events', eventsLimiter);

  app.use(healthRouter);
  app.use(eventsRouter);
  app.use(sessionsRouter);
  app.use(heatmapRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
