export const GAME_STATUSES = ['WANT_TO_PLAY', 'PLAYING', 'PLAYED', 'NOT_INTERESTED'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

/** A game as PLAYR stores and returns it. Shared shape between IGDB and the database. */
export type Game = {
  id: number;
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
  game: Game;
  status: GameStatus;
  rating: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
