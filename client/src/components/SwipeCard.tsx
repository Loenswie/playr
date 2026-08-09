import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game, GameStatus } from '../api/types';
import { Icon } from './Icon';
import { Tag } from './Tag';

type SwipeCardProps = {
  game: Game;
  /** Called once the card has committed to a decision. */
  onDecide: (status: GameStatus) => void;
  onOpenDetails: () => void;
  disabled?: boolean;
};

type Direction = 'left' | 'right' | 'up';

const SWIPE_DISTANCE = 110;
const DIRECTION_STATUS: Record<Direction, GameStatus> = {
  left: 'NOT_INTERESTED',
  right: 'WANT_TO_PLAY',
  up: 'PLAYED',
};

/**
 * The artwork a card shows. The stacked preview behind the current card uses the
 * same function, so a card never changes image the moment it moves to the front.
 */
export function cardImage(game: Game): string | null {
  return game.coverUrl ?? game.backgroundUrl;
}

export function SwipeCard({ game, onDecide, onOpenDetails, disabled = false }: SwipeCardProps) {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [leaving, setLeaving] = useState<Direction | null>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);

  const commit = useCallback(
    (direction: Direction) => {
      if (disabled || leaving) return;
      setLeaving(direction);
      // Let the exit animation play before the parent swaps in the next card.
      setTimeout(() => onDecide(DIRECTION_STATUS[direction]), 220);
    },
    [disabled, leaving, onDecide],
  );

  // Keyboard is a first-class input, not a fallback bolted onto gestures.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (event.key === 'ArrowLeft') commit('left');
      if (event.key === 'ArrowRight') commit('right');
      if (event.key === 'ArrowUp') commit('up');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commit]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || leaving) return;
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!start.current || start.current.id !== event.pointerId) return;
    setDrag({ x: event.clientX - start.current.x, y: event.clientY - start.current.y });
  };

  const onPointerUp = () => {
    if (!start.current) return;
    start.current = null;

    if (drag.x > SWIPE_DISTANCE) commit('right');
    else if (drag.x < -SWIPE_DISTANCE) commit('left');
    else if (drag.y < -SWIPE_DISTANCE) commit('up');

    setDrag({ x: 0, y: 0 });
  };

  const exit = leaving
    ? {
        left: 'translate3d(-140%, 0, 0) rotate(-18deg)',
        right: 'translate3d(140%, 0, 0) rotate(18deg)',
        up: 'translate3d(0, -140%, 0)',
      }[leaving]
    : `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${drag.x / 22}deg)`;

  const year = game.releaseDate?.slice(0, 4);
  const hint = drag.x > 60 ? 'right' : drag.x < -60 ? 'left' : drag.y < -60 ? 'up' : null;
  const image = cardImage(game);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        transform: exit,
        opacity: leaving ? 0 : 1,
        transition: start.current
          ? 'none'
          : 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s',
        touchAction: 'none',
      }}
      className="relative h-[min(70dvh,38rem)] w-full select-none overflow-hidden rounded-[28px] bg-ink-800 shadow-card"
    >
      {image ? (
        <img
          src={image}
          alt={`Cover art for ${game.title}`}
          draggable={false}
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-ink-700 to-ink-900" />
      )}

      {/* Multiple stops so the artwork dissolves into the page instead of
          stopping against a hard black band. */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 from-[2%] via-ink-950/85 via-30% to-transparent to-70%" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950 to-transparent" />

      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onOpenDetails}
        aria-label={`View details for ${game.title}`}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full
          bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
      >
        <Icon name="info" />
      </button>

      {hint && !leaving && (
        <span
          aria-hidden="true"
          className={`absolute top-6 rounded-xl border-2 px-3 py-1.5 text-sm font-bold uppercase tracking-widest
            ${hint === 'right' ? 'left-6 -rotate-12 border-mint text-mint' : ''}
            ${hint === 'left' ? 'right-6 rotate-12 border-rose text-rose' : ''}
            ${hint === 'up' ? 'left-1/2 -translate-x-1/2 border-sky-400 text-sky-300' : ''}`}
        >
          {hint === 'right' ? 'Want to play' : hint === 'left' ? 'Nope' : 'Played'}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 space-y-3 p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          {year && <span className="font-medium">{year}</span>}
          {game.rating != null && (
            <span className="rounded-md bg-white/10 px-2 py-0.5 font-semibold text-white">
              {game.rating}
              <span className="font-normal text-slate-400">/10</span>
            </span>
          )}
          {game.platforms.slice(0, 3).map((platform) => (
            <span key={platform} className="rounded-md bg-white/8 px-2 py-0.5">
              {platform}
            </span>
          ))}
        </div>

        <h2 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">{game.title}</h2>

        {game.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {game.genres.slice(0, 3).map((genre) => (
              <Tag key={genre} tone="accent">
                {genre}
              </Tag>
            ))}
          </div>
        )}

        {game.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-300">{game.description}</p>
        )}
      </div>
    </div>
  );
}

const SWIPE_ACTIONS = [
  {
    status: 'NOT_INTERESTED',
    label: 'Not interested',
    icon: 'cross',
    style: 'border-rose/40 bg-rose/10 text-rose hover:bg-rose/20',
  },
  {
    status: 'PLAYED',
    label: 'Played it',
    icon: 'check',
    style: 'border-sky-400/40 bg-sky-400/10 text-sky-300 hover:bg-sky-400/20',
  },
  {
    status: 'WANT_TO_PLAY',
    label: 'Want to play',
    icon: 'heart',
    style: 'border-mint/40 bg-mint/10 text-mint hover:bg-mint/20',
  },
] as const;

/** Button controls, so the experience never depends on gestures. */
export function SwipeControls({
  onDecide,
  disabled,
}: {
  onDecide: (status: GameStatus) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {SWIPE_ACTIONS.map((action) => (
        <button
          key={action.status}
          type="button"
          disabled={disabled}
          onClick={() => onDecide(action.status)}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-4
            transition active:scale-95 disabled:opacity-40 ${action.style}`}
        >
          <Icon
            name={action.icon}
            size={28}
            strokeWidth={action.status === 'WANT_TO_PLAY' ? 1.75 : 2.25}
            filled={action.status === 'WANT_TO_PLAY'}
          />
          <span className="text-xs font-medium">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
