'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  approvePublicQuote,
  rejectPublicQuote,
} from '@/modules/quotes/application/actions';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { SignaturePad } from './SignaturePad';

interface PublicApprovalFormProps {
  quoteToken: string;
  canApprove: boolean;
  approvalHelperText: string;
  approvedAt: string | null;
  approvedByName: string | null;
  approvedByEmail: string | null;
  approvalSignature: string | null;
  customerName: string;
  customerEmail: string | null;
  formatDate: (d: string) => string;
}

export function PublicApprovalForm({
  quoteToken,
  canApprove,
  approvedAt,
  approvedByName,
  approvedByEmail,
  approvalSignature,
  customerName,
  customerEmail,
  formatDate,
}: PublicApprovalFormProps) {
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [approvalSubmitted, setApprovalSubmitted] = useState(false);
  const [showRejectConfirmation, setShowRejectConfirmation] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isRejectPending, startRejectTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const isSignatureImage = (sig: string | null) =>
    sig?.startsWith('data:image') ?? false;

  const getSubmissionError = (submitError: unknown, fallback: string) =>
    submitError instanceof Error ? submitError.message : fallback;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signature) {
      setError('Please provide your signature to approve this quote.');
      return;
    }
    setError(null);
    setWarning(null);
    const fd = new FormData(e.currentTarget);
    fd.set('approvalSignature', signature);
    startTransition(async () => {
      try {
        const result = await approvePublicQuote(fd);
        if (result.error) {
          setError(result.error);
          return;
        }
        setApprovalSubmitted(true);
        setWarning(result.warning ?? null);
        router.refresh();
      } catch (submitError) {
        setError(
          getSubmissionError(
            submitError,
            'This quote could not be approved. Please try again.'
          )
        );
      }
    });
  };

  const validateRejectIdentity = () => {
    const form = formRef.current;
    if (!form) return null;

    const fd = new FormData(form);
    const rejectedByName = String(fd.get('approvedByName') ?? '').trim();
    const rejectedByEmail = String(fd.get('approvedByEmail') ?? '').trim();

    if (!rejectedByName || !rejectedByEmail) {
      setError('Please enter your name and email before declining this quote.');
      return null;
    }

    fd.set('rejectedByName', rejectedByName);
    fd.set('rejectedByEmail', rejectedByEmail);
    return fd;
  };

  const handleReject = () => {
    if (!validateRejectIdentity()) return;

    setError(null);
    setWarning(null);
    setShowRejectConfirmation(true);
  };

  const confirmReject = () => {
    const fd = validateRejectIdentity();
    if (!fd) {
      setShowRejectConfirmation(false);
      return;
    }

    setShowRejectConfirmation(false);
    setError(null);
    setWarning(null);

    startRejectTransition(async () => {
      try {
        const result = await rejectPublicQuote(fd);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch (submitError) {
        setError(
          getSubmissionError(
            submitError,
            'This quote could not be declined. Please try again.'
          )
        );
      }
    });
  };

  /* ── Approved state ── */
  if (approvedAt) {
    return (
      <div className="space-y-4">
        <div className="border-success/30 bg-success-container flex items-start gap-3 rounded-2xl border px-4 py-4">
          <div className="bg-success-container flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <svg
              className="text-on-success-container h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-on-success-container font-semibold">
              Quote Approved
            </p>
            <p className="text-on-success-container mt-0.5 text-sm">
              Approved on {formatDate(approvedAt)}
              {approvedByName ? ` by ${approvedByName}` : ''}.
            </p>
            {approvedByEmail && (
              <p className="text-on-success-container mt-0.5 text-sm">
                {approvedByEmail}
              </p>
            )}
          </div>
        </div>

        {warning && (
          <div className="border-warning/30 bg-warning-container rounded-2xl border px-4 py-3">
            <p className="text-on-warning-container text-sm">{warning}</p>
          </div>
        )}

        {approvalSignature && (
          <div>
            <SectionLabel className="mb-2">Signature on file</SectionLabel>
            {isSignatureImage(approvalSignature) ? (
              <div className="border-outline bg-surface-container-low overflow-hidden rounded-xl border p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={approvalSignature}
                  alt="Approval signature"
                  className="max-h-20 object-contain"
                />
              </div>
            ) : (
              <div className="border-outline bg-surface-container-low rounded-xl border px-4 py-3">
                <p className="text-on-surface font-serif text-lg italic">
                  {approvalSignature}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── Approval form ── */
  return (
    <>
      <ConfirmDialog
        open={showRejectConfirmation}
        title="Decline this quote?"
        message="This will mark the quote as declined for the painter. You cannot approve it after declining."
        confirmLabel="Decline quote"
        destructive
        onConfirm={confirmReject}
        onCancel={() => setShowRejectConfirmation(false)}
      />

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="quoteToken" value={quoteToken} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <SectionLabel as="span">Your Name</SectionLabel>
            <input
              name="approvedByName"
              type="text"
              required
              disabled={
                !canApprove || isPending || isRejectPending || approvalSubmitted
              }
              defaultValue={customerName}
              className="border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/50 focus-visible:border-primary focus-visible:ring-primary/20 disabled:bg-surface-container-low min-h-12 rounded-xl border px-4 py-3 text-base transition-colors outline-none focus-visible:ring-2"
              placeholder="Full name"
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <SectionLabel as="span">Your Email</SectionLabel>
            <input
              name="approvedByEmail"
              type="email"
              required
              disabled={
                !canApprove || isPending || isRejectPending || approvalSubmitted
              }
              defaultValue={customerEmail ?? ''}
              className="border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/50 focus-visible:border-primary focus-visible:ring-primary/20 disabled:bg-surface-container-low min-h-12 rounded-xl border px-4 py-3 text-base transition-colors outline-none focus-visible:ring-2"
              placeholder="name@example.com"
            />
          </label>
        </div>

        <div className="grid gap-1.5">
          <SectionLabel as="span">Signature</SectionLabel>
          <SignaturePad
            value={signature}
            onChange={setSignature}
            disabled={
              !canApprove || isPending || isRejectPending || approvalSubmitted
            }
          />
        </div>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        {warning && (
          <div className="border-warning/30 bg-warning-container rounded-2xl border px-4 py-3">
            <p className="text-on-warning-container text-sm">{warning}</p>
          </div>
        )}

        {canApprove ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              type="submit"
              disabled={isPending || isRejectPending || approvalSubmitted}
              className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 disabled:bg-outline inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-bold shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Approving...
                </>
              ) : (
                <>
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Approve Quote
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isPending || isRejectPending || approvalSubmitted}
              onClick={handleReject}
              className="border-error/40 bg-surface-container-lowest text-on-error-container hover:bg-error-container/40 focus-visible:ring-error/30 disabled:border-outline disabled:text-on-surface-variant inline-flex min-h-14 w-full items-center justify-center rounded-xl border px-6 py-4 text-base font-bold shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed sm:w-auto"
            >
              {isRejectPending ? 'Declining...' : 'Decline Quote'}
            </button>
          </div>
        ) : (
          <div className="border-outline-variant bg-surface-container-low flex items-center gap-2 rounded-2xl border px-4 py-3">
            <svg
              className="text-on-surface-variant h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            <p className="text-on-surface-variant text-sm">
              Approval is not available for this quote.
            </p>
          </div>
        )}
      </form>
    </>
  );
}
