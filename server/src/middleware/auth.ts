import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const SESSION_COOKIE = 'playr_session';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: number;
  }
}

export function issueSession(res: Response, userId: number): void {
  const token = jwt.sign({ sub: String(userId) }, config.sessionSecret, {
    expiresIn: config.sessionMaxAgeMs / 1000,
  });

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true, // Not readable from JavaScript, so XSS cannot steal the session.
    secure: config.isProduction,
    // The frontend is served from the same origin, so Lax also blocks the
    // cross-site POSTs that CSRF relies on.
    sameSite: config.corsOrigin ? 'none' : 'lax',
    maxAge: config.sessionMaxAgeMs,
    path: '/',
  });
}

export function clearSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.corsOrigin ? 'none' : 'lax',
    path: '/',
  });
}

function readUserId(req: Request): number | null {
  const token = (req.cookies as Record<string, string | undefined>)[SESSION_COOKIE];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.sessionSecret) as jwt.JwtPayload;
    const userId = Number(payload.sub);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

/** Attaches req.userId when a valid session cookie is present. Never rejects. */
export function loadSession(req: Request, _res: Response, next: NextFunction): void {
  const userId = readUserId(req);
  if (userId) req.userId = userId;
  next();
}

/** Blocks the request unless a valid session is present. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  next();
}
