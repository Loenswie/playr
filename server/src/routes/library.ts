import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { HttpError, route } from '../middleware/errors.js';
import { findGameByExternalId, saveGame } from '../services/games.js';
import * as igdb from '../services/igdb.js';
import {
  getLibrary,
  getStats,
  pickNextGame,
  removeEntry,
  updateEntry,
  upsertEntry,
} from '../services/library.js';
import { GAME_STATUSES } from '../types.js';

const statusSchema = z.enum(GAME_STATUSES);
// 1-5 stars. See migration 002.
const ratingSchema = z.number().int().min(1).max(5).nullable();
const notesSchema = z.string().max(2000).nullable();

const addSchema = z.object({
  externalId: z.number().int().positive(),
  status: statusSchema,
  rating: ratingSchema.optional(),
  notes: notesSchema.optional(),
});

const updateSchema = z
  .object({
    status: statusSchema.optional(),
    rating: ratingSchema.optional(),
    notes: notesSchema.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update.' });

export const libraryRouter = Router();

// Every endpoint below derives the user from the session cookie. A client-supplied
// user id is never trusted or even read.
libraryRouter.use(requireAuth);

libraryRouter.get(
  '/',
  route(async (req, res) => {
    const status = z.enum(GAME_STATUSES).optional().parse(req.query.status);
    res.json({ entries: await getLibrary(req.userId!, status) });
  }),
);

libraryRouter.get(
  '/stats',
  route(async (req, res) => {
    res.json({ stats: await getStats(req.userId!) });
  }),
);

libraryRouter.get(
  '/next',
  route(async (req, res) => {
    res.json({ entry: await pickNextGame(req.userId!) });
  }),
);

/** Adds a game by IGDB id, storing its metadata locally the first time we see it. */
libraryRouter.post(
  '/',
  route(async (req, res) => {
    const { externalId, status, rating, notes } = addSchema.parse(req.body);

    let game = await findGameByExternalId(externalId);
    if (!game) {
      if (!igdb.isIgdbConfigured) throw new HttpError(404, 'Game not found.');
      const fetched = await igdb.getGameByExternalId(externalId);
      if (!fetched) throw new HttpError(404, 'Game not found.');
      game = await saveGame(fetched);
    }

    const entry = await upsertEntry(req.userId!, game.id, { status, rating, notes });
    res.status(201).json({ entry });
  }),
);

libraryRouter.patch(
  '/:gameId',
  route(async (req, res) => {
    const gameId = z.coerce.number().int().positive().parse(req.params.gameId);
    const fields = updateSchema.parse(req.body);

    const entry = await updateEntry(req.userId!, gameId, fields);
    // A game owned by another user is indistinguishable from one that does not exist.
    if (!entry) throw new HttpError(404, 'That game is not in your library.');
    res.json({ entry });
  }),
);

libraryRouter.delete(
  '/:gameId',
  route(async (req, res) => {
    const gameId = z.coerce.number().int().positive().parse(req.params.gameId);
    const removed = await removeEntry(req.userId!, gameId);
    if (!removed) throw new HttpError(404, 'That game is not in your library.');
    res.status(204).end();
  }),
);
