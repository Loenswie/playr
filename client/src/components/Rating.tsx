type RatingProps = {
  value: number | null;
  onChange?: (value: number) => void;
  label?: string;
};

const MAX = 5;

function Star({ filled, size = 22 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A 1-5 star rating. Read-only when no onChange is given. */
export function Rating({ value, onChange, label = 'Your rating' }: RatingProps) {
  if (!onChange) {
    if (value === null) return null;
    return (
      <span className="inline-flex items-center gap-0.5 text-amber-300" aria-label={`${value} out of ${MAX}`}>
        {Array.from({ length: MAX }, (_, index) => (
          <Star key={index} filled={index < value} size={14} />
        ))}
      </span>
    );
  }

  return (
    <fieldset>
      <legend className="mb-2 text-xs uppercase tracking-widest text-slate-500">{label}</legend>
      <div className="flex items-center gap-1">
        {Array.from({ length: MAX }, (_, index) => index + 1).map((score) => (
          <button
            key={score}
            type="button"
            aria-pressed={value === score}
            aria-label={`Rate ${score} out of ${MAX}`}
            onClick={() => onChange(score)}
            className={`rounded-lg p-1.5 transition hover:scale-110 ${
              value !== null && score <= value
                ? 'text-amber-300'
                : 'text-slate-600 hover:text-amber-200'
            }`}
          >
            <Star filled={value !== null && score <= value} />
          </button>
        ))}
        {value !== null && <span className="ml-2 text-sm text-slate-400">{value}/{MAX}</span>}
      </div>
    </fieldset>
  );
}
