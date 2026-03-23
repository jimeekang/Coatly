'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  QUOTE_STATUS_LABELS,
  type QuoteListItem,
  type QuoteStatus,
} from '@/lib/quotes';
import { formatAUD, formatDate } from '@/utils/format';

const QUOTE_STATUS_STYLES: Record<QuoteStatus, string> = {
  draft: 'bg-pm-surface text-pm-secondary',
  sent: 'bg-pm-teal-light text-pm-teal',
  accepted: 'bg-pm-teal-mid text-white',
  declined: 'bg-pm-coral-light text-pm-coral-mid',
  expired: 'bg-pm-surface text-pm-secondary',
};

const STATUS_OPTIONS: Array<{ value: 'all' | QuoteStatus; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
];

function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const style = QUOTE_STATUS_STYLES[status] ?? 'bg-pm-surface text-pm-secondary';
  return (
    <span className={`inline-flex rounded px-2.5 py-1 text-xs font-medium capitalize ${style}`}>
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

  const filtered = quotes.filter((quote) => {
    const matchesStatus = status === 'all' ? true : quote.status === status;
    const matchesSearch = query.trim() ? matchesQuery(quote, query.trim()) : true;
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
        <div className="relative">
          <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-pm-secondary">
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by quote number, title, or customer..."
            className="w-full h-12 rounded-lg border border-pm-border bg-white pl-10 pr-4 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-3.5 flex items-center text-pm-secondary hover:text-pm-body"
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

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as 'all' | QuoteStatus)}
          className="h-12 rounded-lg border border-pm-border bg-white px-4 text-base text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
          aria-label="Filter by quote status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-pm-border bg-pm-surface py-16 text-center">
          <p className="text-base text-pm-secondary">No quotes yet.</p>
          <p className="mt-1 text-sm text-pm-secondary opacity-70">
            Create your first quote to get started.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-pm-border bg-pm-surface py-12 text-center">
          <p className="text-base text-pm-secondary">No quotes match this search.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setStatus('all');
            }}
            className="mt-2 text-sm text-pm-teal-hover hover:underline"
          >
            Clear search and filters
          </button>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3 sm:hidden">
            {filtered.map((quote) => (
              <li key={quote.id}>
                <Link
                  href={`/quotes/${quote.id}`}
                  className="flex items-center justify-between rounded-xl border border-pm-border bg-white px-4 py-4 transition-colors hover:bg-pm-teal-light active:bg-pm-teal-light"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-pm-body">{quote.quote_number}</p>
                    <p className="truncate text-sm text-pm-secondary">
                      {quote.title || quote.customer.company_name || quote.customer.name}
                    </p>
                    <div className="mt-1.5">
                      <QuoteStatusBadge status={quote.status} />
                    </div>
                  </div>
                  <div className="ml-3 text-right shrink-0">
                    <p className="text-sm font-semibold text-pm-body">
                      {formatAUD(quote.total_cents)}
                    </p>
                    <svg
                      className="ml-auto mt-2 text-pm-secondary"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-xl border border-pm-border bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-pm-border bg-pm-surface">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                    Quote
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                    Status
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                    Valid Until
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                    Total
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-pm-border">
                {filtered.map((quote) => (
                  <tr key={quote.id} className="transition-colors hover:bg-pm-teal-light">
                    <td className="px-5 py-4">
                      <p className="font-medium text-pm-body">{quote.quote_number}</p>
                      <p className="mt-0.5 text-xs text-pm-secondary">
                        {quote.title || 'Untitled quote'}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-pm-secondary">
                      {quote.customer.company_name || quote.customer.name}
                    </td>
                    <td className="px-5 py-4">
                      <QuoteStatusBadge status={quote.status} />
                    </td>
                    <td className="px-5 py-4 text-pm-secondary">
                      {quote.valid_until ? formatDate(quote.valid_until) : '-'}
                    </td>
                    <td className="px-5 py-4 font-medium text-pm-body">
                      {formatAUD(quote.total_cents)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/quotes/${quote.id}`}
                        className="font-medium text-pm-teal-hover hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(query.trim() || status !== 'all') && (
            <p className="text-xs text-pm-secondary text-right">
              {filtered.length} of {quotes.length} quotes
            </p>
          )}
        </>
      )}
    </div>
  );
}
