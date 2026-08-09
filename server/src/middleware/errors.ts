import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { config } from '../config.js';
import { IgdbUnavailableError } from '../services/igdb.js';

/** Thrown by routes for expected, client-safe failures. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found.' });
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Invalid request.',
      details: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  // express.json() rejects oversized or malformed payloads before any route runs.
  const bodyErrorType = (error as { type?: string }).type;
  if (bodyErrorType === 'entity.too.large') {
    res.status(413).json({ error: 'That request is too large.' });
    return;
  }
  if (bodyErrorType === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  if (error instanceof IgdbUnavailableError) {
    res.status(503).json({ error: error.message });
    return;
  }

  // Anything unrecognised is a bug: log it server-side, tell the client nothing.
  console.error(
    JSON.stringify({
      level: 'error',
      method: req.method,
      path: req.path,
      userId: req.userId ?? null,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: config.isProduction ? undefined : (error as Error)?.stack,
    }),
  );
  res.status(500).json({
    error: 'Something went wrong.',
    // Production clients get nothing beyond the generic message.
    ...(config.isProduction
      ? {}
      : { detail: error instanceof Error ? error.message : String(error) }),
  });
}

/** Wraps an async route so rejected promises reach the error handler. */
export function route<T extends Request>(
  handler: (req: T, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req as T, res).catch(next);
  };
}
