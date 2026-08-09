import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { HttpError, route } from '../middleware/errors.js';
import { igdbLimiter } from '../middleware/rateLimit.js';
import {
  findGameByExternalId,
  getClassifiedExternalIds,
  getLocalDiscoveryGames,
  searchLocalGames,
} from '../services/games.js';
import * as igdb from '../services/igdb.js';

const discoverSchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(15),
  offset: z.coerce.number().int().min(0).max(500).default(0),
});

const searchSchema = z.object({
  q: z.string().trim().min(2, 'Search for at least 2 characters.').max(80),
  limit: z.coerce.number().int().min(1).max(30).default(20),
});

export const gamesRouter = Router();

gamesRouter.use(requireAuth, igdbLimiter);

/**
 * Discovery excludes games the user already classified. The filtering happens
 * server-side so the client can never be tricked into re-showing a rejected game.
 */
gamesRouter.get(
  '/discover',
  route(async (req, res) => {
    const { limit, offset } = discoverSchema.parse(req.query);
    const userId = req.userId!;

    if (!igdb.isIgdbConfigured) {
      res.json({ games: await getLocalDiscoveryGames(userId, limit), source: 'local' });
      return;
    }

    const classified = await getClassifiedExternalIds(userId);
    const games = await igdb.discoverGames(classified, limit, offset);
    res.json({ games, source: 'igdb' });
  }),
);

gamesRouter.get(
  '/search',
  route(async (req, res) => {
    const { q, limit } = searchSchema.parse(req.query);
    if (!igdb.isIgdbConfigured) {
      res.json({ games: await searchLocalGames(q, limit), source: 'local' });
      return;
    }
    res.json({ games: await igdb.searchGames(q, limit), source: 'igdb' });
  }),
);

/** :id is an IGDB id. Locally stored copies are preferred to avoid an API call. */
gamesRouter.get(
  '/:externalId',
  route(async (req, res) => {
    const externalId = z.coerce.number().int().positive().parse(req.params.externalId);

    const local = await findGameByExternalId(externalId);
    if (local) {
      res.json({ game: local });
      return;
    }

    if (!igdb.isIgdbConfigured) throw new HttpError(404, 'Game not found.');

    const game = await igdb.getGameByExternalId(externalId);
    if (!game) throw new HttpError(404, 'Game not found.');
    res.json({ game });
  }),
);
