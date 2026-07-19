import Link from 'next/link';
import { cn } from '@/lib/utils';

type BackLinkProps = {
  href: string;
  label: string;
  className?: string;
};

/**
 * Text-style back link ("← All invoices") used at the top of detail and
 * create screens. Matches the Coatly Design System invoice surfaces.
 */
export function BackLink({ href, label, className }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'text-on-surface-variant hover:text-on-surface focus-visible:ring-primary focus-visible:ring-offset-surface inline-flex min-h-11 items-center gap-1.5 rounded-xl text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        className
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </Link>
  );
}
