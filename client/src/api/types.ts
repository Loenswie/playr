export const GAME_STATUSES = ['WANT_TO_PLAY', 'PLAYING', 'PLAYED', 'NOT_INTERESTED'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export type Game = {
  id?: number;
  externalId: number;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  backgroundUrl: string | null;
  releaseDate: string | null;
  rating: number | null;
  genres: string[];
  platforms: string[];
};

export type LibraryEntry = {
  game: Required<Pick<Game, 'id'>> & Game;
  status: GameStatus;
  rating: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type User = { id: number; email: string; username: string; createdAt: string };

export type LibraryStats = {
  wantToPlay: number;
  playing: number;
  played: number;
  notInterested: number;
  averageRating: number | null;
};

export const STATUS_LABELS: Record<GameStatus, string> = {
  WANT_TO_PLAY: 'Want to play',
  PLAYING: 'Playing',
  PLAYED: 'Played',
  NOT_INTERESTED: 'Not interested',
};

/**
 * Statuses shown in the library. NOT_INTERESTED is intentionally excluded: those
 * games are rejected, so listing them is noise. The server keeps the record so
 * discovery never shows them again.
 */
export const LIBRARY_STATUSES = ['WANT_TO_PLAY', 'PLAYING', 'PLAYED'] as const;

export const STATUS_SLUGS: Record<GameStatus, string> = {
  WANT_TO_PLAY: 'want-to-play',
  PLAYING: 'playing',
  PLAYED: 'played',
  NOT_INTERESTED: 'not-interested',
};
