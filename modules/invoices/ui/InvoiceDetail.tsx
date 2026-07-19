'use client';

import Link from 'next/link';
import { useState, useTransition, type ReactNode } from 'react';
import {
  deleteInvoice,
  markInvoiceAsPaid,
  sendInvoice,
} from '@/modules/invoices/application/actions';
import type { InvoiceFormQuoteOption } from '@/modules/invoices/ui/InvoiceForm';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { INVOICE_STATUS_TONE } from '@/lib/constants/status-colors';
import { getSydneyTodayDateString } from '@/modules/invoices/domain/invoices';
import type {
  InvoiceStatus,
  InvoiceWithCustomer,
} from '@/modules/invoices/domain/invoice';
import { formatABN, formatAUD, formatDate } from '@/utils/format';

/* ──────────────────────────────────────────────────────────
   Static maps
   ────────────────────────────────────────────────────────── */

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

const INVOICE_TYPE_LABEL: Record<InvoiceWithCustomer['invoice_type'], string> =
  {
    full: 'Full',
    deposit: 'Deposit',
    progress: 'Progress',
    final: 'Final',
  };

const PAYMENT_METHOD_LABEL: Record<
  NonNullable<InvoiceWithCustomer['payment_method']>,
  string
> = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  card: 'Card',
  cheque: 'Cheque',
  other: 'Other',
};

/* Payment progress band — tone per status. */
const BAND_TONE: Record<
  InvoiceStatus,
  { container: string; amount: string; bar: string }
> = {
  paid: {
    container: 'bg-success-container border-success/20 border-l-success',
    amount: 'text-success',
    bar: 'bg-success',
  },
  overdue: {
    container: 'bg-warning-container border-warning/25 border-l-warning',
    amount: 'text-warning',
    bar: 'bg-warning',
  },
  sent: {
    container:
      'bg-surface-container-lowest border-outline-variant/60 border-l-primary',
    amount: 'text-on-surface',
    bar: 'bg-primary',
  },
  draft: {
    container:
      'bg-surface-container-low border-outline-variant/60 border-l-outline',
    amount: 'text-on-surface',
    bar: 'bg-primary',
  },
  cancelled: {
    container:
      'bg-surface-container-low border-outline-variant/60 border-l-outline',
    amount: 'text-on-surface-variant',
    bar: 'bg-outline',
  },
};

type TimelineTone = 'neutral' | 'info' | 'warning' | 'success';

const TIMELINE_DOT: Record<TimelineTone, string> = {
  neutral:
    'bg-surface-container-high text-on-surface-variant border-outline-variant',
  info: 'bg-primary/10 text-primary border-primary/20',
  warning: 'bg-warning-container text-on-warning-container border-warning/25',
  success: 'bg-success-container text-on-success-container border-success/25',
};

/* ──────────────────────────────────────────────────────────
   Icons (inline SVG — codebase convention)
   ────────────────────────────────────────────────────────── */

const ICON_PATHS: Record<string, ReactNode> = {
  'check-circle-2': (
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </>
  ),
  'alert-triangle': (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </>
  ),
  'x-circle': (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </>
  ),
  'file-plus': (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </>
  ),
  send: (
    <>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </>
  ),
  wallet: (
    <>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
};

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────
   Small layout primitives
   ────────────────────────────────────────────────────────── */

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-outline-variant/60 bg-surface-container-lowest rounded-2xl border p-5 shadow-sm">
      <h2 className="text-on-surface mb-4 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function MetaBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | null;
  sub?: ReactNode;
}) {
  return (
    <div className="bg-surface-container-low rounded-xl p-[18px]">
      <SectionLabel className="mb-1.5">{label}</SectionLabel>
      <p className="text-on-surface text-sm font-semibold">{value || '—'}</p>
      {sub && <p className="text-on-surface-variant mt-1 text-xs">{sub}</p>}
    </div>
  );
}

const PRIMARY_BTN =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50';
const SECONDARY_BTN =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';

function isNextNavigationSignal(error: unknown) {
  if (!error || typeof error !== 'object' || !('digest' in error)) {
    return false;
  }

  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND'))
  );
}

