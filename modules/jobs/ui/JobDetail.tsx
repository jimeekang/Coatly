'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, Pencil } from 'lucide-react';
import {
  deleteJob,
  retryJobGoogleCalendarSync,
  updateJob,
} from '@/modules/jobs/application/actions';
import { JOB_STATUS_LABELS, type JobDetail } from '@/modules/jobs/domain/jobs';
import { formatAUD, formatDate } from '@/utils/format';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/modal';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  INVOICE_STATUS_TONE,
  JOB_STATUS_TONE,
} from '@/lib/constants/status-colors';

function getCustomerLabel(job: JobDetail) {
  return job.customer.company_name || job.customer.name;
}

function isPastScheduled(job: JobDetail) {
  if (job.status === 'completed' || job.status === 'cancelled') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${job.scheduled_date}T00:00:00`) < today;
}

function isNextNavigationSignal(error: unknown) {
  if (!error || typeof error !== 'object' || !('digest' in error)) {
    return false;
  }

  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') ||
      digest.startsWith('NEXT_NOT_FOUND') ||
      digest.startsWith('NEXT_HTTP_ERROR_FALLBACK'))
  );
}

function getActionErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function CompleteDialog({
  quoteId,
  onClose,
}: {
  quoteId: string | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Job marked complete!"
      description="Would you like to create an invoice for this job?"
      size="sm"
    >
      <div className="flex flex-col gap-4">
        <div className="bg-success-container flex h-12 w-12 items-center justify-center rounded-full">
          <Check className="text-success h-6 w-6" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col gap-2">
          {quoteId ? (
            <Link
              href={`/invoices/new?quoteId=${quoteId}`}
              className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              + New Invoice
            </Link>
          ) : (
            <Link
              href="/invoices/new"
              className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              + New Invoice
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="border-outline-variant text-on-surface hover:bg-surface-container-low focus-visible:ring-primary/30 inline-flex min-h-12 items-center justify-center rounded-xl border px-5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Skip for now
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function JobDetail({
  job,
  showHeader = true,
}: {
  job: JobDetail;
  showHeader?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCompleting, startCompleteTransition] = useTransition();
  const [isRetryingGoogleSync, startGoogleSyncTransition] = useTransition();
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [googleSyncError, setGoogleSyncError] = useState<string | null>(null);

  const quoteLineItems = job.quoteLineItems ?? [];
  const variations = job.variations ?? [];

  const includedLineItems = quoteLineItems.filter(
    (item) => !item.is_optional || item.is_selected !== false
  );
  const quoteSubtotal = includedLineItems.reduce(
    (sum, item) => sum + item.total_cents,
    0
  );
  const variationsSubtotal = variations.reduce(
    (sum, v) => sum + v.total_cents,
    0
  );

  function handleDelete() {
    setShowDeleteDialog(false);
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await deleteJob(job.id);
        if (result.error) {
          setActionError(result.error);
          return;
        }
        router.push('/jobs');
      } catch (deleteError) {
        if (isNextNavigationSignal(deleteError)) {
          throw deleteError;
        }

        setActionError(
          getActionErrorMessage(
            deleteError,
            'Job could not be deleted. Please try again.'
          )
        );
      }
    });
  }

  function handleMarkComplete() {
    if (job.status === 'completed') return;
    setActionError(null);
    startCompleteTransition(async () => {
      try {
        const result = await updateJob(job.id, {
          customer_id: job.customer_id,
          quote_id: job.quote_id ?? undefined,
          title: job.title,
          status: 'completed',
          scheduled_date: job.scheduled_date,
          notes: job.notes ?? undefined,
        });
        if (result.error) {
          setActionError(result.error);
          return;
        }
        setShowCompleteDialog(true);
        router.refresh();
      } catch (completeError) {
        if (isNextNavigationSignal(completeError)) {
          throw completeError;
        }

        setActionError(
          getActionErrorMessage(
            completeError,
            'Job could not be marked complete. Please try again.'
          )
        );
      }
    });
  }

  function handleRetryGoogleSync() {
    setGoogleSyncError(null);
    startGoogleSyncTransition(async () => {
      try {
        const result = await retryJobGoogleCalendarSync(job.id);
        if (result.error) {
          setGoogleSyncError(result.error);
          return;
        }
        router.refresh();
      } catch (syncError) {
        if (isNextNavigationSignal(syncError)) {
          throw syncError;
        }

        setGoogleSyncError(
          getActionErrorMessage(
            syncError,
            'Google Calendar sync could not be retried. Please try again.'
          )
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {showCompleteDialog && (
        <CompleteDialog
          quoteId={job.quote_id}
          onClose={() => setShowCompleteDialog(false)}
        />
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete job?"
        message={`Delete “${job.title}”? This permanently removes the job and cannot be undone.`}
        confirmLabel="Delete job"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {actionError && <ErrorAlert>{actionError}</ErrorAlert>}

      {showHeader && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <SectionLabel className="mb-1 font-mono">
              {job.quote?.quote_number ?? 'Standalone Job'}
            </SectionLabel>
            <h1 className="text-on-surface text-[26px] leading-tight font-extrabold tracking-tight">
              {job.title}
            </h1>
            <p className="text-on-surface-variant mt-1 text-sm">
              {getCustomerLabel(job)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge
              tone={JOB_STATUS_TONE[job.status]}
              label={JOB_STATUS_LABELS[job.status]}
            />
            <Link
              href={`/jobs/${job.id}/edit`}
              className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
              Edit
            </Link>
          </div>
        </div>
      )}

      {isPastScheduled(job) && (
        <div className="border-warning/20 bg-warning-container rounded-xl border px-4 py-3">
          <p className="text-on-warning-container text-sm">
            This job is scheduled in the past and is still open.
          </p>
        </div>
      )}

      {/* Mark Complete button (only shown if not completed/cancelled) */}
      {job.status !== 'completed' && job.status !== 'cancelled' && (
        <button
          type="button"
          onClick={handleMarkComplete}
          disabled={isCompleting}
          className="border-success/30 bg-success-container hover:bg-success-container/80 focus-visible:ring-success/30 flex min-h-12 items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
        >
          <span className="border-success flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2">
            {isCompleting && (
              <span className="border-success h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" />
            )}
          </span>
          <span className="text-success text-sm font-semibold">
            {isCompleting ? 'Marking complete...' : 'Mark as complete'}
          </span>
        </button>
      )}

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        {/* Main detail card */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface-container-lowest border-outline-variant w-full space-y-4 self-start rounded-2xl border p-5 shadow-sm">
            {/* Dates */}
            <div>
              <SectionLabel className="mb-3">Schedule</SectionLabel>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">
                    Scheduled date
                  </span>
                  <span className="text-on-surface font-semibold">
                    {formatDate(job.scheduled_date)}
                  </span>
                </div>
                {job.start_date && (
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Start date</span>
                    <span className="text-on-surface font-semibold">
                      {formatDate(job.start_date)}
                    </span>
                  </div>
                )}
                {job.end_date && (
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">End date</span>
                    <span className="text-on-surface font-semibold">
                      {formatDate(job.end_date)}
                    </span>
                  </div>
                )}
                {job.duration_days != null && (
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Duration</span>
                    <span className="text-on-surface font-semibold">
                      {job.duration_days}{' '}
                      {job.duration_days === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                )}
                <div className="border-outline-variant border-t pt-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-on-surface-variant">
                        Google Calendar
                      </span>
                      {job.google_calendar_id && (
                        <p className="text-on-surface-variant mt-1 text-xs">
                          Calendar: {job.google_calendar_id}
                        </p>
                      )}
                    </div>
                    <span className="bg-surface-container text-on-surface-variant shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize">
                      {job.google_sync_status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  {(job.google_sync_error || googleSyncError) && (
                    <ErrorAlert className="mt-3">
                      <p className="text-xs">
                        {googleSyncError ?? job.google_sync_error}
                      </p>
                      {job.quote_id && (
                        <button
                          type="button"
                          onClick={handleRetryGoogleSync}
                          disabled={isRetryingGoogleSync}
                          className="bg-surface-container-lowest text-error ring-error/30 hover:bg-error-container/60 focus-visible:ring-error/30 mt-2 inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
                        >
                          {isRetryingGoogleSync ? 'Retrying...' : 'Retry sync'}
                        </button>
                      )}
                    </ErrorAlert>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {job.notes && (
              <div className="border-outline-variant border-t pt-4">
                <SectionLabel className="mb-2">Notes</SectionLabel>
                <p className="text-on-surface text-sm whitespace-pre-wrap">
                  {job.notes}
                </p>
              </div>
            )}
          </div>

          {/* Quote scope */}
          {includedLineItems.length > 0 && (
            <div className="bg-surface-container-lowest border-outline-variant rounded-2xl border p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <SectionLabel>Quote Scope</SectionLabel>
                {job.quote && (
                  <Link
                    href={`/quotes/${job.quote.id}`}
                    className="text-primary focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl px-2 text-xs font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {job.quote.quote_number}
                  </Link>
                )}
              </div>
              <div className="space-y-1.5">
                {includedLineItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="text-on-surface">{item.name}</span>
                      {item.is_optional && (
                        <span className="text-on-surface-variant ml-1.5 text-xs">
                          (optional)
                        </span>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-on-surface-variant text-xs">
                        {item.quantity} × {formatAUD(item.unit_price_cents)}
                      </span>
                      <span className="text-on-surface ml-2 font-semibold">
                        {formatAUD(item.total_cents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-outline-variant mt-3 flex justify-between border-t pt-3 text-sm">
                <span className="text-on-surface-variant font-medium">
                  Quote subtotal
                </span>
                <span className="text-on-surface font-bold">
                  {formatAUD(quoteSubtotal)}
                </span>
              </div>
            </div>
          )}

          {/* Variations */}
          {variations.length > 0 && (
            <div className="bg-surface-container-lowest border-outline-variant rounded-2xl border p-5 shadow-sm">
              <SectionLabel className="mb-3">Variations</SectionLabel>
              <div className="space-y-1.5">
                {variations.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="text-on-surface">{v.name}</span>
                      {v.notes && (
                        <p className="text-on-surface-variant mt-0.5 text-xs">
                          {v.notes}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-on-surface-variant text-xs">
                        {v.quantity} × {formatAUD(v.unit_price_cents)}
                      </span>
                      <span className="text-on-surface ml-2 font-semibold">
                        {formatAUD(v.total_cents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-outline-variant mt-3 flex justify-between border-t pt-3 text-sm">
                <span className="text-on-surface-variant font-medium">
                  Variations subtotal
                </span>
                <span className="text-on-surface font-bold">
                  {formatAUD(variationsSubtotal)}
                </span>
              </div>
            </div>
          )}

          {/* Total summary */}
          {(includedLineItems.length > 0 || variations.length > 0) && (
            <div className="bg-surface-container-low border-outline-variant flex items-center justify-between rounded-2xl border px-5 py-3">
              <span className="text-on-surface-variant text-sm font-semibold">
                Total (excl. GST)
              </span>
              <span className="text-on-surface text-base font-extrabold">
                {formatAUD(quoteSubtotal + variationsSubtotal)}
              </span>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Customer */}
          <div className="border-outline-variant bg-surface-container-low rounded-2xl border p-4 shadow-sm">
            <SectionLabel className="text-on-surface mb-1.5">
              Customer
            </SectionLabel>
            <p className="text-on-surface text-sm font-semibold">
              {getCustomerLabel(job)}
            </p>
            {job.customer.company_name && (
              <p className="text-on-surface-variant mt-0.5 text-xs">
                {job.customer.name}
              </p>
            )}
            {job.customer.email && (
              <p className="text-on-surface-variant mt-1 text-xs">
                {job.customer.email}
              </p>
            )}
            {job.customer.address && (
              <p className="text-on-surface-variant mt-1 text-xs">
                {job.customer.address}
              </p>
            )}
          </div>

          {/* Linked quote */}
          {job.quote && (
            <div className="border-outline-variant bg-surface-container-low rounded-2xl border p-4 shadow-sm">
              <SectionLabel className="text-on-surface mb-1.5">
                Linked Quote
              </SectionLabel>
              <Link
                href={`/quotes/${job.quote.id}`}
                className="text-primary focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {job.quote.quote_number}
                {job.quote.title ? ` · ${job.quote.title}` : ''}
              </Link>
              <p className="text-on-surface-variant mt-0.5 text-xs capitalize">
                {job.quote.status}
              </p>
            </div>
          )}

          {/* Invoice */}
          {job.invoice ? (
            <div className="border-outline-variant bg-surface-container-low rounded-2xl border p-4 shadow-sm">
              <SectionLabel className="text-on-surface mb-1.5">
                Invoice
              </SectionLabel>
              <Link
                href={`/invoices/${job.invoice.id}`}
                className="text-primary focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {job.invoice.invoice_number}
              </Link>
              <div className="mt-1 flex items-center justify-between">
                <StatusBadge
                  tone={
                    INVOICE_STATUS_TONE[
                      job.invoice.status as keyof typeof INVOICE_STATUS_TONE
                    ] ?? 'neutral'
                  }
                  label={job.invoice.status}
                />
                <span className="text-on-surface text-sm font-semibold">
                  {formatAUD(job.invoice.total_cents)}
                </span>
              </div>
            </div>
          ) : job.quote ? (
            <div className="border-outline-variant bg-surface-container-lowest rounded-2xl border border-dashed p-4 shadow-sm">
              <SectionLabel className="text-on-surface mb-1.5">
                Invoice
              </SectionLabel>
              <p className="text-on-surface-variant mb-2 text-xs">
                No invoice yet.
              </p>
              <Link
                href={`/invoices/new?quoteId=${job.quote.id}`}
                className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                Create Invoice
              </Link>
            </div>
          ) : null}

          {/* Meta */}
          <div className="border-outline-variant bg-surface-container-low rounded-2xl border p-4 shadow-sm">
            <SectionLabel className="text-on-surface mb-1.5">
              Activity
            </SectionLabel>
            <p className="text-on-surface-variant text-sm">
              Created {formatDate(job.created_at)}
            </p>
            <p className="text-on-surface-variant mt-0.5 text-xs">
              Updated {formatDate(job.updated_at)}
            </p>
          </div>

          {/* Delete */}
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isPending}
            className="border-error/30 bg-error-container text-on-error-container hover:bg-error/10 focus-visible:ring-error/30 inline-flex min-h-12 w-full items-center justify-center rounded-xl border text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
          >
            {isPending ? 'Deleting...' : 'Delete Job'}
          </button>
        </div>
      </div>
    </div>
  );
}
