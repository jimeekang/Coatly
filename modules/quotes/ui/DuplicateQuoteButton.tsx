'use client';

import { useState, useTransition } from 'react';
import { duplicateQuote } from '@/modules/quotes/application/actions';
import { ErrorAlert } from '@/components/shared/ErrorAlert';

type Props = {
  quoteId: string;
  /** 'full' = labelled button, 'icon' = compact icon-only for list cards */
  variant?: 'full' | 'icon';
};

function DuplicateIcon({ pending }: { pending: boolean }) {
  if (pending) {
    return (
      <svg
        className="animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function DuplicateQuoteButton({ quoteId, variant = 'full' }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDuplicate(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setError(null);
    startTransition(async () => {
      const result = await duplicateQuote(quoteId);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={handleDuplicate}
          disabled={isPending}
          title="Duplicate quote"
          aria-label="Duplicate quote"
          className="border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-container-high focus-visible:ring-primary/30 active:bg-surface-container-highest flex h-11 w-11 items-center justify-center rounded-xl border transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
        >
          <DuplicateIcon pending={isPending} />
        </button>
        {error ? (
          <ErrorAlert className="absolute top-full right-0 z-50 mt-2 w-64 shadow-lg">
            {error}
          </ErrorAlert>
        ) : null}
      </div>
    );
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={isPending}
        className="border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container focus-visible:ring-primary/30 active:bg-surface-container inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
      >
        <DuplicateIcon pending={isPending} />
        {isPending ? 'Duplicating…' : 'Duplicate & Edit'}
      </button>
      {error ? <ErrorAlert className="mt-2">{error}</ErrorAlert> : null}
    </div>
  );
}
