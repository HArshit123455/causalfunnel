import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { notFound, errorHandler } from './errors.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: (process.env.CORS_ORIGINS ?? '*').split(','), credentials: false }));
  app.use(express.json({ limit: '256kb' }));

  app.use(healthRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
