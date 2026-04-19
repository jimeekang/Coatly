'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveQuote, duplicateQuote } from '@/app/actions/quotes';
import { createJobFromQuote } from '@/app/actions/jobs';
import type { QuoteStatus } from '@/lib/quotes';

interface Props {
  quoteId: string;
  quoteNumber: string;
  status: QuoteStatus;
  publicQuoteUrl: string | null;
  hasLinkedInvoices?: boolean;
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export function QuoteActions({
  quoteId,
  quoteNumber,
  status,
  publicQuoteUrl,
  hasLinkedInvoices = false,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [approvePending, startApprove] = useTransition();
  const [jobPending, startJob] = useTransition();
  const [dupPending, startDup] = useTransition();
  const [menuPending, startMenu] = useTransition();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  function handleApprove() {
    setError(null);
    startApprove(async () => {
      const result = await approveQuote(quoteId);
      if (result?.error) setError(result.error);
    });
  }

  function handleConvertToJob() {
    setError(null);
    startJob(async () => {
      const result = await createJobFromQuote(quoteId);
      if (result.error) {
        setError(result.error);
      } else {
        router.push('/jobs');
      }
    });
  }

  function handleDuplicate() {
    setError(null);
    startDup(async () => {
      const result = await duplicateQuote(quoteId);
      if (result?.error) setError(result.error);
    });
  }

  const anyPending = approvePending || jobPending || dupPending || menuPending;

  function handleApproveWithoutSignature() {
    setError(null);
    setIsMoreOpen(false);
    startMenu(async () => {
      const result = await approveQuote(quoteId);
      if (result?.error) setError(result.error);
    });
  }

  function handleApproveAndConvertToJob() {
    setError(null);
    setIsMoreOpen(false);
    startMenu(async () => {
      if (status === 'draft' || status === 'sent') {
        const approveResult = await approveQuote(quoteId);
        if (approveResult?.error) {
          setError(approveResult.error);
          return;
        }
      }

      const jobResult = await createJobFromQuote(quoteId);
      if (jobResult.error) {
        setError(jobResult.error);
        return;
      }
      router.push('/jobs');
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="rounded-lg bg-error/10 px-3 py-2.5 text-sm text-error">{error}</p>
      )}
      {hasLinkedInvoices && (
        <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          Quote editing and deletion are locked after invoice creation.
        </p>
      )}

      {/* Primary CTAs — status-aware */}
      {(status === 'draft' || status === 'sent') && (
        <button
          type="button"
          onClick={handleApprove}
          disabled={anyPending}
          className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-tertiary px-5 text-base font-semibold text-on-tertiary transition-colors hover:bg-tertiary/90 disabled:opacity-50"
        >
          {approvePending ? (
            <><SpinnerIcon /> Approving…</>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Approve Quote
            </>
          )}
        </button>
      )}

      {status === 'approved' && (
        <div className="flex flex-col gap-2.5">
          <Link
            href={`/invoices/new?quoteId=${quoteId}`}
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-base font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Create Invoice
          </Link>
          <button
            type="button"
            onClick={handleConvertToJob}
            disabled={anyPending}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-pm-border bg-white px-5 text-sm font-semibold text-pm-body transition-colors hover:bg-pm-surface disabled:opacity-50"
          >
            {jobPending ? (
              <><SpinnerIcon /> Converting…</>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                Convert to Job
              </>
            )}
          </button>
        </div>
      )}

      {/* Secondary utility row */}
      <div className={`grid gap-2 ${publicQuoteUrl ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {/* More */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMoreOpen((prev) => !prev)}
            disabled={anyPending}
            aria-expanded={isMoreOpen}
            aria-haspopup="menu"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container px-2 py-3 text-[11px] font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
            More
          </button>
          {isMoreOpen && (
            <div
              role="menu"
              className="absolute left-0 z-20 mt-2 w-64 rounded-xl border border-outline-variant bg-white p-2 shadow-lg"
            >
              {(status === 'draft' || status === 'sent') && (
                <button
                  type="button"
                  onClick={handleApproveWithoutSignature}
                  className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  Approve without signature
                </button>
              )}
              <button
                type="button"
                onClick={handleApproveAndConvertToJob}
                className="mt-1 flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
              >
                {status === 'approved' ? 'Convert to Job' : 'Approve and convert to job'}
              </button>
            </div>
          )}
        </div>

        {/* PDF */}
        <Link
          href={`/api/pdf/quote?id=${quoteId}`}
          target="_blank"
          className="flex flex-col items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container px-2 py-3 text-[11px] font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          PDF
        </Link>

        {/* Client page — only shown when URL exists */}
        {publicQuoteUrl && (
          <Link
            href={publicQuoteUrl}
            target="_blank"
            className="flex flex-col items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container px-2 py-3 text-[11px] font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Client
          </Link>
        )}

        {/* Duplicate */}
        <button
          type="button"
          onClick={handleDuplicate}
          disabled={anyPending}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container px-2 py-3 text-[11px] font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-50"
        >
          {dupPending ? <SpinnerIcon /> : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
          Copy
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          disabled={anyPending || hasLinkedInvoices}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-error/30 bg-error/5 px-2 py-3 text-[11px] font-semibold text-error transition-colors hover:bg-error/10 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6M9 6V4h6v2" />
          </svg>
          Delete
        </button>
      </div>

      {/* Delete confirm modal */}
      {showDeleteModal && !hasLinkedInvoices && (
        <DeleteModal
          quoteNumber={quoteNumber}
          quoteId={quoteId}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}

function DeleteModal({
  quoteId,
  quoteNumber,
  onClose,
}: {
  quoteId: string;
  quoteNumber: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Dynamic import to avoid circular dep — deleteQuote is from quotes.ts which is already imported above
  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const { deleteQuote } = await import('@/app/actions/quotes');
      const result = await deleteQuote(quoteId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push('/quotes');
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-error">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-pm-body">Delete Quote?</h2>
        <p className="mt-1.5 text-sm text-pm-secondary">
          <span className="font-semibold text-pm-body">{quoteNumber}</span> will be permanently deleted. This cannot be undone.
        </p>
        {error && (
          <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
        )}
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-error px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-error/90 disabled:opacity-60"
          >
            {isPending ? <><SpinnerIcon /> Deleting…</> : 'Yes, Delete Quote'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-pm-border bg-pm-surface px-4 py-3 text-sm font-medium text-pm-body transition-colors hover:bg-pm-border disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
