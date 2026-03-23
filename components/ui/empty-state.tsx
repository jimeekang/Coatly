import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center rounded-xl border border-dashed border-pm-border',
        'bg-pm-surface px-6 py-16 text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-pm-border bg-white text-pm-secondary">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-pm-body">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-pm-secondary">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
