'use client';

import { useDeferredValue, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Customer, CustomerRecentJob } from '@/app/actions/customers';

interface CustomerTableProps {
  customers: Customer[];
  recentJobs?: Record<string, CustomerRecentJob>;
}

type SortMode = 'alpha' | 'newest';

function formatAddress(c: Customer): string {
  const property = c.properties?.[0] ?? null;
  const parts = property
    ? [property.address_line1, property.city, property.state].filter(Boolean)
    : [c.address_line1, c.city, c.state].filter(Boolean);
  return parts.join(', ') || '';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function matchesQuery(c: Customer, q: string): boolean {
  const lower = q.toLowerCase();
  return (
    c.name.toLowerCase().includes(lower) ||
    (c.company_name?.toLowerCase().includes(lower) ?? false) ||
    (c.email?.toLowerCase().includes(lower) ?? false) ||
    (c.emails?.some((email) => email.toLowerCase().includes(lower)) ?? false) ||
    (c.phone?.includes(lower) ?? false) ||
    (c.phones?.some((phone) => phone.includes(lower)) ?? false) ||
    (c.city?.toLowerCase().includes(lower) ?? false) ||
    (c.properties?.some((property) =>
      [
        property.label,
        property.address_line1,
        property.address_line2,
        property.city,
        property.state,
        property.postcode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(lower)
    ) ?? false)
  );
}

const STATUS_STYLES: Record<string, string> = {
  // quotes
  draft: 'bg-pm-surface text-pm-secondary border border-pm-border',
  sent: 'bg-blue-50 text-blue-700 border border-blue-200',
  approved: 'bg-pm-teal-light text-pm-teal border border-pm-teal-pale',
  declined: 'bg-red-50 text-red-600 border border-red-200',
  // invoices
  paid: 'bg-green-50 text-green-700 border border-green-200',
  overdue: 'bg-orange-50 text-orange-700 border border-orange-200',
  cancelled: 'bg-pm-surface text-pm-secondary border border-pm-border',
};

function RecentJobBadge({ job }: { job: CustomerRecentJob }) {
  const router = useRouter();
  const label = job.title ? `${job.number} · ${job.title}` : job.number;
  const statusClass =
    STATUS_STYLES[job.status.toLowerCase()] ??
    'bg-pm-surface text-pm-secondary border border-pm-border';

  const href = job.type === 'quote' ? `/quotes/${job.id}` : `/invoices/${job.id}`;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-pm-secondary uppercase tracking-wide font-medium">
        {job.type === 'quote' ? 'Quote' : 'Invoice'}
      </span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); router.push(href); }}
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium truncate max-w-40 ${statusClass}`}
      >
        {label}
      </button>
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}>
        {job.status}
      </span>
    </div>
  );
}

function CustomerCard({
  customer,
  recentJob,
}: {
  customer: Customer;
  recentJob?: CustomerRecentJob;
}) {
  const initials = getInitials(customer.name);
  const address = formatAddress(customer);
  const primaryContact =
    customer.emails?.[0] || customer.email || customer.phones?.[0] || customer.phone || null;

  return (
    <Link
      href={`/customers/${customer.id}`}
      className="flex flex-col gap-3 rounded-xl border border-pm-border bg-white p-4 transition-colors hover:bg-pm-teal-light active:bg-pm-teal-light"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="shrink-0 w-10 h-10 rounded-full bg-pm-teal-light flex items-center justify-center">
          <span className="text-sm font-semibold text-pm-teal">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-pm-body leading-tight truncate">{customer.name}</p>
          {customer.company_name && (
            <p className="text-xs text-pm-secondary truncate mt-0.5">{customer.company_name}</p>
          )}
        </div>
        <svg
          className="shrink-0 text-pm-secondary mt-0.5"
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

      {/* Address */}
      {address && (
        <div className="flex items-start gap-2">
          <svg
            className="shrink-0 mt-0.5 text-pm-secondary"
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
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <p className="text-sm text-pm-secondary truncate">{address}</p>
        </div>
      )}

      {/* Recent job */}
      {recentJob && <RecentJobBadge job={recentJob} />}

      {/* Contact */}
      {primaryContact && !recentJob && (
        <p className="text-sm text-pm-secondary truncate">{primaryContact}</p>
      )}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-pm-border bg-pm-surface py-20 px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white border border-pm-border">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-pm-secondary"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <p className="text-base font-semibold text-pm-body">No customers yet</p>
      <p className="mt-1 text-sm text-pm-secondary max-w-xs">
        Add your first customer to start creating quotes and invoices.
      </p>
      <Link
        href="/customers/new"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-pm-teal px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover active:bg-pm-teal-hover"
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
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add First Customer
      </Link>
    </div>
  );
}

export function CustomerTable({ customers, recentJobs }: CustomerTableProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('alpha');
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim();

  const filtered = normalizedQuery
    ? customers.filter((c) => matchesQuery(c, normalizedQuery))
    : customers;

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'alpha') {
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    }
    // newest: created_at desc
    return b.created_at.localeCompare(a.created_at);
  });

  if (customers.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-pm-secondary">
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
            className="w-full h-12 rounded-lg border border-pm-border bg-white pl-10 pr-4 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-3.5 flex items-center text-pm-secondary hover:text-pm-body"
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-pm-border bg-white p-1 shrink-0">
          <button
            type="button"
            onClick={() => setSort('alpha')}
            className={`flex items-center gap-1.5 rounded-md px-3 h-9 text-sm font-medium transition-colors ${
              sort === 'alpha'
                ? 'bg-pm-teal text-white'
                : 'text-pm-secondary hover:text-pm-body hover:bg-pm-surface'
            }`}
          >
            A → Z
          </button>
          <button
            type="button"
            onClick={() => setSort('newest')}
            className={`flex items-center gap-1.5 rounded-md px-3 h-9 text-sm font-medium transition-colors ${
              sort === 'newest'
                ? 'bg-pm-teal text-white'
                : 'text-pm-secondary hover:text-pm-body hover:bg-pm-surface'
            }`}
          >
            Newest
          </button>
        </div>
      </div>

      {/* No results */}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-pm-border bg-pm-surface py-12 text-center">
          <p className="text-pm-secondary text-base">No results for &ldquo;{query}&rdquo;</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-2 text-sm text-pm-teal-hover hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <>
          {/* Card grid */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sorted.map((c) => (
              <li key={c.id}>
                <CustomerCard
                  customer={c}
                  recentJob={recentJobs?.[c.id]}
                />
              </li>
            ))}
          </ul>

          {normalizedQuery && (
            <p className="text-xs text-pm-secondary text-right">
              {sorted.length} of {customers.length} customers
            </p>
          )}
        </>
      )}
    </div>
  );
}
