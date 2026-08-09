import type { GameStatus } from '../api/types';
import { Icon } from './Icon';

// "Not interested" is deliberately absent: on a game you already own, removing it
// from the library is the same action, so showing both was confusing.
const CHOICES = [
  {
    status: 'WANT_TO_PLAY',
    label: 'Want to play',
    icon: 'heart',
    idle: 'border-mint/30 bg-mint/5 text-mint hover:bg-mint/15',
    active: 'border-mint bg-mint/25 text-mint',
  },
  {
    status: 'PLAYING',
    label: 'Playing',
    icon: 'play',
    idle: 'border-accent/30 bg-accent/5 text-accent-soft hover:bg-accent/15',
    active: 'border-accent bg-accent/30 text-white',
  },
  {
    status: 'PLAYED',
    label: 'Played',
    icon: 'check',
    idle: 'border-sky-400/30 bg-sky-400/5 text-sky-300 hover:bg-sky-400/15',
    active: 'border-sky-400 bg-sky-400/25 text-sky-200',
  },
] as const;

type StatusPickerProps = {
  value?: GameStatus | null;
  onChange: (status: GameStatus) => void;
  disabled?: boolean;
  /** Compact is for dense lists such as search results. */
  compact?: boolean;
};

export function StatusPicker({ value, onChange, disabled, compact }: StatusPickerProps) {
  if (compact) {
    return (
      <div className="flex gap-1.5">
        {CHOICES.map((choice) => (
          <button
            key={choice.status}
            type="button"
            disabled={disabled}
            aria-pressed={value === choice.status}
            aria-label={choice.label}
            title={choice.label}
            onClick={() => onChange(choice.status)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition
              disabled:opacity-40 ${value === choice.status ? choice.active : choice.idle}`}
          >
            <Icon name={choice.icon} size={18} filled={value === choice.status} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {CHOICES.map((choice) => (
        <button
          key={choice.status}
          type="button"
          disabled={disabled}
          aria-pressed={value === choice.status}
          onClick={() => onChange(choice.status)}
          className={`flex flex-col items-center justify-center gap-1 rounded-2xl border py-3
            transition active:scale-95 disabled:opacity-40 ${
              value === choice.status ? choice.active : choice.idle
            }`}
        >
          <Icon name={choice.icon} size={24} filled={value === choice.status} />
          <span className="text-[11px] font-medium">{choice.label}</span>
        </button>
      ))}
    </div>
  );
}
