import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
}

/**
 * Standard page header. Use on every dashboard page so spacing,
 * typography, and alignment stay consistent.
 */
export function PageHeader({
  title,
  description,
  action,
  backHref,
  backLabel = 'Back',
}: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1">
        {backHref && (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            {backLabel}
          </Link>
        )}
        <h1 className="h1-page">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm text-on-surface-variant sm:text-base">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}
