import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

const message = { error: 'Too many requests. Please slow down and try again shortly.' };

// Rate limiting would make the test suite flaky, so it is disabled under NODE_ENV=test
// except where a test explicitly exercises it.
const skip = () => config.isTest && process.env.ENABLE_RATE_LIMIT !== 'true';

/** Strict limit for credential endpoints, to slow down brute-force attempts. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
  skip,
});

/** Protects the IGDB proxy so Playr never hammers the upstream API. */
export const igdbLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
  skip,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
  skip,
});
