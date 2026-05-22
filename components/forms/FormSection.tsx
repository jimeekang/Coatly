'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function FormSection({
  title,
  subtitle,
  children,
  className,
  headerClassName,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:p-6',
        className,
      )}
    >
      {title && (
        <div className={cn('mb-4', headerClassName)}>
          <h2 className="text-base font-semibold text-on-surface">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-on-surface-variant">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
