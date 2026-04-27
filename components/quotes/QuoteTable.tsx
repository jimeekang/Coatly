'use client';

import { useDeferredValue, useState } from 'react';
import Link from 'next/link';
import {
  QUOTE_STATUS_LABELS,
  isQuoteExpired,
  type QuoteListItem,
  type QuoteStatus,
} from '@/lib/quotes';
import { formatAUD, formatDate } from '@/utils/format';
import { DuplicateQuoteButton } from '@/components/quotes/DuplicateQuoteButton';

const QUOTE_STATUS_STYLES: Record<QuoteStatus, string> = {
  draft:    'bg-surface-container-highest text-on-surface-variant',
  sent:     'bg-primary/10 text-primary',
  approved: 'bg-success-container text-success',
  rejected: 'bg-error-container text-error',
  expired:  'bg-surface-container-highest text-on-surface-variant',
};

const QUOTE_LEFT_BORDER: Record<QuoteStatus, string> = {
  draft:    'border-l-outline',
  sent:     'border-l-primary',
  approved: 'border-l-success',
  rejected: 'border-l-error',
  expired:  'border-l-outline',
};

const STATUS_OPTIONS: Array<{ value: 'all' | QuoteStatus; label: string }> = [
  { value: 'all',      label: 'All' },
  { value: 'draft',    label: 'Draft' },
  { value: 'sent',     label: 'Sent' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired',  label: 'Expired' },
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

function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const style = QUOTE_STATUS_STYLES[status] ?? 'bg-surface-container-high text-on-surface-variant';
  return (
    <span className={`inline-flex max-w-full rounded px-2.5 py-1 text-[10px] font-bold uppercase ${style}`}>
      {QUOTE_STATUS_LABELS[status]}
    </span>
  );
}

function matchesQuery(quote: QuoteListItem, query: string) {
  const value = query.toLowerCase();
  return (
    quote.quote_number.toLowerCase().includes(value) ||
    (quote.title?.toLowerCase().includes(value) ?? false) ||
    quote.customer.name.toLowerCase().includes(value) ||
    (quote.customer.company_name?.toLowerCase().includes(value) ?? false)
  );
}

export function QuoteTable({ quotes }: { quotes: QuoteListItem[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | QuoteStatus>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim();

  const cutoff = getDateFilterCutoff(dateFilter);

  const filtered = quotes.filter((quote) => {
    const matchesStatus = status === 'all' ? true : quote.status === status;
    const matchesSearch = normalizedQuery ? matchesQuery(quote, normalizedQuery) : true;
    const matchesDate = cutoff ? new Date(quote.created_at) >= cutoff : true;
    return matchesStatus && matchesSearch && matchesDate;
  });

  const hasActiveFilters = normalizedQuery || status !== 'all' || dateFilter !== 'all';

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
      {/* Search */}
      <div className="relative min-w-0">
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
          placeholder="Search quotes..."
          className="w-full rounded-lg border-none bg-surface-container py-3.5 pl-11 pr-4 text-sm text-on-surface outline-none transition-all placeholder:text-outline focus:ring-2 focus:ring-primary/20 sm:py-4 sm:pl-12"
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
      <div className="flex min-w-0 flex-wrap gap-1.5 sm:gap-2">
        {STATUS_OPTIONS.map((option) => {
          const active = status === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`min-h-8 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors sm:px-4 sm:py-1.5 sm:text-xs ${
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
      <div className="flex min-w-0 flex-wrap gap-1.5 sm:gap-2">
        {DATE_FILTER_OPTIONS.map((option) => {
          const active = dateFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setDateFilter(option.value)}
              className={`min-h-8 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors sm:px-4 sm:py-1.5 sm:text-xs ${
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
      {quotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low py-16 text-center">
          <p className="text-base text-on-surface-variant">No quotes yet.</p>
          <p className="mt-1 text-sm text-on-surface-variant opacity-70">
            Create your first quote to get started.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low py-12 text-center">
          <p className="text-base text-on-surface-variant">No quotes match this search.</p>
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
          <ul className="flex min-w-0 flex-col gap-3">
            {filtered.map((quote) => {
              const borderClass = QUOTE_LEFT_BORDER[quote.status] ?? 'border-l-outline';
              const expired = isQuoteExpired(quote.valid_until);
              return (
                <li
                  key={quote.id}
                  className={`relative min-w-0 rounded-lg border border-l-4 border-black/5 bg-surface-container-lowest shadow-sm transition-shadow hover:shadow-md ${borderClass}`}
                >
                  <Link
                    href={`/quotes/${quote.id}`}
                    className="block min-w-0 p-3 pr-12 sm:p-5 sm:pr-14"
                  >
                    <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold uppercase text-outline sm:text-[11px]">
                          {quote.quote_number}
                        </p>
                        <h3 className="truncate text-base font-bold leading-tight text-on-surface">
                          {quote.customer.company_name || quote.customer.name}
                        </h3>
                        <p className="mt-0.5 truncate text-sm font-medium text-on-surface-variant">
                          {quote.title || 'Untitled quote'}
                        </p>
                      </div>
                      <QuoteStatusBadge status={quote.status} />
                    </div>
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-outline">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          Created {formatDate(quote.created_at)}
                        </div>
                        {quote.valid_until && (
                          <div className={`flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-medium ${
                            quote.status === 'expired' ? 'text-error' : 'text-outline'
                          }`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            {quote.status === 'expired' ? 'Expired on' : 'Valid until'}{' '}
                            {formatDate(quote.valid_until)}
                            {expired && quote.status !== 'expired' && (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-error">Overdue</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 sm:text-right">
                        <p className="text-[10px] text-outline font-bold uppercase tracking-wider">Amount</p>
                        <p className="text-base font-extrabold text-on-surface sm:text-lg">
                          {formatAUD(quote.total_cents)}{' '}
                          <span className="text-[10px] font-bold text-outline">AUD</span>
                        </p>
                      </div>
                    </div>
                  </Link>
                  {/* Duplicate button — sits outside the Link to prevent event bubbling */}
                  <div className="absolute right-3 top-3">
                    <DuplicateQuoteButton quoteId={quote.id} variant="icon" />
                  </div>
                </li>
              );
            })}
          </ul>

          {hasActiveFilters && (
            <p className="text-xs text-on-surface-variant text-right">
              {filtered.length} of {quotes.length} quotes
            </p>
          )}
        </>
      )}
    </div>
  );
}
