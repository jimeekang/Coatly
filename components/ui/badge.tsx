import { type ReactNode } from 'react';

export type BadgeVariant = 'default' | 'success' | 'approved' | 'warning' | 'danger' | 'info' | 'draft';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT: Record<BadgeVariant, string> = {
  default:  'bg-pm-surface text-pm-secondary',
  draft:    'bg-pm-surface text-pm-secondary',
  success:  'bg-pm-teal-light text-pm-teal',
  approved: 'bg-pm-teal-mid text-white',
  warning:  'bg-amber-50 text-amber-700',
  danger:   'bg-pm-coral-light text-pm-coral-mid',
  info:     'bg-blue-50 text-blue-600',
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
