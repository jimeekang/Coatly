import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={[
        'border-outline-variant flex flex-col items-center rounded-2xl border border-dashed',
        'bg-surface-container-low px-6 py-16 text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon && (
        <div className="border-outline bg-surface-container-lowest text-on-surface-variant mb-4 flex h-14 w-14 items-center justify-center rounded-full border">
          {icon}
        </div>
      )}
      <p className="text-on-surface text-base font-semibold">{title}</p>
      {description && (
        <p className="text-on-surface-variant mt-1.5 max-w-xs text-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
