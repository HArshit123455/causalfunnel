import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger.js';

export type ErrorCode =
  | 'VALIDATION_FAILED' | 'NOT_FOUND' | 'RATE_LIMITED' | 'INTERNAL';

export function errorEnvelope(code: ErrorCode, message: string, extras: object = {}) {
  return { error: { code, message, ...extras } };
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json(errorEnvelope('NOT_FOUND', 'route not found'));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json(errorEnvelope('VALIDATION_FAILED', 'invalid payload', { issues: err.issues }));
  }
  logger.error({ err }, 'unhandled error');
  res.status(500).json(errorEnvelope('INTERNAL', 'internal server error'));
}
