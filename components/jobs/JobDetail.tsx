'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteJob, retryJobGoogleCalendarSync, updateJob } from '@/app/actions/jobs';
import { JOB_STATUS_LABELS, type JobDetail, type JobStatus } from '@/lib/jobs';
import { formatAUD, formatDate } from '@/utils/format';

const STATUS_BADGE_STYLES: Record<JobStatus, string> = {
  scheduled: 'bg-sky-50 text-sky-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-surface-container-highest text-on-surface-variant',
};

const INVOICE_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-surface-container text-on-surface-variant',
  sent: 'bg-sky-50 text-sky-700',
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-red-50 text-red-700',
  cancelled: 'bg-surface-container-highest text-on-surface-variant',
};

function getCustomerLabel(job: JobDetail) {
  return job.customer.company_name || job.customer.name;
}

function isPastScheduled(job: JobDetail) {
  if (job.status === 'completed' || job.status === 'cancelled') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${job.scheduled_date}T00:00:00`) < today;
}

function CompleteDialog({
  quoteId,
  onClose,
}: {
  quoteId: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 className="mt-3 text-lg font-bold text-on-surface">Job marked complete!</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Would you like to create an invoice for this job?
        </p>
        <div className="mt-5 flex flex-col gap-2">
          {quoteId ? (
            <Link
              href={`/invoices/new?quoteId=${quoteId}`}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:opacity-90"
            >
              Create Invoice
            </Link>
          ) : (
            <Link
              href="/invoices/new"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:opacity-90"
            >
              Create Invoice
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-outline-variant px-5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

export function JobDetail({ job }: { job: JobDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCompleting, startCompleteTransition] = useTransition();
  const [isRetryingGoogleSync, startGoogleSyncTransition] = useTransition();
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [googleSyncError, setGoogleSyncError] = useState<string | null>(null);

  const quoteLineItems = job.quoteLineItems ?? [];
  const variations = job.variations ?? [];

  const includedLineItems = quoteLineItems.filter(
    (item) => !item.is_optional || item.is_selected !== false,
  );
  const quoteSubtotal = includedLineItems.reduce((sum, item) => sum + item.total_cents, 0);
  const variationsSubtotal = variations.reduce((sum, v) => sum + v.total_cents, 0);

  function handleDelete() {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteJob(job.id);
      if (result.error) {
        alert(result.error);
        return;
      }
      router.push('/jobs');
    });
  }

  function handleMarkComplete() {
    if (job.status === 'completed') return;
    startCompleteTransition(async () => {
      const result = await updateJob(job.id, {
        customer_id: job.customer_id,
        quote_id: job.quote_id ?? undefined,
        title: job.title,
        status: 'completed',
        scheduled_date: job.scheduled_date,
        notes: job.notes ?? undefined,
      });
      if (result.error) {
        alert(result.error);
        return;
      }
      setShowCompleteDialog(true);
      router.refresh();
    });
  }

  function handleRetryGoogleSync() {
    setGoogleSyncError(null);
    startGoogleSyncTransition(async () => {
      const result = await retryJobGoogleCalendarSync(job.id);
      if (result.error) {
        setGoogleSyncError(result.error);
        return;
      }
      router.refresh();
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

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-outline font-mono mb-1">
            {job.quote?.quote_number ?? 'Standalone Job'}
          </p>
          <h1 className="text-[26px] font-extrabold tracking-tight text-on-surface leading-tight">
            {job.title}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">{getCustomerLabel(job)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded text-[10.5px] font-bold uppercase tracking-[0.14em] ${STATUS_BADGE_STYLES[job.status]}`}
          >
            {JOB_STATUS_LABELS[job.status]}
          </span>
          <Link
            href={`/jobs/${job.id}/edit`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary hover:opacity-90 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </Link>
        </div>
      </div>

      {isPastScheduled(job) && (
        <div className="rounded-lg border border-warning/20 bg-warning-container px-4 py-3">
          <p className="text-sm text-on-warning-container">
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
          className="flex items-center gap-3 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-left transition-colors hover:bg-emerald-100 disabled:opacity-50"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-emerald-400">
            {isCompleting && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            )}
          </span>
          <span className="text-sm font-semibold text-emerald-800">
            {isCompleting ? 'Marking complete...' : 'Mark as complete'}
          </span>
        </button>
      )}

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        {/* Main detail card */}
        <div className="flex flex-col gap-4">
          <div className="self-start bg-white border border-outline-variant rounded-3xl shadow-sm p-5 space-y-4 w-full">
            {/* Dates */}
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-outline mb-3">
                Schedule
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Scheduled date</span>
                  <span className="font-semibold text-on-surface">{formatDate(job.scheduled_date)}</span>
                </div>
                {job.start_date && (
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Start date</span>
                    <span className="font-semibold text-on-surface">{formatDate(job.start_date)}</span>
                  </div>
                )}
                {job.end_date && (
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">End date</span>
                    <span className="font-semibold text-on-surface">{formatDate(job.end_date)}</span>
                  </div>
                )}
                {job.duration_days != null && (
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Duration</span>
                    <span className="font-semibold text-on-surface">
                      {job.duration_days} {job.duration_days === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                )}
                <div className="border-t border-outline-variant pt-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-on-surface-variant">Google Calendar</span>
                      {job.google_calendar_id && (
                        <p className="mt-1 text-xs text-on-surface-variant">
                          Calendar: {job.google_calendar_id}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold capitalize text-on-surface-variant">
                      {job.google_sync_status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  {(job.google_sync_error || googleSyncError) && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                      <p className="text-xs text-red-700">
                        {googleSyncError ?? job.google_sync_error}
                      </p>
                      {job.quote_id && (
                        <button
                          type="button"
                          onClick={handleRetryGoogleSync}
                          disabled={isRetryingGoogleSync}
                          className="mt-2 inline-flex h-8 items-center rounded-lg bg-white px-3 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-100 disabled:opacity-60"
                        >
                          {isRetryingGoogleSync ? 'Retrying...' : 'Retry sync'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {job.notes && (
              <div className="border-t border-outline-variant pt-4">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-outline mb-2">
                  Notes
                </p>
                <p className="text-sm text-on-surface whitespace-pre-wrap">{job.notes}</p>
              </div>
            )}
          </div>

          {/* Quote scope */}
          {includedLineItems.length > 0 && (
            <div className="bg-white border border-outline-variant rounded-3xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-outline">
                  Quote Scope
                </p>
                {job.quote && (
                  <Link
                    href={`/quotes/${job.quote.id}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {job.quote.quote_number}
                  </Link>
                )}
              </div>
              <div className="space-y-1.5">
                {includedLineItems.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <span className="text-on-surface">{item.name}</span>
                      {item.is_optional && (
                        <span className="ml-1.5 text-xs text-on-surface-variant">(optional)</span>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-on-surface-variant text-xs">
                        {item.quantity} × {formatAUD(item.unit_price_cents)}
                      </span>
                      <span className="ml-2 font-semibold text-on-surface">
                        {formatAUD(item.total_cents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-outline-variant pt-3 flex justify-between text-sm">
                <span className="font-medium text-on-surface-variant">Quote subtotal</span>
                <span className="font-bold text-on-surface">{formatAUD(quoteSubtotal)}</span>
              </div>
            </div>
          )}

          {/* Variations */}
          {variations.length > 0 && (
            <div className="bg-white border border-outline-variant rounded-3xl shadow-sm p-5">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-outline mb-3">
                Variations
              </p>
              <div className="space-y-1.5">
                {variations.map((v) => (
                  <div key={v.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <span className="text-on-surface">{v.name}</span>
                      {v.notes && (
                        <p className="text-xs text-on-surface-variant mt-0.5">{v.notes}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-on-surface-variant text-xs">
                        {v.quantity} × {formatAUD(v.unit_price_cents)}
                      </span>
                      <span className="ml-2 font-semibold text-on-surface">
                        {formatAUD(v.total_cents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-outline-variant pt-3 flex justify-between text-sm">
                <span className="font-medium text-on-surface-variant">Variations subtotal</span>
                <span className="font-bold text-on-surface">{formatAUD(variationsSubtotal)}</span>
              </div>
            </div>
          )}

          {/* Total summary */}
          {(includedLineItems.length > 0 || variations.length > 0) && (
            <div className="bg-surface-container-low border border-outline-variant rounded-2xl px-5 py-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-on-surface-variant">
                Total (excl. GST)
              </span>
              <span className="text-base font-extrabold text-on-surface">
                {formatAUD(quoteSubtotal + variationsSubtotal)}
              </span>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Customer */}
          <div className="p-4 rounded-3xl border border-outline-variant bg-surface-container-low shadow-sm">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-surface mb-1.5">
              Customer
            </p>
            <p className="text-sm font-semibold text-on-surface">{getCustomerLabel(job)}</p>
            {job.customer.company_name && (
              <p className="text-xs text-on-surface-variant mt-0.5">{job.customer.name}</p>
            )}
            {job.customer.email && (
              <p className="text-xs text-on-surface-variant mt-1">{job.customer.email}</p>
            )}
            {job.customer.address && (
              <p className="text-xs text-on-surface-variant mt-1">{job.customer.address}</p>
            )}
          </div>

          {/* Linked quote */}
          {job.quote && (
            <div className="p-4 rounded-3xl border border-outline-variant bg-surface-container-low shadow-sm">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-surface mb-1.5">
                Linked Quote
              </p>
              <Link
                href={`/quotes/${job.quote.id}`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {job.quote.quote_number}
                {job.quote.title ? ` · ${job.quote.title}` : ''}
              </Link>
              <p className="text-xs text-on-surface-variant mt-0.5 capitalize">{job.quote.status}</p>
            </div>
          )}

          {/* Invoice */}
          {job.invoice ? (
            <div className="p-4 rounded-3xl border border-outline-variant bg-surface-container-low shadow-sm">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-surface mb-1.5">
                Invoice
              </p>
              <Link
                href={`/invoices/${job.invoice.id}`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {job.invoice.invoice_number}
              </Link>
              <div className="mt-1 flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${INVOICE_STATUS_STYLES[job.invoice.status] ?? 'bg-surface-container text-on-surface-variant'}`}
                >
                  {job.invoice.status}
                </span>
                <span className="text-sm font-semibold text-on-surface">
                  {formatAUD(job.invoice.total_cents)}
                </span>
              </div>
            </div>
          ) : job.quote ? (
            <div className="p-4 rounded-3xl border border-dashed border-outline-variant bg-surface-container-lowest shadow-sm">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-surface mb-1.5">
                Invoice
              </p>
              <p className="text-xs text-on-surface-variant mb-2">No invoice yet.</p>
              <Link
                href={`/invoices/new?quoteId=${job.quote.id}`}
                className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary hover:opacity-90 transition-opacity"
              >
                Create Invoice
              </Link>
            </div>
          ) : null}

          {/* Meta */}
          <div className="p-4 rounded-3xl border border-outline-variant bg-surface-container-low shadow-sm">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-on-surface mb-1.5">
              Activity
            </p>
            <p className="text-sm text-on-surface-variant">Created {formatDate(job.created_at)}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Updated {formatDate(job.updated_at)}
            </p>
          </div>

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-error/30 bg-error-container text-sm font-semibold text-on-error-container transition-colors hover:bg-error/10 disabled:opacity-50"
          >
            {isPending ? 'Deleting...' : 'Delete Job'}
          </button>
        </div>
      </div>
    </div>
  );
}
