import { Link } from 'react-router-dom';
import type { Game, GameStatus } from '../api/types';
import { Rating } from './Rating';
import { StatusBadge } from './StatusBadge';

type GameCardProps = {
  game: Game;
  status?: GameStatus;
  rating?: number | null;
};

export function GameCard({ game, status, rating }: GameCardProps) {
  const year = game.releaseDate?.slice(0, 4);

  return (
    <Link
      to={`/game/${game.externalId}`}
      className="group block focus-visible:ring-offset-4"
      aria-label={`${game.title}${year ? `, ${year}` : ''}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-ink-800 shadow-card">
        {game.coverUrl ? (
          <img
            src={game.coverUrl}
            alt={`${game.title} cover art`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-500">
            {game.title}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
        {rating != null && (
          <span className="absolute right-2 top-2 rounded-lg bg-black/70 px-1.5 py-1 backdrop-blur">
            <Rating value={rating} />
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-1.5">
        <p className="truncate text-sm font-medium text-slate-100">{game.title}</p>
        <div className="flex items-center gap-2">
          {status ? (
            <StatusBadge status={status} />
          ) : (
            year && <span className="text-xs text-slate-500">{year}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
