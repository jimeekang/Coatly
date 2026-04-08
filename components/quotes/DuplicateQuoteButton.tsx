'use client';

import { useTransition } from 'react';
import { duplicateQuote } from '@/app/actions/quotes';

type Props = {
  quoteId: string;
  /** 'full' = labelled button, 'icon' = compact icon-only for list cards */
  variant?: 'full' | 'icon';
};

export function DuplicateQuoteButton({ quoteId, variant = 'full' }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await duplicateQuote(quoteId);
      if (result?.error) {
        alert(result.error);
      }
    });
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={isPending}
        title="Duplicate quote"
        aria-label="Duplicate quote"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high active:bg-surface-container-highest disabled:opacity-50"
      >
        {isPending ? (
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
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
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
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={isPending}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-pm-border bg-white px-4 py-3 text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface active:bg-pm-surface disabled:opacity-60"
    >
      {isPending ? (
        <>
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
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Duplicating…
        </>
      ) : (
        <>
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
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Duplicate &amp; Edit
        </>
      )}
    </button>
  );
}
