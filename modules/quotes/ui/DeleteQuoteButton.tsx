'use client';

import { useState, useTransition } from 'react';
import { deleteQuote } from '@/modules/quotes/application/actions';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function DeleteQuoteButton({
  quoteId,
  quoteNumber,
}: {
  quoteId: string;
  quoteNumber: string;
}) {
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
        className="border-error/40 bg-surface-container-lowest text-error hover:bg-error/5 focus-visible:ring-error/30 active:bg-error/10 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
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

      <ConfirmDialog
        open={showModal}
        title="Delete Quote?"
        message={`${quoteNumber} will be permanently deleted. This cannot be undone.`}
        confirmLabel="Yes, Delete Quote"
        confirmPendingLabel="Deleting…"
        destructive
        pending={isPending}
        error={error}
        onConfirm={handleConfirm}
        onCancel={() => setShowModal(false)}
      />
    </>
  );
}
