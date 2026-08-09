// The wordmarks live in client/public/logos and are the single source of truth
// for the brand. To change the logo, replace those files: nothing else in the
// app references them, and no size is hard-coded anywhere else.
const SOURCES = {
  white: '/logos/Playr_White.png',
  purple: '/logos/Playr_Purple.png',
  black: '/logos/Playr_Black.png',
} as const;

type LogoProps = {
  /** Rendered height in pixels. Width follows the wordmark's aspect ratio. */
  height?: number;
  variant?: keyof typeof SOURCES;
  className?: string;
};

export function Logo({ height = 24, variant = 'white', className = '' }: LogoProps) {
  return (
    <img
      src={SOURCES[variant]}
      alt="Playr"
      height={height}
      style={{ height }}
      className={`w-auto select-none ${className}`}
      draggable={false}
    />
  );
}
