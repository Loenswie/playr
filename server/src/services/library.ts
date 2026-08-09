import { query } from '../db/index.js';
import { toGame } from './games.js';
import type { GameStatus, LibraryEntry } from '../types.js';

type EntryRow = {
  status: GameStatus;
  user_rating: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  id: number;
  external_id: string | number;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  background_url: string | null;
  release_date: Date | null;
  rating: number | null;
  genres: string[];
  platforms: string[];
};

const ENTRY_SELECT = `
  SELECT ug.status, ug.rating AS user_rating, ug.notes,
         ug.created_at, ug.updated_at,
         g.id, g.external_id, g.title, g.slug, g.description, g.cover_url,
         g.background_url, g.release_date, g.rating, g.genres, g.platforms
  FROM user_games ug
  JOIN games g ON g.id = ug.game_id`;

function toEntry(row: EntryRow): LibraryEntry {
  return {
    game: toGame(row),
    status: row.status,
    rating: row.user_rating,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * Every read and write is scoped by userId, which always comes from the session.
 * Without an explicit status, rejected games are left out: the user swiped them
 * away, so listing them again is noise. They stay in the table so discovery
 * keeps skipping them.
 */
export async function getLibrary(
  userId: number,
  status?: GameStatus,
): Promise<LibraryEntry[]> {
  const { rows } = status
    ? await query<EntryRow>(
        `${ENTRY_SELECT} WHERE ug.user_id = $1 AND ug.status = $2 ORDER BY ug.updated_at DESC`,
        [userId, status],
      )
    : await query<EntryRow>(
        `${ENTRY_SELECT} WHERE ug.user_id = $1 AND ug.status <> 'NOT_INTERESTED'
         ORDER BY ug.updated_at DESC`,
        [userId],
      );
  return rows.map(toEntry);
}

export async function getEntry(userId: number, gameId: number): Promise<LibraryEntry | null> {
  const { rows } = await query<EntryRow>(
    `${ENTRY_SELECT} WHERE ug.user_id = $1 AND ug.game_id = $2`,
    [userId, gameId],
  );
  return rows[0] ? toEntry(rows[0]) : null;
}

/**
 * Adds a game to the library, or updates it if it is already there.
 * The (user_id, game_id) unique constraint makes this safe against double taps.
 */
export async function upsertEntry(
  userId: number,
  gameId: number,
  fields: { status: GameStatus; rating?: number | null; notes?: string | null },
): Promise<LibraryEntry> {
  await query(
    `INSERT INTO user_games (user_id, game_id, status, rating, notes)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, game_id) DO UPDATE SET
       status = EXCLUDED.status,
       rating = COALESCE(EXCLUDED.rating, user_games.rating),
       notes  = COALESCE(EXCLUDED.notes, user_games.notes),
       updated_at = now()`,
    [userId, gameId, fields.status, fields.rating ?? null, fields.notes ?? null],
  );
  const entry = await getEntry(userId, gameId);
  if (!entry) throw new Error('Library entry disappeared immediately after write');
  return entry;
}

export async function updateEntry(
  userId: number,
  gameId: number,
  fields: { status?: GameStatus; rating?: number | null; notes?: string | null },
): Promise<LibraryEntry | null> {
  const { rowCount } = await query(
    `UPDATE user_games SET
       status = COALESCE($3, status),
       rating = CASE WHEN $4::boolean THEN $5::smallint ELSE rating END,
       notes  = CASE WHEN $6::boolean THEN $7::text ELSE notes END,
       updated_at = now()
     WHERE user_id = $1 AND game_id = $2`,
    [
      userId,
      gameId,
      fields.status ?? null,
      fields.rating !== undefined,
      fields.rating ?? null,
      fields.notes !== undefined,
      fields.notes ?? null,
    ],
  );
  if (!rowCount) return null;
  return getEntry(userId, gameId);
}

export async function removeEntry(userId: number, gameId: number): Promise<boolean> {
  const { rowCount } = await query(
    'DELETE FROM user_games WHERE user_id = $1 AND game_id = $2',
    [userId, gameId],
  );
  return Boolean(rowCount);
}

export type LibraryStats = {
  wantToPlay: number;
  playing: number;
  played: number;
  notInterested: number;
  averageRating: number | null;
};

export async function getStats(userId: number): Promise<LibraryStats> {
  const { rows } = await query<{
    want_to_play: string;
    playing: string;
    played: string;
    not_interested: string;
    average_rating: number | null;
  }>(
    `SELECT
       count(*) FILTER (WHERE status = 'WANT_TO_PLAY')   AS want_to_play,
       count(*) FILTER (WHERE status = 'PLAYING')        AS playing,
       count(*) FILTER (WHERE status = 'PLAYED')         AS played,
       count(*) FILTER (WHERE status = 'NOT_INTERESTED') AS not_interested,
       round(avg(rating)::numeric, 1)                    AS average_rating
     FROM user_games WHERE user_id = $1`,
    [userId],
  );
  const row = rows[0]!;
  return {
    wantToPlay: Number(row.want_to_play),
    playing: Number(row.playing),
    played: Number(row.played),
    notInterested: Number(row.not_interested),
    averageRating: row.average_rating === null ? null : Number(row.average_rating),
  };
}

/**
 * Picks a game from the backlog, biased towards games that have been waiting
 * longest. Deliberately simple - it should feel fun, not clever.
 */
export async function pickNextGame(userId: number): Promise<LibraryEntry | null> {
  const { rows } = await query<EntryRow>(
    `${ENTRY_SELECT}
     WHERE ug.user_id = $1 AND ug.status = 'WANT_TO_PLAY'
     ORDER BY random() * (1.0 / (1 + extract(epoch FROM now() - ug.created_at) / 86400.0))
     LIMIT 1`,
    [userId],
  );
  return rows[0] ? toEntry(rows[0]) : null;
}
