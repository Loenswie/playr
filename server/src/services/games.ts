import { query } from '../db/index.js';
import type { Game } from '../types.js';

type GameRow = {
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

export function toGame(row: GameRow): Game {
  return {
    id: row.id,
    externalId: Number(row.external_id),
    title: row.title,
    slug: row.slug,
    description: row.description,
    coverUrl: row.cover_url,
    backgroundUrl: row.background_url,
    releaseDate: row.release_date ? row.release_date.toISOString().slice(0, 10) : null,
    rating: row.rating,
    genres: row.genres,
    platforms: row.platforms,
  };
}

const GAME_COLUMNS = `id, external_id, title, slug, description, cover_url,
  background_url, release_date, rating, genres, platforms`;

/**
 * Stores a game the user interacted with, or refreshes its metadata if we
 * already know it. PLAYR only persists games that matter to a user.
 */
export async function saveGame(game: Omit<Game, 'id'>): Promise<Game> {
  const { rows } = await query<GameRow>(
    `INSERT INTO games (external_id, title, slug, description, cover_url,
                        background_url, release_date, rating, genres, platforms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (external_id) DO UPDATE SET
       title = EXCLUDED.title,
       slug = EXCLUDED.slug,
       description = EXCLUDED.description,
       cover_url = EXCLUDED.cover_url,
       background_url = EXCLUDED.background_url,
       release_date = EXCLUDED.release_date,
       rating = EXCLUDED.rating,
       genres = EXCLUDED.genres,
       platforms = EXCLUDED.platforms,
       updated_at = now()
     RETURNING ${GAME_COLUMNS}`,
    [
      game.externalId,
      game.title,
      game.slug,
      game.description,
      game.coverUrl,
      game.backgroundUrl,
      game.releaseDate,
      game.rating,
      game.genres,
      game.platforms,
    ],
  );
  return toGame(rows[0]!);
}

export async function findGameByExternalId(externalId: number): Promise<Game | null> {
  const { rows } = await query<GameRow>(
    `SELECT ${GAME_COLUMNS} FROM games WHERE external_id = $1`,
    [externalId],
  );
  return rows[0] ? toGame(rows[0]) : null;
}

/** External IGDB ids the user has already classified, so discovery can skip them. */
export async function getClassifiedExternalIds(userId: number): Promise<number[]> {
  const { rows } = await query<{ external_id: string | number }>(
    `SELECT g.external_id
     FROM user_games ug
     JOIN games g ON g.id = ug.game_id
     WHERE ug.user_id = $1`,
    [userId],
  );
  return rows.map((row) => Number(row.external_id));
}

/** Local fallback used for discovery when IGDB credentials are not configured. */
export async function getLocalDiscoveryGames(userId: number, limit: number): Promise<Game[]> {
  const { rows } = await query<GameRow>(
    `SELECT ${GAME_COLUMNS} FROM games g
     WHERE NOT EXISTS (
       SELECT 1 FROM user_games ug WHERE ug.game_id = g.id AND ug.user_id = $1
     )
     ORDER BY rating DESC NULLS LAST, id
     LIMIT $2`,
    [userId, limit],
  );
  return rows.map(toGame);
}

export async function searchLocalGames(term: string, limit: number): Promise<Game[]> {
  const { rows } = await query<GameRow>(
    `SELECT ${GAME_COLUMNS} FROM games
     WHERE title ILIKE $1
     ORDER BY rating DESC NULLS LAST
     LIMIT $2`,
    [`%${term}%`, limit],
  );
  return rows.map(toGame);
}
