'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveQuote,
  deleteQuote,
  duplicateQuote,
  sendQuoteToClient,
} from '@/modules/quotes/application/actions';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/toast';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import type { QuoteStatus } from '@/modules/quotes/domain/quotes';

export type ConvertQuoteToJobAction = (quoteId: string) => Promise<{
  error: string | null;
  jobId: string | null;
  existing: boolean;
}>;

interface Props {
  quoteId: string;
  quoteNumber: string;
  status: QuoteStatus;
  publicQuoteUrl: string | null;
  hasLinkedInvoices?: boolean;
  convertQuoteToJobAction: ConvertQuoteToJobAction;
}

function SpinnerIcon() {
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
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function getQuotePdfFilename(quoteNumber: string) {
  const safeQuoteNumber =
    quoteNumber.replace(/[^a-z0-9_-]+/gi, '-') || 'document';
  return `quote-${safeQuoteNumber}.pdf`;
}

export function QuoteActions({
  quoteId,
  quoteNumber,
  status,
  publicQuoteUrl,
  hasLinkedInvoices = false,
  convertQuoteToJobAction,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [approvePending, startApprove] = useTransition();
  const [jobPending, startJob] = useTransition();
  const [dupPending, startDup] = useTransition();
  const [menuPending, startMenu] = useTransition();
  const [sendPending, startSend] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  function handleSend() {
    setError(null);
    startSend(async () => {
      const result = await sendQuoteToClient(quoteId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        status === 'sent'
          ? 'Quote re-sent to the client.'
          : 'Quote sent to the client.'
      );
    });
  }

  function handleDeleteConfirm() {
    setError(null);
    startDelete(async () => {
      const result = await deleteQuote(quoteId);
      if (result?.error) {
        setShowDeleteModal(false);
        toast.error(result.error);
        return;
      }
      setShowDeleteModal(false);
      router.push('/quotes');
    });
  }

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
      const result = await convertQuoteToJobAction(quoteId);
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

  const anyPending =
    approvePending ||
    jobPending ||
    dupPending ||
    menuPending ||
    sendPending ||
    deletePending;

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

      const jobResult = await convertQuoteToJobAction(quoteId);
      if (jobResult.error) {
        setError(jobResult.error);
        return;
      }
      router.push('/jobs');
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorAlert>{error}</ErrorAlert>}
      {hasLinkedInvoices && (
        <p className="rounded-lg bg-warning-container px-3 py-2.5 text-sm text-on-warning-container">
          Quote editing and deletion are locked after invoice creation.
        </p>
      )}

      {/* Primary CTAs — status-aware */}
      {status === 'draft' && (
        <button
          type="button"
          onClick={handleSend}
          disabled={anyPending}
          className="bg-primary text-on-primary hover:bg-primary/90 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
        >
          {sendPending ? (
            <>
              <SpinnerIcon /> Sending…
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send to Client
            </>
          )}
        </button>
      )}

      {(status === 'draft' || status === 'sent') && (
        <button
          type="button"
          onClick={handleApprove}
          disabled={anyPending}
          className="bg-tertiary text-on-tertiary hover:bg-tertiary/90 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
        >
          {approvePending ? (
            <>
              <SpinnerIcon /> Approving…
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Approve Quote
            </>
          )}
        </button>
      )}

      {status === 'sent' && (
        <button
          type="button"
          onClick={handleSend}
          disabled={anyPending}
          className="border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
        >
          {sendPending ? (
            <>
              <SpinnerIcon /> Sending…
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
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Resend to Client
            </>
          )}
        </button>
      )}

      {status === 'approved' && (
        <div className="flex flex-col gap-2.5">
          <Link
            href={`/invoices/new?quoteId=${quoteId}`}
            className="bg-primary text-on-primary hover:bg-primary/90 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
            className="border-outline-variant text-on-surface hover:bg-surface-container inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border bg-white px-5 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {jobPending ? (
              <>
                <SpinnerIcon /> Converting…
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
      <div
        className={`grid grid-cols-2 gap-2 ${publicQuoteUrl ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}
      >
        {/* More */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMoreOpen((prev) => !prev)}
            disabled={anyPending}
            aria-expanded={isMoreOpen}
            aria-haspopup="menu"
            className="border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-container-high flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
            More
          </button>
          {isMoreOpen && (
            <div
              role="menu"
              className="border-outline-variant absolute left-0 z-20 mt-2 w-64 rounded-xl border bg-surface-container-lowest p-2 shadow-lg"
            >
              {(status === 'draft' || status === 'sent') && (
                <button
                  type="button"
                  onClick={handleApproveWithoutSignature}
                  className="text-on-surface hover:bg-surface-container-low flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition-colors"
                >
                  Approve without signature
                </button>
              )}
              <button
                type="button"
                onClick={handleApproveAndConvertToJob}
                className="text-on-surface hover:bg-surface-container-low mt-1 flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium transition-colors"
              >
                {status === 'approved'
                  ? 'Convert to Job'
                  : 'Approve and convert to job'}
              </button>
            </div>
          )}
        </div>

        {/* PDF */}
        <a
          href={`/api/pdf/quote?id=${quoteId}`}
          target="_blank"
          rel="noreferrer"
          download={getQuotePdfFilename(quoteNumber)}
          className="border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-container-high flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          PDF
        </a>

        {/* Client page — only shown when URL exists */}
        {publicQuoteUrl && (
          <Link
            href={publicQuoteUrl}
            target="_blank"
            rel="noreferrer"
            className="border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-container-high flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
            >
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
          className="border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-container-high flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
        >
          {dupPending ? (
            <SpinnerIcon />
          ) : (
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
            >
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
          className="border-error/30 bg-error/5 text-error hover:bg-error/10 flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
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
          >
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
      const { deleteQuote } = await import('@/modules/quotes/application/actions');
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
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="bg-error/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
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
        <h2 className="text-on-surface text-lg font-bold">Delete Quote?</h2>
        <p className="text-on-surface-variant mt-1.5 text-sm">
          <span className="text-on-surface font-semibold">{quoteNumber}</span> will
          be permanently deleted. This cannot be undone.
        </p>
        {error && (
          <p className="bg-error/10 text-error mt-3 rounded-lg px-3 py-2 text-sm">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="bg-error hover:bg-error/90 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-on-error transition-colors disabled:opacity-60"
          >
            {isPending ? (
              <>
                <SpinnerIcon /> Deleting…
              </>
            ) : (
              'Yes, Delete Quote'
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="border-outline-variant bg-surface-container text-on-surface hover:bg-outline-variant inline-flex min-h-12 w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
