import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ErrorAlertProps = {
  children: ReactNode;
  className?: string;
};

export function ErrorAlert({ children, className }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'border-error/20 bg-error-container text-on-error-container rounded-xl border px-4 py-3 text-sm',
        className
      )}
    >
      {children}
    </div>
  );
}
