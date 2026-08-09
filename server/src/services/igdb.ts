import { config, igdbConfigured } from '../config.js';
import type { Game } from '../types.js';

const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const API_URL = 'https://api.igdb.com/v4';
const IMAGE_URL = 'https://images.igdb.com/igdb/image/upload';

export class IgdbUnavailableError extends Error {
  constructor(message = 'Game discovery is temporarily unavailable.') {
    super(message);
    this.name = 'IgdbUnavailableError';
  }
}

// --- Raw IGDB shapes (only the fields PLAYR asks for) -----------------------

type IgdbImage = { image_id?: string };
type IgdbNamed = { name?: string; abbreviation?: string };

type IgdbGame = {
  id: number;
  name?: string;
  slug?: string;
  summary?: string;
  first_release_date?: number;
  total_rating?: number;
  cover?: IgdbImage;
  artworks?: IgdbImage[];
  screenshots?: IgdbImage[];
  genres?: IgdbNamed[];
  platforms?: IgdbNamed[];
};

const GAME_FIELDS =
  'fields name, slug, summary, first_release_date, total_rating, cover.image_id, ' +
  'artworks.image_id, screenshots.image_id, genres.name, platforms.name, platforms.abbreviation;';

// --- Twitch app token -------------------------------------------------------

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const params = new URLSearchParams({
    client_id: config.igdb.clientId ?? '',
    client_secret: config.igdb.clientSecret ?? '',
    grant_type: 'client_credentials',
  });

  const response = await postOrFail(`${TOKEN_URL}?${params.toString()}`, {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new IgdbUnavailableError();

  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new IgdbUnavailableError();

  // Refresh a minute early so an in-flight request never uses an expired token.
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + Math.max(0, (body.expires_in ?? 3600) - 60) * 1000,
  };
  return cachedToken.value;
}

// --- Request throttling + response cache ------------------------------------

// IGDB allows roughly 4 requests per second. Serialising with a small gap keeps
// PLAYR comfortably inside that budget without a queueing library.
const MIN_REQUEST_GAP_MS = 260;
let nextRequestAt = 0;

async function waitForSlot(): Promise<void> {
  const now = Date.now();
  const startAt = Math.max(now, nextRequestAt);
  nextRequestAt = startAt + MIN_REQUEST_GAP_MS;
  if (startAt > now) await new Promise((resolve) => setTimeout(resolve, startAt - now));
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
type CachedGame = Omit<Game, 'id'>;
const cache = new Map<string, { expiresAt: number; games: CachedGame[] }>();

function readCache(key: string): CachedGame[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.games;
}

function writeCache(key: string, games: CachedGame[]): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, games });
}

/** Logs why IGDB rejected a request. Never logs the token or client secret. */
function logIgdbFailure(endpoint: string, status: number, responseBody: string, query: string): void {
  console.error(
    JSON.stringify({
      level: 'error',
      source: 'igdb',
      endpoint,
      status,
      response: responseBody.slice(0, 500),
      query,
    }),
  );
}

/** fetch(), but a network-level failure becomes an IgdbUnavailableError. */
async function postOrFail(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new IgdbUnavailableError();
  }
}

