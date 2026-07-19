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
        className
      )}
    >
      <div className="min-w-0 flex-1">
        {backHref && (
          <Link
            href={backHref}
            className="text-on-surface-variant hover:text-on-surface focus-visible:ring-primary focus-visible:ring-offset-surface mb-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {backLabel}
          </Link>
        )}
        <h1 className="text-on-surface text-2xl font-extrabold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {supportingText && (
          <p className="text-on-surface-variant mt-1 text-sm font-medium sm:text-base">
            {supportingText}
          </p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {action}
        </div>
      )}
    </header>
  );
}

type PrimaryActionLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function PrimaryActionLink({
  href,
  children,
  className,
}: PrimaryActionLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'bg-primary text-on-primary focus-visible:ring-primary focus-visible:ring-offset-surface inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:px-5',
        className
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
        'border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high focus-visible:ring-primary focus-visible:ring-offset-surface inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:px-5',
        className
      )}
    >
      {children}
    </Link>
  );
}
