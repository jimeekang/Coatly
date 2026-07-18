'use client';

import { useDeferredValue, useState, useTransition } from 'react';
import Link from 'next/link';
import { markInvoiceAsPaid } from '@/modules/invoices/application/actions';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionLabel } from '@/components/ui/SectionLabel';
import {
  INVOICE_STATUS_TONE,
  STATUS_TONE_BORDER,
} from '@/lib/constants/status-colors';
import {
  formatCustomerLocation,
  getInvoiceDueLabel,
  getSydneyTodayDateString,
  type InvoiceDueTone,
} from '@/modules/invoices/domain/invoices';
import type {
  InvoiceListItem,
  InvoiceStatus,
} from '@/modules/invoices/domain/invoice';
import { formatAUD, formatDate } from '@/utils/format';

const ICON_PROPS = {
  width: 13,
  height: 13,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...ICON_PROPS}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...ICON_PROPS}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...ICON_PROPS}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...ICON_PROPS}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </svg>
  );
}

const DUE_TONE_CLASS: Record<InvoiceDueTone, string> = {
  overdue: 'text-warning font-semibold',
  'due-soon': 'text-warning font-semibold',
  due: 'text-on-surface-variant font-medium',
  paid: 'text-on-surface-variant font-medium',
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

const STATUS_OPTIONS: Array<{ value: 'all' | InvoiceStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

type DateFilter = 'all' | '30d' | '90d' | 'this_month';

const DATE_FILTER_OPTIONS: Array<{ value: DateFilter; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: 'this_month', label: 'This month' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

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

function getActionError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return typeof error === 'string' && error
    ? error
    : 'Payment could not be recorded. Please try again.';
}

function getDateFilterCutoff(filter: DateFilter): Date | null {
  const now = new Date();
  if (filter === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  if (filter === '90d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 90);
    return d;
  }
  if (filter === 'this_month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

function matchesQuery(invoice: InvoiceListItem, query: string) {
  const value = query.toLowerCase();
  const location = formatCustomerLocation(invoice.customer).toLowerCase();
  return (
    invoice.invoice_number.toLowerCase().includes(value) ||
    invoice.customer.name.toLowerCase().includes(value) ||
    (invoice.customer.email?.toLowerCase().includes(value) ?? false) ||
    location.includes(value) ||
    invoice.invoice_type.toLowerCase().includes(value)
  );
}

export function InvoiceTable({ invoices }: { invoices: InvoiceListItem[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | InvoiceStatus>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [activePaymentInvoiceId, setActivePaymentInvoiceId] = useState<
    string | null
  >(null);
  const [paidDate, setPaidDate] = useState(getSydneyTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState<
    'bank_transfer' | 'cash' | 'card' | 'cheque' | 'other' | ''
  >('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [isSubmittingPayment, startSubmitPaymentTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim();

  const cutoff = getDateFilterCutoff(dateFilter);

  const filtered = invoices.filter((invoice) => {
    const matchesStatus = status === 'all' ? true : invoice.status === status;
    const matchesSearch = normalizedQuery
      ? matchesQuery(invoice, normalizedQuery)
      : true;
    const matchesDate = cutoff ? new Date(invoice.created_at) >= cutoff : true;
    return matchesStatus && matchesSearch && matchesDate;
  });

  const hasActiveFilters =
    normalizedQuery || status !== 'all' || dateFilter !== 'all';

  function openMarkPaidForm(invoice: InvoiceListItem) {
    setActionError(null);
    setActivePaymentInvoiceId(invoice.id);
    setPaidDate(invoice.paid_date ?? getSydneyTodayDateString());
    setPaymentMethod(invoice.payment_method ?? '');
  }

  function closeMarkPaidForm() {
    setActionError(null);
    setActivePaymentInvoiceId(null);
    setPendingInvoiceId(null);
    setPaymentMethod('');
  }

  function handleMarkPaid(invoiceId: string) {
    startSubmitPaymentTransition(async () => {
      setActionError(null);
      setPendingInvoiceId(invoiceId);
      try {
        const result = await markInvoiceAsPaid(invoiceId, {
          paid_date: paidDate,
          payment_method: paymentMethod as
            | 'bank_transfer'
            | 'cash'
            | 'card'
            | 'cheque'
            | 'other',
        });
        if (result?.error) {
          setActionError(result.error);
        }
        setPendingInvoiceId(null);
      } catch (paymentError) {
        if (isNextNavigationSignal(paymentError)) {
          throw paymentError;
        }

        setActionError(getActionError(paymentError));
        setPendingInvoiceId(null);
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
      {/* Search */}
      <div className="relative min-w-0">
        <span className="text-on-surface-variant pointer-events-none absolute inset-y-0 left-4 flex items-center">
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
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by invoice, customer, or type..."
          className="border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border pr-12 pl-11 text-base transition-colors outline-none focus:ring-2"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface focus-visible:ring-primary/30 absolute top-0.5 right-0.5 flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Clear search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Status filter chips */}
      <div className="flex min-w-0 flex-wrap gap-1.5 sm:gap-2">
        {STATUS_OPTIONS.map((option) => {
          const active = status === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`focus-visible:ring-primary/30 min-h-11 rounded-full border px-3 py-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-4 ${
                active
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Date filter chips */}
      <div className="flex min-w-0 flex-wrap gap-1.5 sm:gap-2">
        {DATE_FILTER_OPTIONS.map((option) => {
          const active = dateFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setDateFilter(option.value)}
              className={`focus-visible:ring-primary/30 min-h-11 rounded-full border px-3 py-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-4 ${
                active
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Empty states */}
      {invoices.length === 0 ? (
        <div className="border-outline-variant bg-surface-container-low rounded-2xl border border-dashed px-5 py-16 text-center">
          <p className="text-on-surface-variant text-base">No invoices yet.</p>
          <p className="text-on-surface-variant mt-1 text-sm opacity-70">
            Create your first invoice to start tracking payments.
          </p>
          <Link
            href="/invoices/new"
            className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 active:bg-primary/90 mt-5 inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            + New Invoice
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-outline-variant bg-surface-container-low rounded-2xl border border-dashed py-12 text-center">
          <p className="text-on-surface-variant text-base">
            No invoices match this search.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setStatus('all');
              setDateFilter('all');
            }}
            className="text-primary hover:bg-primary/10 focus-visible:ring-primary/30 mt-2 inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Clear search and filters
          </button>
        </div>
      ) : (
        <>
          {/* Card list */}
          <ul className="flex min-w-0 flex-col gap-3">
            {filtered.map((invoice) => {
              const statusTone =
                INVOICE_STATUS_TONE[invoice.status] ?? 'neutral';
              const borderClass = STATUS_TONE_BORDER[statusTone];
              const canQuickMarkPaid =
                invoice.status === 'sent' || invoice.status === 'overdue';
              const isPaymentFormOpen = activePaymentInvoiceId === invoice.id;
              const dueLabel = getInvoiceDueLabel(invoice);
              const isPaid = invoice.status === 'paid';
              const isPartiallyPaid =
                invoice.amount_paid_cents > 0 &&
                invoice.amount_paid_cents < invoice.total_cents;
              return (
                <li
                  key={invoice.id}
                  className={`border-outline-variant/60 bg-surface-container-lowest relative min-w-0 rounded-2xl border border-l-4 shadow-sm transition-shadow hover:shadow-md ${borderClass}`}
                >
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="focus-visible:ring-primary/30 block min-w-0 rounded-2xl p-3 focus-visible:ring-2 focus-visible:outline-none sm:p-5"
                  >
                    <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-on-surface-variant truncate text-[10px] font-bold uppercase sm:text-[11px]">
                          {invoice.invoice_number}
                        </p>
                        <h3 className="text-on-surface truncate text-base leading-tight font-bold">
                          {invoice.customer.name}
                        </h3>
                        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2">
                          <p className="text-on-surface-variant truncate text-sm font-medium capitalize">
                            {invoice.invoice_type} invoice
                          </p>
                          {invoice.quote_stage_label && (
                            <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase">
                              {invoice.quote_stage_label}
                            </span>
                          )}
                        </div>
                      </div>
                      <StatusBadge
                        tone={statusTone}
                        label={STATUS_LABELS[invoice.status]}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="text-on-surface-variant flex min-w-0 items-center gap-1.5 text-xs font-medium">
                          <CalendarIcon />
                          Created {formatDate(invoice.created_at)}
                        </div>
                        {dueLabel && (
                          <div
                            className={`flex min-w-0 items-center gap-1.5 text-xs ${DUE_TONE_CLASS[dueLabel.tone]}`}
                          >
                            {dueLabel.tone === 'overdue' ? (
                              <AlertTriangleIcon />
                            ) : (
                              <ClockIcon />
                            )}
                            {dueLabel.text}
                          </div>
                        )}
                        {isPartiallyPaid && (
                          <div className="text-on-surface-variant flex min-w-0 items-center gap-1.5 text-xs font-medium">
                            <WalletIcon />
                            {formatAUD(invoice.amount_paid_cents)} of{' '}
                            {formatAUD(invoice.total_cents)} received
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 sm:text-right">
                        <p className="text-on-surface-variant text-[10px] font-bold tracking-wider uppercase">
                          {isPaid ? 'Paid' : 'Balance'}
                        </p>
                        <p className="text-on-surface text-base font-extrabold tabular-nums sm:text-lg">
                          {formatAUD(
                            isPaid ? invoice.total_cents : invoice.balance_cents
                          )}{' '}
                          <span className="text-on-surface-variant text-[10px] font-bold">
                            AUD
                          </span>
                        </p>
                      </div>
                    </div>
                  </Link>
                  {canQuickMarkPaid && (
                    <div className="border-outline-variant/40 border-t px-3 py-3 sm:px-5 sm:py-4">
                      {!isPaymentFormOpen ? (
                        <button
                          type="button"
                          onClick={() => openMarkPaidForm(invoice)}
                          className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:w-auto"
                        >
                          Mark as Paid
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <SectionLabel>Record Payment</SectionLabel>
                          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                            <label className="space-y-1.5">
                              <span className="text-on-surface-variant text-xs font-medium">
                                Paid date
                              </span>
                              <input
                                type="date"
                                value={paidDate}
                                onChange={(event) =>
                                  setPaidDate(event.target.value)
                                }
                                className="border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border px-4 text-base transition-colors outline-none focus:ring-2"
                              />
                            </label>
                            <label className="space-y-1.5">
                              <span className="text-on-surface-variant text-xs font-medium">
                                Payment method
                              </span>
                              <select
                                value={paymentMethod}
                                onChange={(event) =>
                                  setPaymentMethod(
                                    event.target.value as
                                      | 'bank_transfer'
                                      | 'cash'
                                      | 'card'
                                      | 'cheque'
                                      | 'other'
                                      | ''
                                  )
                                }
                                className="border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border px-4 text-base transition-colors outline-none focus:ring-2"
                              >
                                <option value="">Select method</option>
                                <option value="bank_transfer">
                                  Bank transfer
                                </option>
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="cheque">Cheque</option>
                                <option value="other">Other</option>
                              </select>
                            </label>
                          </div>
                          {actionError && (
                            <ErrorAlert>{actionError}</ErrorAlert>
                          )}
                          <div className="grid gap-2 sm:flex sm:flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(invoice.id)}
                              disabled={
                                isSubmittingPayment ||
                                pendingInvoiceId === invoice.id ||
                                !paidDate ||
                                !paymentMethod
                              }
                              className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
                            >
                              {isSubmittingPayment &&
                              pendingInvoiceId === invoice.id
                                ? 'Saving...'
                                : 'Save Payment'}
                            </button>
                            <button
                              type="button"
                              onClick={closeMarkPaidForm}
                              className="border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low focus-visible:ring-primary/30 inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {hasActiveFilters && (
            <p className="text-on-surface-variant text-right text-xs">
              {filtered.length} of {invoices.length} invoices
            </p>
          )}
        </>
      )}
    </div>
  );
}
