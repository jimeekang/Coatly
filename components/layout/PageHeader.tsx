import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  description,
  action,
  backHref,
  backLabel = 'Back',
  className,
}: PageHeaderProps) {
  const supportingText = subtitle ?? description;

  return (
    <header
      className={cn(
        'flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {backHref && (
          <Link
            href={backHref}
            className="mb-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {backLabel}
          </Link>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
          {title}
        </h1>
        {supportingText && (
          <p className="mt-1 text-sm font-medium text-on-surface-variant sm:text-base">
            {supportingText}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}

type PrimaryActionLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function PrimaryActionLink({ href, children, className }: PrimaryActionLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-5',
        className,
      )}
    >
      {children}
    </Link>
  );
}

type SecondaryActionLinkProps = PrimaryActionLinkProps;

export function SecondaryActionLink({
  href,
  children,
  className,
}: SecondaryActionLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant bg-surface-container px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-5',
        className,
      )}
    >
      {children}
    </Link>
  );
}