async function igdbQuery(endpoint: string, body: string): Promise<IgdbGame[]> {
  const token = await getAccessToken();
  await waitForSlot();

  const response = await postOrFail(`${API_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': config.igdb.clientId ?? '',
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body,
    signal: AbortSignal.timeout(8000),
  });

  if (response.status === 401) {
    cachedToken = null; // Token was rejected; force a refresh on the next call.
    logIgdbFailure(endpoint, response.status, await response.text().catch(() => ''), body);
    throw new IgdbUnavailableError();
  }
  if (!response.ok) {
    logIgdbFailure(endpoint, response.status, await response.text().catch(() => ''), body);
    throw new IgdbUnavailableError();
  }

  try {
    return (await response.json()) as IgdbGame[];
  } catch {
    throw new IgdbUnavailableError();
  }
}

// --- Normalisation ----------------------------------------------------------

function imageUrl(size: string, image?: IgdbImage): string | null {
  return image?.image_id ? `${IMAGE_URL}/t_${size}/${image.image_id}.jpg` : null;
}

function normalise(game: IgdbGame): Omit<Game, 'id'> | null {
  if (!game.name) return null;
  return {
    externalId: game.id,
    title: game.name,
    slug: game.slug ?? String(game.id),
    description: game.summary ?? null,
    // t_cover_big is 264x374 - large enough for cards, small enough for mobile data.
    coverUrl: imageUrl('cover_big', game.cover),
    backgroundUrl:
      imageUrl('1080p', game.artworks?.[0]) ?? imageUrl('1080p', game.screenshots?.[0]),
    releaseDate: game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10)
      : null,
    // IGDB scores games out of 100; PLAYR shows everything on a 10-point scale.
    rating: typeof game.total_rating === 'number' ? Math.round(game.total_rating) / 10 : null,
    genres: (game.genres ?? []).map((g) => g.name).filter((n): n is string => Boolean(n)),
    platforms: (game.platforms ?? [])
      .map((p) => p.abbreviation ?? p.name)
      .filter((n): n is string => Boolean(n)),
  };
}

function normaliseAll(games: IgdbGame[]): Omit<Game, 'id'>[] {
  return games.map(normalise).filter((game): game is Omit<Game, 'id'> => game !== null);
}

/**
 * IGDB's APIcalypse syntax is newline/semicolon delimited, so anything the user
 * typed is stripped of those characters and quotes before being interpolated.
 */
function escapeSearchTerm(term: string): string {
  return term
    .replace(/["\\;\r\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

// --- Public API -------------------------------------------------------------

export const isIgdbConfigured = igdbConfigured;

/**
 * IGDB is retiring `category` in favour of `game_type`, and on some accounts
 * `category = 0` already matches nothing while still being a valid field - which
 * comes back as an empty 200 rather than an error. Instead of guessing which
 * schema is live, the strict filter is tried first and the relaxed one is used
 * only if it returns nothing. Both use fields that have existed for years, so
 * neither can fail with "invalid field".
 */
const DISCOVER_FILTERS = [
  'category = 0 & version_parent = null & cover != null & total_rating_count > 40 & total_rating != null',
  'cover != null & total_rating_count > 40 & total_rating != null',
];

const SEARCH_FILTERS = ['category = 0 & version_parent = null', 'cover != null'];

let reportedFallback = false;

function noteFallback(kind: string): void {
  if (reportedFallback) return;
  reportedFallback = true;
  console.log(
    JSON.stringify({
      level: 'info',
      source: 'igdb',
      message: `${kind}: the category filter matched nothing, using the relaxed filter instead`,
    }),
  );
}

/** Popular, well-rated games, excluding ids the user already classified. */
export async function discoverGames(
  excludeExternalIds: readonly number[],
  limit: number,
  offset: number,
): Promise<Omit<Game, 'id'>[]> {
  // These ids come from our own database, but they are interpolated into the
  // query string, so they are re-checked as integers before use.
  const safeIds = excludeExternalIds.filter(Number.isInteger).slice(0, 500);
  const exclusion = safeIds.length ? ` & id != (${safeIds.join(',')})` : '';

  // Only the unfiltered query is cached; per-user exclusion lists are unique.
  const key = `discover:${limit}:${offset}`;
  if (!exclusion) {
    const cached = readCache(key);
    if (cached) return cached;
  }

  let games: Omit<Game, 'id'>[] = [];
  for (const [index, filter] of DISCOVER_FILTERS.entries()) {
    const body =
      `${GAME_FIELDS}\nwhere ${filter}${exclusion};\n` +
      `sort total_rating desc;\nlimit ${limit};\noffset ${offset};`;
    games = normaliseAll(await igdbQuery('games', body));
    if (games.length > 0) {
      if (index > 0) noteFallback('discover');
      break;
    }
  }

  if (!exclusion && games.length > 0) writeCache(key, games);
  return games;
}

export async function searchGames(term: string, limit: number): Promise<Omit<Game, 'id'>[]> {
  const safeTerm = escapeSearchTerm(term);
  if (!safeTerm) return [];

  const key = `search:${safeTerm.toLowerCase()}:${limit}`;
  const cached = readCache(key);
  if (cached) return cached;

  let games: Omit<Game, 'id'>[] = [];
  for (const [index, filter] of SEARCH_FILTERS.entries()) {
    const body = `search "${safeTerm}";\n${GAME_FIELDS}\nwhere ${filter};\nlimit ${limit};`;
    games = normaliseAll(await igdbQuery('games', body));
    if (games.length > 0) {
      if (index > 0) noteFallback('search');
      break;
    }
  }

  if (games.length > 0) writeCache(key, games);
  return games;
}

export async function getGameByExternalId(externalId: number): Promise<Omit<Game, 'id'> | null> {
  const body = `${GAME_FIELDS}\nwhere id = ${Math.trunc(externalId)};\nlimit 1;`;
  const [game] = normaliseAll(await igdbQuery('games', body));
  return game ?? null;
}
