import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

const VARIANTS = {
  primary: 'bg-accent text-white hover:bg-accent-soft shadow-glow',
  secondary: 'bg-white/10 text-slate-100 hover:bg-white/15',
  ghost: 'text-slate-300 hover:text-white hover:bg-white/5',
  danger: 'bg-rose/15 text-rose hover:bg-rose/25',
} as const;

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
} as const;

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium
        transition duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  );
}
