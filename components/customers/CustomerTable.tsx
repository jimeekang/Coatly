'use client';

import { useDeferredValue, useState } from 'react';
import Link from 'next/link';
import type { Customer, CustomerRecentJob } from '@/app/actions/customers';

interface CustomerTableProps {
  customers: Customer[];
  recentJobs?: Record<string, CustomerRecentJob>;
}

type SortMode = 'alpha' | 'newest';

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'alpha', label: 'A – Z' },
  { value: 'newest', label: 'Newest' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function getPrimaryContact(c: Customer): string | null {
  return c.emails?.[0] || c.email || c.phones?.[0] || c.phone || null;
}

function getPrimaryPhone(c: Customer): string | null {
  return c.phones?.[0] || c.phone || null;
}

function formatAddress(c: Customer): string {
  const property = c.properties?.[0] ?? null;
  const parts = property
    ? [property.address_line1, property.city, property.state].filter(Boolean)
    : [c.address_line1, c.city, c.state].filter(Boolean);
  return parts.join(', ') || '';
}

function matchesQuery(c: Customer, q: string): boolean {
  const lower = q.toLowerCase();
  return (
    c.name.toLowerCase().includes(lower) ||
    (c.company_name?.toLowerCase().includes(lower) ?? false) ||
    (c.email?.toLowerCase().includes(lower) ?? false) ||
    (c.emails?.some((e) => e.toLowerCase().includes(lower)) ?? false) ||
    (c.phone?.includes(lower) ?? false) ||
    (c.phones?.some((p) => p.includes(lower)) ?? false) ||
    (c.city?.toLowerCase().includes(lower) ?? false)
  );
}

const RECENT_JOB_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-surface-container-highest text-on-surface-variant',
  sent: 'bg-primary/10 text-primary',
  approved: 'bg-success-container text-success',
  paid: 'bg-success-container text-success',
  overdue: 'bg-warning-container text-warning',
  rejected: 'bg-error-container text-error',
  cancelled: 'bg-surface-container-highest text-on-surface-variant',
};

function CustomerRow({
  customer,
  recentJob,
}: {
  customer: Customer;
  recentJob?: CustomerRecentJob;
}) {
  const initials = getInitials(customer.name);
  const phone = getPrimaryPhone(customer);
  const primaryContact = getPrimaryContact(customer);
  const address = formatAddress(customer);

  return (
    <li className="relative bg-surface-container-lowest rounded-lg shadow-sm border border-black/5 border-l-4 border-l-primary hover:shadow-md transition-shadow">
      <Link href={`/customers/${customer.id}`} className="block p-5">
        {/* Top row: avatar + main info */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-10 h-10 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary text-sm font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-on-surface text-base leading-tight truncate">
                {customer.company_name || customer.name}
              </h3>
              {customer.company_name && (
                <p className="text-on-surface-variant text-sm font-medium truncate mt-0.5">
                  {customer.name}
                </p>
              )}
            </div>
          </div>
          {/* Recent job badge */}
          {recentJob && (
            <div className="shrink-0 flex flex-col items-end gap-1">
              <p className="text-[10px] text-outline font-bold uppercase tracking-wider">
                {recentJob.type === 'quote' ? 'Quote' : 'Invoice'}
              </p>
              <span
                className={`inline-flex rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                  RECENT_JOB_STATUS_STYLES[recentJob.status.toLowerCase()] ??
                  'bg-surface-container-highest text-on-surface-variant'
                }`}
              >
                {recentJob.status}
              </span>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {phone && (
            <div className="flex items-center gap-1.5 text-outline text-xs font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l.93-.93a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              {phone}
            </div>
          )}
          {!phone && primaryContact && (
            <div className="flex items-center gap-1.5 text-outline text-xs font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              {primaryContact}
            </div>
          )}
          {address && (
            <div className="flex items-center gap-1.5 text-outline text-xs font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {address}
            </div>
          )}
          {recentJob && (
            <div className="flex items-center gap-1.5 text-outline text-xs font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
              {recentJob.number}{recentJob.title ? ` · ${recentJob.title}` : ''}
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}

export function CustomerTable({ customers, recentJobs }: CustomerTableProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('alpha');
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim();

  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low py-20 text-center">
        <p className="text-base text-on-surface-variant">No customers yet.</p>
        <p className="mt-1 text-sm text-on-surface-variant opacity-70">
          Add your first customer to start creating quotes and invoices.
        </p>
      </div>
    );
  }

  const filtered = normalizedQuery
    ? customers.filter((c) => matchesQuery(c, normalizedQuery))
    : customers;

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'alpha') return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    return b.created_at.localeCompare(a.created_at);
  });

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
          placeholder="Search by name, email or phone…"
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

      {/* Sort chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {SORT_OPTIONS.map((option) => {
          const active = sort === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSort(option.value)}
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

      {/* Empty search state */}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low py-12 text-center">
          <p className="text-base text-on-surface-variant">No customers match this search.</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {sorted.map((c) => (
              <CustomerRow key={c.id} customer={c} recentJob={recentJobs?.[c.id]} />
            ))}
          </ul>
          {normalizedQuery && (
            <p className="text-xs text-on-surface-variant text-right">
              {sorted.length} of {customers.length} customers
            </p>
          )}
        </>
      )}
    </div>
  );
}
