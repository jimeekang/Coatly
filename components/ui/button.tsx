'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-pm-teal text-white hover:bg-pm-teal-hover active:bg-pm-teal-hover',
  secondary:
    'border border-pm-border bg-white text-pm-body hover:bg-pm-surface active:bg-pm-surface',
  ghost:
    'bg-transparent text-pm-teal hover:bg-pm-teal-light active:bg-pm-teal-light',
  destructive:
    'bg-pm-coral text-white hover:bg-pm-coral-mid active:bg-pm-coral-dark',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm rounded-lg',
  md: 'h-12 px-5 text-base rounded-xl',
  lg: 'h-14 px-6 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-pm-teal-pale/50',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANT[variant],
        SIZE[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';