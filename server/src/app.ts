import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { loadSession } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { authRouter } from './routes/auth.js';
import { gamesRouter } from './routes/games.js';
import { libraryRouter } from './routes/library.js';

export function createApp(): express.Express {
  const app = express();

  // Render terminates TLS at its proxy; trusting it makes secure cookies and
  // per-IP rate limiting work correctly.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // IGDB artwork is served from its own CDN.
          imgSrc: ["'self'", 'data:', 'https://images.igdb.com'],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Only enabled when the frontend is deployed to a different origin.
  if (config.corsOrigin) {
    app.use(cors({ origin: config.corsOrigin.split(',').map((o) => o.trim()), credentials: true }));
  }

  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use(loadSession);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/games', gamesRouter);
  app.use('/api/library', libraryRouter);
  app.use('/api', notFound);

  // In production the API also serves the built React app from the same origin.
  const clientDist = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist, { maxAge: '1h', index: false }));
    app.get('*', (_req, res) => {
      res.sendFile(join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
