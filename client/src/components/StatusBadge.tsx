import { STATUS_LABELS, type GameStatus } from '../api/types';

const STYLES: Record<GameStatus, string> = {
  WANT_TO_PLAY: 'bg-accent/15 text-accent-soft',
  PLAYING: 'bg-mint/15 text-mint',
  PLAYED: 'bg-sky-400/15 text-sky-300',
  NOT_INTERESTED: 'bg-white/8 text-slate-400',
};

export function StatusBadge({ status }: { status: GameStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide ${STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