function getActionError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return typeof error === 'string' && error ? error : fallback;
}

/* ──────────────────────────────────────────────────────────
   Payment progress band
   ────────────────────────────────────────────────────────── */

function PaymentProgressBand({ invoice }: { invoice: InvoiceWithCustomer }) {
  const tone = BAND_TONE[invoice.status];
  const balanceCents = Math.max(
    invoice.total_cents - invoice.amount_paid_cents,
    0
  );
  const pct =
    invoice.total_cents > 0
      ? Math.min(
          100,
          Math.round((invoice.amount_paid_cents / invoice.total_cents) * 100)
        )
      : 0;

  const foot: { icon: string; text: string } = (() => {
    switch (invoice.status) {
      case 'paid':
        return {
          icon: 'check-circle-2',
          text: invoice.paid_date
            ? `Paid in full — settled on ${formatDate(invoice.paid_date)}`
            : 'Paid in full',
        };
      case 'overdue':
        return {
          icon: 'alert-triangle',
          text: invoice.due_date
            ? `Past due since ${formatDate(invoice.due_date)} — consider sending a reminder`
            : 'Past due — consider sending a reminder',
        };
      case 'sent':
        return {
          icon: 'clock',
          text: invoice.due_date
            ? `Awaiting payment — due ${formatDate(invoice.due_date)}`
            : 'Awaiting payment',
        };
      case 'cancelled':
        return { icon: 'x-circle', text: 'Cancelled — no payment expected' };
      default:
        return { icon: 'pencil', text: 'Draft — not yet sent to customer' };
    }
  })();

  return (
    <section
      className={`rounded-2xl border border-l-4 p-5 shadow-sm sm:p-6 ${tone.container}`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionLabel>Amount due</SectionLabel>
          <p
            className={`mt-1 text-[26px] font-extrabold tabular-nums sm:text-[32px] ${tone.amount}`}
          >
            {formatAUD(balanceCents)}
            <span className="text-on-surface-variant ml-1.5 text-xs font-bold tracking-wider">
              AUD
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <div>
            <SectionLabel>Invoiced</SectionLabel>
            <p className="text-on-surface mt-0.5 text-sm font-bold tabular-nums">
              {formatAUD(invoice.total_cents)}
            </p>
          </div>
          <div>
            <SectionLabel>Received</SectionLabel>
            <p className="text-on-surface mt-0.5 text-sm font-bold tabular-nums">
              {formatAUD(invoice.amount_paid_cents)}
            </p>
          </div>
          {invoice.due_date && (
            <div>
              <SectionLabel>
                {invoice.status === 'overdue' ? 'Was due' : 'Due'}
              </SectionLabel>
              <p className="text-on-surface mt-0.5 text-sm font-bold tabular-nums">
                {formatDate(invoice.due_date)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div
        className="bg-outline-variant/40 mt-5 h-1.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% of invoice paid`}
      >
        <div
          className={`h-full rounded-full transition-all ${tone.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="text-on-surface-variant mt-3 flex items-center gap-2 text-xs font-semibold">
        <Icon name={foot.icon} size={14} />
        <span>{foot.text}</span>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────
   Activity timeline — derived from status, real data only
   ────────────────────────────────────────────────────────── */

function buildTimeline(
  invoice: InvoiceWithCustomer,
  linkedQuote?: InvoiceFormQuoteOption | null
): Array<{
  icon: string;
  tone: TimelineTone;
  label: string;
  when: string;
  detail: string;
}> {
  const events: Array<{
    icon: string;
    tone: TimelineTone;
    label: string;
    when: string;
    detail: string;
  }> = [];

  events.push({
    icon: 'file-plus',
    tone: 'neutral',
    label: 'Invoice created',
    when: formatDate(invoice.created_at),
    detail: linkedQuote
      ? `From quote ${linkedQuote.quote_number}`
      : 'Created manually',
  });

  if (invoice.status !== 'draft' && invoice.status !== 'cancelled') {
    events.push({
      icon: 'send',
      tone: 'info',
      label: 'Invoice sent',
      // The current invoice record does not store a reliable delivery timestamp.
      // Leave the time blank instead of presenting the creation date as the sent date.
      when: '',
      detail: invoice.customer.email
        ? `Emailed to ${invoice.customer.email}`
        : 'Sent to customer',
    });
  }

  if (invoice.status === 'overdue') {
    events.push({
      icon: 'alert-triangle',
      tone: 'warning',
      label: 'Payment overdue',
      when: formatDate(invoice.due_date),
      detail: 'Past the due date — a reminder may help.',
    });
  }

  const methodLabel = invoice.payment_method
    ? PAYMENT_METHOD_LABEL[invoice.payment_method]
    : 'Payment';

  if (invoice.status === 'paid') {
    events.push({
      icon: 'check-circle-2',
      tone: 'success',
      label: 'Payment received',
      when: formatDate(invoice.paid_date ?? invoice.created_at),
      detail: `${methodLabel} · ${formatAUD(invoice.amount_paid_cents)} settled`,
    });
  } else if (invoice.amount_paid_cents > 0) {
    events.push({
      icon: 'wallet',
      tone: 'success',
      label: 'Part-payment received',
      when: formatDate(invoice.paid_date ?? invoice.created_at),
      detail: `${methodLabel} · ${formatAUD(invoice.amount_paid_cents)}`,
    });
  }

  return events.reverse();
}

function ActivityTimeline({
  invoice,
  linkedQuote,
}: {
  invoice: InvoiceWithCustomer;
  linkedQuote?: InvoiceFormQuoteOption | null;
}) {
  const timeline = buildTimeline(invoice, linkedQuote);

  return (
    <ol className="flex flex-col">
      {timeline.map((event, index) => {
        const isLast = index === timeline.length - 1;
        return (
          <li key={`${event.label}-${index}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${TIMELINE_DOT[event.tone]}`}
              >
                <Icon name={event.icon} size={14} />
              </span>
              {!isLast && (
                <span className="bg-outline-variant/60 mt-1 w-px flex-1" />
              )}
            </div>
            <div className={`min-w-0 ${isLast ? '' : 'pb-5'}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-on-surface text-[13.5px] font-bold">
                  {event.label}
                </span>
                {event.when && (
                  <span className="text-on-surface-variant text-[11.5px] tabular-nums">
                    {event.when}
                  </span>
                )}
              </div>
              <p className="text-on-surface-variant mt-0.5 text-xs">
                {event.detail}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ──────────────────────────────────────────────────────────
   InvoiceDetail
   ────────────────────────────────────────────────────────── */

export function InvoiceDetail({
  invoice,
  linkedQuote,
  quoteBilling,
}: {
  invoice: InvoiceWithCustomer;
  linkedQuote?: InvoiceFormQuoteOption | null;
  quoteBilling?: {
    billed_total_cents: number;
    remaining_total_cents: number;
    linked_invoice_count: number;
    current_stage_label: string | null;
  } | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isSending, startSendTransition] = useTransition();
  const [isMarkingPaid, startMarkPaidTransition] = useTransition();
  const [showMarkPaidForm, setShowMarkPaidForm] = useState(
    invoice.status === 'overdue'
  );
  const [paidDate, setPaidDate] = useState(
    invoice.paid_date ?? getSydneyTodayDateString()
  );
  const [paymentMethod, setPaymentMethod] = useState<
    NonNullable<InvoiceWithCustomer['payment_method']> | ''
  >(invoice.payment_method ?? '');

  const canMarkPaid = invoice.status === 'sent' || invoice.status === 'overdue';
  const linkedQuoteIncludedItems =
    linkedQuote?.line_items.filter(
      (item) => !item.is_optional || item.is_selected
    ) ?? [];
  const stageLabel =
    quoteBilling?.current_stage_label ?? invoice.quote_stage_label ?? null;

  async function confirmDelete() {
    setOpenDeleteDialog(false);
    setDeleting(true);
    try {
      const result = await deleteInvoice(invoice.id);
      if (result?.error) {
        setError(result.error);
      }
      setDeleting(false);
    } catch (deleteError) {
      if (isNextNavigationSignal(deleteError)) {
        throw deleteError;
      }

      setError(
        getActionError(
          deleteError,
          'Invoice could not be deleted. Please try again.'
        )
      );
      setDeleting(false);
    }
  }

  function handleSend() {
    startSendTransition(async () => {
      setError(null);
      try {
        const result = await sendInvoice(invoice.id);
        if (result?.error) setError(result.error);
      } catch (sendError) {
        if (isNextNavigationSignal(sendError)) {
          throw sendError;
        }

        setError(
          getActionError(
            sendError,
            'Invoice could not be sent. Please try again.'
          )
        );
      }
    });
  }

  function handleMarkPaid() {
    startMarkPaidTransition(async () => {
      setError(null);
      try {
        const result = await markInvoiceAsPaid(invoice.id, {
          paid_date: paidDate,
          payment_method: paymentMethod as NonNullable<
            InvoiceWithCustomer['payment_method']
          >,
        });
        if (result?.error) setError(result.error);
      } catch (paymentError) {
        if (isNextNavigationSignal(paymentError)) {
          throw paymentError;
        }

        setError(
          getActionError(
            paymentError,
            'Payment could not be recorded. Please try again.'
          )
        );
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-5 pb-10">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-on-surface-variant font-mono text-[10.5px] font-semibold tracking-[0.18em] uppercase">
              {invoice.invoice_number}
            </p>
            <h1 className="text-on-surface mt-1 truncate text-[22px] font-extrabold tracking-[-0.02em] sm:text-[26px]">
              {invoice.customer.name}
            </h1>
            <p className="text-on-surface-variant mt-1 text-sm">
              {INVOICE_TYPE_LABEL[invoice.invoice_type]} invoice
              {stageLabel ? ` · ${stageLabel}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={INVOICE_STATUS_TONE[invoice.status]}
              label={STATUS_LABEL[invoice.status]}
              size="md"
            />
            <a
              href={`/api/pdf/invoice?id=${invoice.id}`}
              target="_blank"
              rel="noreferrer"
              className={`${SECONDARY_BTN} flex-1 sm:flex-none`}
            >
              <Icon name="download" size={16} />
              PDF
            </a>
            {invoice.status === 'paid' && (
              <a
                href={`/api/pdf/invoice?id=${invoice.id}`}
                target="_blank"
                rel="noreferrer"
                className={`${SECONDARY_BTN} flex-1 sm:flex-none`}
              >
                <Icon name="download" size={16} />
                Download receipt
              </a>
            )}
            {invoice.status === 'draft' && (
              <Link
                href={`/invoices/${invoice.id}/edit`}
                className={`${SECONDARY_BTN} flex-1 sm:flex-none`}
              >
                Edit
              </Link>
            )}
            {invoice.status === 'draft' && (
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className={`${PRIMARY_BTN} flex-1 sm:flex-none`}
              >
                <Icon name="send" size={16} />
                {isSending ? 'Sending…' : 'Send invoice'}
              </button>
            )}
            {canMarkPaid && (
              <button
                type="button"
                onClick={() => setShowMarkPaidForm((prev) => !prev)}
                className={`${PRIMARY_BTN} flex-1 sm:flex-none`}
              >
                <Icon name="wallet" size={16} />
                {showMarkPaidForm ? 'Hide payment form' : 'Record payment'}
              </button>
            )}
          </div>
        </div>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        {/* ── Payment progress band ──────────────────────────── */}
        <PaymentProgressBand invoice={invoice} />

        {/* ── Record-payment form ────────────────────────────── */}
        {canMarkPaid && showMarkPaidForm && (
          <div className="border-outline-variant/60 bg-surface-container-low rounded-2xl border p-5">
            <p className="text-on-surface text-sm font-bold">Record payment</p>
            <p className="text-on-surface-variant mt-1 text-xs">
              Save the payment date and method so this invoice moves out of
              overdue and into paid history.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <SectionLabel as="span">Paid date</SectionLabel>
                <input
                  type="date"
                  value={paidDate}
                  onChange={(event) => setPaidDate(event.target.value)}
                  className="border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border px-4 text-base transition-colors outline-none focus:ring-2"
                />
              </label>
              <label className="space-y-1.5">
                <SectionLabel as="span">Payment method</SectionLabel>
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target.value as
                        | NonNullable<InvoiceWithCustomer['payment_method']>
                        | ''
                    )
                  }
                  className="border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border px-4 text-base transition-colors outline-none focus:ring-2"
                >
                  <option value="">Select payment method</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={handleMarkPaid}
                disabled={isMarkingPaid || !paidDate || !paymentMethod}
                className={PRIMARY_BTN}
              >
                {isMarkingPaid ? 'Saving payment…' : 'Save payment'}
              </button>
              <button
                type="button"
                onClick={() => setShowMarkPaidForm(false)}
                className={SECONDARY_BTN}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Body grid ──────────────────────────────────────── */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Left column */}
          <div className="flex flex-col gap-5">
            {/* Line items */}
            <Card title="Line items">
              <div className="border-outline-variant/60 hidden grid-cols-[minmax(0,1fr)_80px_110px_110px] gap-3 border-b pb-2 sm:grid">
                <SectionLabel as="span">Item</SectionLabel>
                <SectionLabel as="span" className="text-right">
                  Qty
                </SectionLabel>
                <SectionLabel as="span" className="text-right">
                  Rate
                </SectionLabel>
                <SectionLabel as="span" className="text-right">
                  Amount
                </SectionLabel>
              </div>
              {invoice.line_items.map((item) => (
                <div
                  key={item.id}
                  className="border-outline-variant/60 grid grid-cols-[minmax(0,1fr)_60px_90px] gap-x-3 gap-y-1 border-b py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_80px_110px_110px]"
                >
                  <div className="min-w-0">
                    <p className="text-on-surface text-sm font-semibold whitespace-pre-wrap">
                      {item.description}
                    </p>
                    <p className="text-on-surface-variant mt-0.5 text-xs">
                      GST {formatAUD(item.gst_cents)}
                    </p>
                  </div>
                  <p className="text-on-surface-variant text-right text-sm tabular-nums">
                    {item.quantity}
                  </p>
                  <p className="text-on-surface-variant hidden text-right text-sm tabular-nums sm:block">
                    {formatAUD(item.unit_price_cents)}
                  </p>
                  <p className="text-on-surface text-right text-sm font-bold tabular-nums">
                    {formatAUD(item.total_cents)}
                  </p>
                </div>
              ))}

              <div className="border-outline-variant mt-4 flex flex-col gap-2 border-t-2 pt-4">
                <div className="text-on-surface-variant flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span className="tabular-nums">
                    {formatAUD(invoice.subtotal_cents)}
                  </span>
                </div>
                <div className="text-on-surface-variant flex justify-between text-sm">
                  <span>GST (10%)</span>
                  <span className="tabular-nums">
                    {formatAUD(invoice.gst_cents)}
                  </span>
                </div>
                <div className="border-outline-variant/60 text-on-surface flex justify-between border-t pt-3 text-lg font-extrabold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatAUD(invoice.total_cents)}{' '}
                    <span className="text-on-surface-variant text-[11px] font-bold">
                      AUD
                    </span>
                  </span>
                </div>
              </div>
            </Card>

            {/* Activity */}
            <Card title="Activity">
              <ActivityTimeline invoice={invoice} linkedQuote={linkedQuote} />
            </Card>

            {/* Linked quote */}
            {linkedQuote && linkedQuoteIncludedItems.length > 0 && (
              <Card title="Linked quote">
                <p className="text-on-surface mb-3 text-sm font-semibold">
                  {linkedQuote.quote_number}
                  {linkedQuote.title ? ` — ${linkedQuote.title}` : ''}
                </p>
                <div className="flex flex-col">
                  {linkedQuoteIncludedItems.map((item, index) => (
                    <div
                      key={`${item.description}-${index}`}
                      className="border-outline-variant/60 border-b py-3 last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-on-surface text-sm font-semibold whitespace-pre-wrap">
                          {item.description}
                        </p>
                        <p className="text-on-surface shrink-0 text-sm font-bold tabular-nums">
                          {formatAUD(item.total_cents)}
                        </p>
                      </div>
                      <p className="text-on-surface-variant mt-0.5 text-xs">
                        Qty {item.quantity} × {formatAUD(item.unit_price_cents)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Notes */}
            {invoice.notes && (
              <Card title="Notes">
                <p className="text-on-surface text-sm leading-6 whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </Card>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-3.5">
            <MetaBox
              label="Customer"
              value={invoice.customer.name}
              sub={
                [invoice.customer.email, invoice.customer.phone]
                  .filter(Boolean)
                  .join(' · ') || undefined
              }
            />
            <MetaBox label="Site address" value={invoice.customer.address} />
            <MetaBox
              label="Dates"
              value={`Issued ${formatDate(invoice.created_at)}`}
              sub={
                invoice.paid_date
                  ? `Paid ${formatDate(invoice.paid_date)}`
                  : invoice.due_date
                    ? `Due ${formatDate(invoice.due_date)}`
                    : 'Not yet sent'
              }
            />
            {invoice.payment_method && (
              <MetaBox
                label="Payment method"
                value={PAYMENT_METHOD_LABEL[invoice.payment_method]}
              />
            )}
            {invoice.business_abn && (
              <MetaBox label="ABN" value={formatABN(invoice.business_abn)} />
            )}

            {linkedQuote && quoteBilling && (
              <Card title="Quote billing">
                <dl className="flex flex-col gap-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-on-surface-variant">Linked invoices</dt>
                    <dd className="text-on-surface font-semibold">
                      {quoteBilling.linked_invoice_count}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-on-surface-variant">Quote total</dt>
                    <dd className="text-on-surface font-semibold tabular-nums">
                      {formatAUD(linkedQuote.total_cents)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-on-surface-variant">
                      Already invoiced
                    </dt>
                    <dd className="text-on-surface font-semibold tabular-nums">
                      {formatAUD(quoteBilling.billed_total_cents)}
                    </dd>
                  </div>
                  <div className="border-outline-variant/60 flex items-center justify-between gap-3 border-t pt-3">
                    <dt className="text-on-surface font-bold">
                      Remaining on quote
                    </dt>
                    <dd className="text-primary text-base font-extrabold tabular-nums">
                      {formatAUD(quoteBilling.remaining_total_cents)}
                    </dd>
                  </div>
                </dl>
              </Card>
            )}

            {(invoice.payment_terms || invoice.bank_details) && (
              <Card title="Payment details">
                <div className="flex flex-col gap-4">
                  {invoice.payment_terms && (
                    <div>
                      <SectionLabel className="mb-1">Terms</SectionLabel>
                      <p className="text-on-surface text-sm leading-6 whitespace-pre-wrap">
                        {invoice.payment_terms}
                      </p>
                    </div>
                  )}
                  {invoice.bank_details && (
                    <div>
                      <SectionLabel className="mb-1">Bank</SectionLabel>
                      <p className="text-on-surface text-sm leading-6 whitespace-pre-wrap">
                        {invoice.bank_details}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* ── Footer note + delete ───────────────────────────── */}
        <div className="border-outline-variant/60 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-on-surface-variant text-xs">
            {invoice.status === 'draft'
              ? 'Sending this invoice will email it to the customer and mark it as sent.'
              : 'Sent, paid, overdue, and cancelled invoices are locked to preserve billing history.'}
          </p>
          <button
            type="button"
            onClick={() => setOpenDeleteDialog(true)}
            disabled={deleting}
            className="text-error hover:bg-error-container/50 focus-visible:ring-error/30 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
          >
            <Icon name="trash" size={16} />
            {deleting ? 'Deleting…' : 'Delete invoice'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={openDeleteDialog}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setOpenDeleteDialog(false)}
      />
    </>
  );
}
