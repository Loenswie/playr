import type { Game, GameStatus, LibraryEntry, LibraryStats, User } from './types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      // The session lives in an HttpOnly cookie, so every request must send it.
      // 'include' also covers the optional split-origin deployment.
      credentials: 'include',
      headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    });
  } catch {
    throw new ApiError(0, "Can't reach PLAYR. Check your connection and try again.");
  }

  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new ApiError(response.status, body?.error ?? 'Something went wrong.');
  }
  return body as T;
}

const json = (data: unknown) => ({ body: JSON.stringify(data) });

export const api = {
  register: (email: string, username: string, password: string) =>
    apiFetch<{ user: User }>('/auth/register', { method: 'POST', ...json({ email, username, password }) }),

  login: (email: string, password: string) =>
    apiFetch<{ user: User }>('/auth/login', { method: 'POST', ...json({ email, password }) }),

  logout: () => apiFetch<void>('/auth/logout', { method: 'POST' }),

  me: () => apiFetch<{ user: User }>('/auth/me'),

  discover: (offset = 0, limit = 15) =>
    apiFetch<{ games: Game[]; source: string }>(`/games/discover?offset=${offset}&limit=${limit}`),

  search: (term: string) =>
    apiFetch<{ games: Game[]; source: string }>(`/games/search?q=${encodeURIComponent(term)}`),

  game: (externalId: number) => apiFetch<{ game: Game }>(`/games/${externalId}`),

  library: (status?: GameStatus) =>
    apiFetch<{ entries: LibraryEntry[] }>(`/library${status ? `?status=${status}` : ''}`),

  stats: () => apiFetch<{ stats: LibraryStats }>('/library/stats'),

  nextGame: () => apiFetch<{ entry: LibraryEntry | null }>('/library/next'),

  addToLibrary: (externalId: number, status: GameStatus, rating?: number | null) =>
    apiFetch<{ entry: LibraryEntry }>('/library', {
      method: 'POST',
      ...json({ externalId, status, ...(rating === undefined ? {} : { rating }) }),
    }),

  updateEntry: (
    gameId: number,
    fields: { status?: GameStatus; rating?: number | null; notes?: string | null },
  ) => apiFetch<{ entry: LibraryEntry }>(`/library/${gameId}`, { method: 'PATCH', ...json(fields) }),

  removeEntry: (gameId: number) => apiFetch<void>(`/library/${gameId}`, { method: 'DELETE' }),
};
