import type { ReactNode } from 'react';

/** Small pill used for genres and platforms, instead of comma-separated text. */
export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        tone === 'accent'
          ? 'bg-accent/15 text-accent-soft'
          : 'border border-white/8 bg-white/5 text-slate-300'
      }`}
    >
      {children}
    </span>
  );
}

/** "17 September 2020" rather than "2020-09-17". */
export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
