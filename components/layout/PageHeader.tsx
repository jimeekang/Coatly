import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm font-medium text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
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
        'inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-opacity hover:opacity-90 sm:px-5',
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
        'inline-flex min-h-11 items-center justify-center rounded-lg border border-outline-variant bg-surface-container px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high sm:px-5',
        className,
      )}
    >
      {children}
    </Link>
  );
}
