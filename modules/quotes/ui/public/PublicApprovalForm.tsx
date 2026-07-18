'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approvePublicQuote, rejectPublicQuote } from '@/modules/quotes/application/actions';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { SectionLabel } from '@/components/shared/SectionLabel';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isRejectPending, startRejectTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const isSignatureImage = (sig: string | null) => sig?.startsWith('data:image') ?? false;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signature) {
      setError('Please provide your signature to approve this quote.');
      return;
    }
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set('approvalSignature', signature);
    startTransition(async () => {
      const result = await approvePublicQuote(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const handleRejectClick = () => {
    const form = formRef.current;
    if (!form) return;

    const fd = new FormData(form);
    const rejectedByName = String(fd.get('approvedByName') ?? '').trim();
    const rejectedByEmail = String(fd.get('approvedByEmail') ?? '').trim();

    if (!rejectedByName || !rejectedByEmail) {
      setError('Please enter your name and email before declining this quote.');
      return;
    }

    setError(null);
    setShowDeclineConfirm(true);
  };

  const handleRejectConfirm = () => {
    setShowDeclineConfirm(false);
    const form = formRef.current;
    if (!form) return;

    const fd = new FormData(form);
    fd.set('rejectedByName', String(fd.get('approvedByName') ?? '').trim());
    fd.set('rejectedByEmail', String(fd.get('approvedByEmail') ?? '').trim());
    setError(null);

    startRejectTransition(async () => {
      const result = await rejectPublicQuote(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  /* ── Approved state ── */
  if (approvedAt) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-container px-4 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-container">
            <svg className="h-5 w-5 text-on-success-container" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-on-success-container">Quote Approved</p>
            <p className="mt-0.5 text-sm text-on-success-container">
              Approved on {formatDate(approvedAt)}
              {approvedByName ? ` by ${approvedByName}` : ''}.
            </p>
            {approvedByEmail && (
              <p className="mt-0.5 text-sm text-on-success-container">{approvedByEmail}</p>
            )}
          </div>
        </div>

        {approvalSignature && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Signature on file
            </p>
            {isSignatureImage(approvalSignature) ? (
              <div className="overflow-hidden rounded-xl border border-outline bg-surface-container-low p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={approvalSignature}
                  alt="Approval signature"
                  className="max-h-20 object-contain"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-outline bg-surface-container-low px-4 py-3">
                <p className="font-serif text-lg italic text-on-surface">{approvalSignature}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── Approval form ── */
  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="quoteToken" value={quoteToken} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Your Name
          </span>
          <input
            name="approvedByName"
            type="text"
            required
            disabled={!canApprove || isPending || isRejectPending}
            defaultValue={customerName}
            className="min-h-12 rounded-xl border border-outline bg-white px-4 py-3 text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 focus:border-primary-container focus:ring-2 focus:ring-primary-fixed/40 disabled:bg-surface-container-low"
            placeholder="Full name"
          />
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Your Email
          </span>
          <input
            name="approvedByEmail"
            type="email"
            required
            disabled={!canApprove || isPending || isRejectPending}
            defaultValue={customerEmail ?? ''}
            className="min-h-12 rounded-xl border border-outline bg-white px-4 py-3 text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 focus:border-primary-container focus:ring-2 focus:ring-primary-fixed/40 disabled:bg-surface-container-low"
            placeholder="name@example.com"
          />
        </label>
      </div>

      <div className="grid gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          Signature
        </span>
        <SignaturePad
          value={signature}
          onChange={setSignature}
          disabled={!canApprove || isPending || isRejectPending}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-error/30 bg-error-container/50 px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-on-error-container">{error}</p>
        </div>
      )}

      {canApprove ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <button
            type="submit"
            disabled={isPending || isRejectPending}
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold text-on-primary shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-outline"
          >
            {isPending ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Approving...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Approve Quote
              </>
            )}
          </button>
          <button
            type="button"
            disabled={isPending || isRejectPending}
            onClick={handleReject}
            className="inline-flex min-h-14 w-full items-center justify-center rounded-xl border border-error/40 bg-white px-6 py-4 text-base font-bold text-on-error-container shadow-sm transition-all hover:bg-error-container/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-outline disabled:text-on-surface-variant sm:w-auto"
          >
            {isRejectPending ? 'Declining...' : 'Decline Quote'}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-outline bg-surface-container-low px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <p className="text-sm text-on-surface-variant">Approval is not available for this quote.</p>
        </div>
      )}
    </form>
  );
}
