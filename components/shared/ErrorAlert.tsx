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
        'rounded-lg border border-error/20 bg-error-container px-4 py-3 text-sm text-on-error-container',
        className,
      )}
    >
      {children}
    </div>
  );
}
