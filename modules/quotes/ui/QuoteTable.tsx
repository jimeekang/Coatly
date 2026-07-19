'use client';

import { useDeferredValue, useState } from 'react';
import Link from 'next/link';
import {
  QUOTE_STATUS_LABELS,
  isQuoteExpired,
  type QuoteListItem,
  type QuoteStatus,
} from '@/modules/quotes/domain/quotes';
import { formatAUD, formatDate } from '@/utils/format';
import { DuplicateQuoteButton } from '@/modules/quotes/ui/DuplicateQuoteButton';
import { PrimaryActionLink } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionLabel } from '@/components/ui/SectionLabel';
import {
  QUOTE_STATUS_TONE,
  STATUS_TONE_BORDER,
} from '@/lib/constants/status-colors';

const STATUS_OPTIONS: Array<{ value: 'all' | QuoteStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

type DateFilter = 'all' | '30d' | '90d' | 'this_month';

const DATE_FILTER_OPTIONS: Array<{ value: DateFilter; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: 'this_month', label: 'This month' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
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
    const matchesSearch = normalizedQuery
      ? matchesQuery(quote, normalizedQuery)
      : true;
    const matchesDate = cutoff ? new Date(quote.created_at) >= cutoff : true;
    return matchesStatus && matchesSearch && matchesDate;
  });

  const hasActiveFilters =
    normalizedQuery || status !== 'all' || dateFilter !== 'all';

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
          placeholder="Search quotes..."
          className="border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border pr-12 pl-11 text-base transition-colors outline-none focus:ring-2"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface focus-visible:ring-primary/30 absolute top-0.5 right-0.5 flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
      {quotes.length === 0 ? (
        <div className="border-outline-variant bg-surface-container-low rounded-2xl border border-dashed py-16 text-center">
          <p className="text-on-surface-variant text-base">No quotes yet.</p>
          <p className="text-on-surface-variant mt-1 text-sm opacity-70">
            Create your first quote to get started.
          </p>
          <PrimaryActionLink href="/quotes/new" className="mt-4">
            + New Quote
          </PrimaryActionLink>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-outline-variant bg-surface-container-low rounded-2xl border border-dashed py-12 text-center">
          <p className="text-on-surface-variant text-base">
            No quotes match this search.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setStatus('all');
              setDateFilter('all');
            }}
            className="text-primary hover:bg-primary/10 focus-visible:ring-primary/30 mt-2 inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Clear search and filters
          </button>
        </div>
      ) : (
        <>
          {/* Card list */}
          <ul className="flex min-w-0 flex-col gap-3">
            {filtered.map((quote) => {
              const tone = QUOTE_STATUS_TONE[quote.status];
              const borderClass = STATUS_TONE_BORDER[tone];
              const expired = isQuoteExpired(quote.valid_until);
              return (
                <li
                  key={quote.id}
                  className={`border-outline-variant bg-surface-container-lowest relative min-w-0 rounded-2xl border border-l-4 shadow-sm transition-shadow hover:shadow-md ${borderClass}`}
                >
                  <Link
                    href={`/quotes/${quote.id}`}
                    className="focus-visible:ring-primary/30 block min-w-0 rounded-2xl p-3 pr-16 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:p-5 sm:pr-20"
                  >
                    <div className="mb-3 min-w-0">
                      <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2">
                        <SectionLabel className="truncate">
                          {quote.quote_number}
                        </SectionLabel>
                        <StatusBadge
                          tone={tone}
                          label={QUOTE_STATUS_LABELS[quote.status]}
                        />
                      </div>
                      <h3 className="text-on-surface truncate text-base leading-tight font-bold">
                        {quote.customer.company_name || quote.customer.name}
                      </h3>
                      <p className="text-on-surface-variant mt-0.5 truncate text-sm font-medium">
                        {quote.title || 'Untitled quote'}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="text-on-surface-variant flex min-w-0 items-center gap-1.5 text-xs font-medium">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect
                              x="3"
                              y="4"
                              width="18"
                              height="18"
                              rx="2"
                              ry="2"
                            />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          Created {formatDate(quote.created_at)}
                        </div>
                        {quote.valid_until && (
                          <div
                            className={`flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-medium ${
                              quote.status === 'expired'
                                ? 'text-error'
                                : 'text-on-surface-variant'
                            }`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {quote.status === 'expired'
                              ? 'Expired on'
                              : 'Valid until'}{' '}
                            {formatDate(quote.valid_until)}
                            {expired && quote.status !== 'expired' && (
                              <span className="text-error text-[10px] font-bold tracking-widest uppercase">
                                Overdue
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 sm:text-right">
                        <SectionLabel>Amount</SectionLabel>
                        <p className="text-on-surface text-base font-extrabold sm:text-lg">
                          {formatAUD(quote.total_cents)}{' '}
                          <span className="text-on-surface-variant text-[10px] font-bold">
                            AUD
                          </span>
                        </p>
                      </div>
                    </div>
                  </Link>
                  {/* Duplicate button — sits outside the Link to prevent event bubbling */}
                  <div className="absolute right-3 top-3 sm:right-5 sm:top-5">
                    <DuplicateQuoteButton quoteId={quote.id} variant="icon" />
                  </div>
                </li>
              );
            })}
          </ul>

          {hasActiveFilters && (
            <p className="text-on-surface-variant text-right text-xs">
              {filtered.length} of {quotes.length} quotes
            </p>
          )}
        </>
      )}
    </div>
  );
}
