'use client';

import { useState, useTransition } from 'react';
import { deleteQuote } from '@/app/actions/quotes';

export function DeleteQuoteButton({ quoteId, quoteNumber }: { quoteId: string; quoteNumber: string }) {
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteQuote(quoteId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setShowModal(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-error/40 bg-white px-4 py-3 text-sm font-medium text-error transition-colors hover:bg-error/5 active:bg-error/10"
      >
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
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
        Delete Quote
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setShowModal(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            {/* Warning icon */}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-error"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-pm-body">Delete Quote?</h2>
            <p className="mt-1.5 text-sm text-pm-secondary">
              <span className="font-semibold text-pm-body">{quoteNumber}</span> will be permanently
              deleted. This cannot be undone.
            </p>

            {error && (
              <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
            )}

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-error px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-error/90 disabled:opacity-60"
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
                    Deleting…
                  </>
                ) : (
                  'Yes, Delete Quote'
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isPending}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-pm-border bg-pm-surface px-4 py-3 text-sm font-medium text-pm-body transition-colors hover:bg-pm-border disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
