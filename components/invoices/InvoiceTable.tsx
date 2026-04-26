'use client';

import { useDeferredValue, useState, useTransition } from 'react';
import Link from 'next/link';
import { markInvoiceAsPaid } from '@/app/actions/invoices';
import { formatCustomerLocation, getSydneyTodayDateString } from '@/lib/invoices';
import type { InvoiceListItem, InvoiceStatus } from '@/types/invoice';
import { formatAUD, formatDate } from '@/utils/format';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { INVOICE_STATUS_TONE, STATUS_TONE_BORDER } from '@/lib/constants/status-colors';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft:     'Draft',
  sent:      'Sent',
  paid:      'Paid',
  overdue:   'Overdue',
  cancelled: 'Cancelled',
};

const STATUS_OPTIONS: Array<{ value: 'all' | InvoiceStatus; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'draft',     label: 'Draft' },
  { value: 'sent',      label: 'Sent' },
  { value: 'paid',      label: 'Paid' },
  { value: 'overdue',   label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

type DateFilter = 'all' | '30d' | '90d' | 'this_month';

const DATE_FILTER_OPTIONS: Array<{ value: DateFilter; label: string }> = [
  { value: 'all',        label: 'All time' },
  { value: 'this_month', label: 'This month' },
  { value: '30d',        label: 'Last 30 days' },
  { value: '90d',        label: 'Last 90 days' },
];

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

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <StatusBadge tone={INVOICE_STATUS_TONE[status] ?? 'neutral'} label={STATUS_LABELS[status]} />;
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
  const [activePaymentInvoiceId, setActivePaymentInvoiceId] = useState<string | null>(null);
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
    const matchesSearch = normalizedQuery ? matchesQuery(invoice, normalizedQuery) : true;
    const matchesDate = cutoff ? new Date(invoice.created_at) >= cutoff : true;
    return matchesStatus && matchesSearch && matchesDate;
  });

  const hasActiveFilters = normalizedQuery || status !== 'all' || dateFilter !== 'all';

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
      const result = await markInvoiceAsPaid(invoiceId, {
        paid_date: paidDate,
        payment_method: paymentMethod as 'bank_transfer' | 'cash' | 'card' | 'cheque' | 'other',
      });
      if (result?.error) {
        setActionError(result.error);
        setPendingInvoiceId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <div className="relative">
        <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by invoice, customer, or type..."
          className="w-full bg-surface-container border-none rounded-lg py-4 pl-12 pr-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-on-surface"
            aria-label="Clear search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {STATUS_OPTIONS.map((option) => {
          const active = status === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                active
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-white text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Date filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {DATE_FILTER_OPTIONS.map((option) => {
          const active = dateFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setDateFilter(option.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                active
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-white text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Empty states */}
      {invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low py-16 text-center">
          <p className="text-base text-on-surface-variant">No invoices yet.</p>
          <p className="mt-1 text-sm text-on-surface-variant opacity-70">
            Create your first invoice to start tracking payments.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low py-12 text-center">
          <p className="text-base text-on-surface-variant">No invoices match this search.</p>
          <button
            type="button"
            onClick={() => { setQuery(''); setStatus('all'); setDateFilter('all'); }}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Clear search and filters
          </button>
        </div>
      ) : (
        <>
          {/* Card list */}
          <ul className="flex flex-col gap-3">
            {filtered.map((invoice) => {
              const borderClass = STATUS_TONE_BORDER[INVOICE_STATUS_TONE[invoice.status] ?? 'neutral'];
              const canQuickMarkPaid = invoice.status === 'sent' || invoice.status === 'overdue';
              const isPaymentFormOpen = activePaymentInvoiceId === invoice.id;
              return (
                <li
                  key={invoice.id}
                  className={`relative bg-surface-container-lowest rounded-lg shadow-sm border border-black/5 border-l-4 ${borderClass} hover:shadow-md transition-shadow`}
                >
                  <Link href={`/invoices/${invoice.id}`} className="block p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-outline">
                          {invoice.invoice_number}
                        </p>
                        <h3 className="font-bold text-on-surface text-base leading-tight">
                          {invoice.customer.name}
                        </h3>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <p className="text-on-surface-variant text-sm font-medium capitalize">
                            {invoice.invoice_type} invoice
                          </p>
                          {invoice.quote_stage_label && (
                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                              {invoice.quote_stage_label}
                            </span>
                          )}
                        </div>
                      </div>
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-outline text-xs font-medium">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          Created {formatDate(invoice.created_at)}
                        </div>
                        {invoice.due_date && (
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${
                            invoice.status === 'overdue' ? 'text-error' : 'text-outline'
                          }`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            Due {formatDate(invoice.due_date)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-outline font-bold uppercase tracking-wider">Balance</p>
                        <p className="text-lg font-extrabold text-on-surface tracking-tight">
                          {formatAUD(invoice.balance_cents)}{' '}
                          <span className="text-[10px] font-bold text-outline">AUD</span>
                        </p>
                      </div>
                    </div>
                  </Link>
                  {canQuickMarkPaid && (
                    <div className="border-t border-outline-variant/40 px-5 py-4">
                      {!isPaymentFormOpen ? (
                        <button
                          type="button"
                          onClick={() => openMarkPaidForm(invoice)}
                          className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:opacity-90"
                        >
                          Mark as Paid
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                            Record Payment
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="space-y-1.5">
                              <span className="text-xs font-medium text-on-surface-variant">
                                Paid date
                              </span>
                              <input
                                type="date"
                                value={paidDate}
                                onChange={(event) => setPaidDate(event.target.value)}
                                className="h-11 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                              />
                            </label>
                            <label className="space-y-1.5">
                              <span className="text-xs font-medium text-on-surface-variant">
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
                                className="h-11 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary"
                              >
                                <option value="">Select method</option>
                                <option value="bank_transfer">Bank transfer</option>
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="cheque">Cheque</option>
                                <option value="other">Other</option>
                              </select>
                            </label>
                          </div>
                          {actionError && (
                            <p className="text-sm text-error">{actionError}</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(invoice.id)}
                              disabled={
                                isSubmittingPayment ||
                                pendingInvoiceId === invoice.id ||
                                !paidDate ||
                                !paymentMethod
                              }
                              className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:opacity-90 disabled:opacity-60"
                            >
                              {isSubmittingPayment && pendingInvoiceId === invoice.id
                                ? 'Saving...'
                                : 'Save Payment'}
                            </button>
                            <button
                              type="button"
                              onClick={closeMarkPaidForm}
                              className="inline-flex h-11 items-center rounded-lg border border-outline-variant bg-white px-4 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
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
            <p className="text-xs text-on-surface-variant text-right">
              {filtered.length} of {invoices.length} invoices
            </p>
          )}
        </>
      )}
    </div>
  );
}
