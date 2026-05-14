import Link from 'next/link';
import { cn } from '@/lib/utils';

type BackButtonProps = {
  href: string;
  label: string;
  className?: string;
};

export function BackButton({ href, label, className }: BackButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-colors hover:bg-primary-container hover:text-on-primary-container active:bg-outline-variant',
        className,
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  );
}
