import type { ReactNode } from 'react';

type IconName =
  | 'back'
  | 'cross'
  | 'check'
  | 'heart'
  | 'play'
  | 'trash'
  | 'info'
  | 'search'
  | 'home'
  | 'compass'
  | 'library'
  | 'user'
  | 'signout'
  | 'chevron';

/**
 * A small, consistent icon set drawn on a 24x24 grid with round joins, so every
 * icon shares the same weight and optical size.
 */
const SHAPES: Record<IconName, ReactNode> = {
  back: <path d="M19 12H5m0 0 7-7m-7 7 7 7" />,
  cross: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="M20 6 9 17l-5-5" />,
  heart: (
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
  ),
  play: <path d="M6 4.5v15l13-7.5z" />,
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M6 6v14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  home: <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  library: (
    <>
      <path d="M4 4h4v16H4zM10 4h3v16h-3z" />
      <path d="m16.2 5 3.4.9-3.6 14.1-3.4-.9z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21c0-3.3 3.1-6 7-6s7 2.7 7 6" />
    </>
  ),
  signout: <path d="M15 17v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2M11 12h10m0 0-3-3m3 3-3 3" />,
  chevron: <path d="m6 9 6 6 6-6" />,
};

export function Icon({
  name,
  size = 20,
  filled = false,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  filled?: boolean;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {SHAPES[name]}
    </svg>
  );
}
