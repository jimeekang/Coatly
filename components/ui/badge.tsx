import { type ReactNode } from 'react';

export type BadgeVariant = 'default' | 'success' | 'approved' | 'warning' | 'danger' | 'info' | 'draft';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT: Record<BadgeVariant, string> = {
  default:  'bg-surface-container-low text-on-surface-variant',
  draft:    'bg-surface-container-low text-on-surface-variant',
  success:  'bg-success-container text-on-success-container',
  approved: 'bg-primary-container text-on-primary-container',
  warning:  'bg-warning-container text-on-warning-container',
  danger:   'bg-error-container text-on-error-container',
  info:     'bg-secondary-container text-on-secondary-container',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded px-2.5 py-1 text-xs font-medium',
        VARIANT[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
