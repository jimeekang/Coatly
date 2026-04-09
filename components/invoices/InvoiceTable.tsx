'use client';

import { useDeferredValue, useState } from 'react';
import Link from 'next/link';
import type { InvoiceListItem, InvoiceStatus } from '@/types/invoice';
import { formatCustomerLocation } from '@/lib/invoices';
import { formatAUD, formatDate } from '@/utils/format';

const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft:     'bg-secondary/10 text-secondary',
  sent:      'bg-primary/10 text-primary',
  paid:      'bg-tertiary/10 text-tertiary',
  overdue:   'bg-error/10 text-error',
  cancelled: 'bg-surface-container-high text-on-surface-variant',
};

const INVOICE_LEFT_BORDER: Record<InvoiceStatus, string> = {
  draft:     'border-l-secondary',
  sent:      'border-l-primary',
  paid:      'border-l-tertiary',
  overdue:   'border-l-error',
  cancelled: 'border-l-outline',
};

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
  const style = INVOICE_STATUS_STYLES[status] ?? 'bg-surface-container-high text-on-surface-variant';
  return (
    <span className={`inline-flex rounded px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${style}`}>
      {STATUS_LABELS[status]}
    </span>
  );
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
          placeholder="Search invoices..."
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
              className={`px-5 py-2 rounded-lg text-sm font-bold tracking-tight whitespace-nowrap transition-colors ${
                active
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
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
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-tight whitespace-nowrap transition-colors border ${
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-outline-variant bg-transparent text-on-surface-variant hover:bg-surface-container-high'
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
              const borderClass = INVOICE_LEFT_BORDER[invoice.status] ?? 'border-l-outline';
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
                        <p className="text-on-surface-variant text-sm font-medium mt-0.5 capitalize">
                          {invoice.invoice_type} invoice
                        </p>
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
