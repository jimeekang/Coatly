'use client';

import { useDeferredValue, useState } from 'react';
import Link from 'next/link';
import type { InvoiceListItem, InvoiceStatus } from '@/types/invoice';
import { formatCustomerLocation } from '@/lib/invoices';
import { formatAUD, formatDate } from '@/utils/format';

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: 'bg-pm-surface text-pm-secondary',
  sent: 'bg-pm-teal-light text-pm-teal',
  paid: 'bg-pm-teal-mid text-white',
  overdue: 'bg-pm-coral-light text-pm-coral-mid',
  cancelled: 'bg-pm-surface text-pm-secondary',
};

const STATUS_OPTIONS: Array<{ value: 'all' | InvoiceStatus; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex rounded px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      {status}
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
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim();

  const filtered = invoices.filter((invoice) => {
    const matchesStatus = status === 'all' ? true : invoice.status === status;
    const matchesSearch = normalizedQuery ? matchesQuery(invoice, normalizedQuery) : true;
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-pm-secondary">
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
            placeholder="Search by invoice, customer, type, or suburb..."
            className="h-12 w-full rounded-lg border border-pm-border bg-white pl-10 pr-4 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
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
          onChange={(event) => setStatus(event.target.value as 'all' | InvoiceStatus)}
          className="h-12 rounded-lg border border-pm-border bg-white px-4 text-base text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30"
          aria-label="Filter by invoice status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-pm-border bg-pm-surface py-16 text-center">
          <p className="text-base text-pm-secondary">No invoices yet.</p>
          <p className="mt-1 text-sm text-pm-secondary opacity-70">
            Create your first invoice to start tracking payments.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-pm-border bg-pm-surface py-12 text-center">
          <p className="text-base text-pm-secondary">No invoices match this search.</p>
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
            {filtered.map((invoice) => (
              <li key={invoice.id}>
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="block rounded-xl border border-pm-border bg-white px-4 py-4 transition-colors hover:bg-pm-teal-light active:bg-pm-teal-light"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-pm-body">
                        {invoice.invoice_number}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-pm-secondary">
                        {invoice.customer.name}
                      </p>
                    </div>
                    <StatusBadge status={invoice.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-pm-secondary">Total</p>
                      <p className="mt-0.5 font-semibold text-pm-body">
                        {formatAUD(invoice.total_cents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-pm-secondary">Balance</p>
                      <p className="mt-0.5 font-semibold text-pm-body">
                        {formatAUD(invoice.balance_cents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-pm-secondary">Due</p>
                      <p className="mt-0.5 text-sm text-pm-body">
                        {invoice.due_date ? formatDate(invoice.due_date) : 'No due date'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-pm-secondary">Location</p>
                      <p className="mt-0.5 truncate text-sm text-pm-body">
                        {formatCustomerLocation(invoice.customer)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-xs capitalize text-pm-secondary">
                      {invoice.invoice_type}
                    </span>
                    <span className="text-xs font-medium text-pm-teal-hover">View invoice →</span>
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
                    Invoice
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                    Status
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                    Due Date
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                    Total
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                    Balance
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                    Items
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-pm-border">
                {filtered.map((invoice) => (
                  <tr key={invoice.id} className="transition-colors hover:bg-pm-teal-light">
                    <td className="px-5 py-4">
                      <div className="font-medium text-pm-body">{invoice.invoice_number}</div>
                      <div className="mt-0.5 text-xs capitalize text-pm-secondary">
                        {invoice.invoice_type}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-pm-secondary">
                      <div className="text-pm-body">{invoice.customer.name}</div>
                      <div className="mt-0.5 text-xs text-pm-secondary">
                        {formatCustomerLocation(invoice.customer)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-5 py-4 text-pm-secondary">
                      {invoice.due_date ? formatDate(invoice.due_date) : 'No due date'}
                    </td>
                    <td className="px-5 py-4 font-medium text-pm-body">
                      {formatAUD(invoice.total_cents)}
                    </td>
                    <td className="px-5 py-4 font-medium text-pm-body">
                      {formatAUD(invoice.balance_cents)}
                    </td>
                    <td className="px-5 py-4 text-pm-secondary">{invoice.line_item_count}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="inline-flex items-center gap-1 font-medium text-pm-teal-hover hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(normalizedQuery || status !== 'all') && (
            <p className="text-right text-xs text-pm-secondary">
              {filtered.length} of {invoices.length} invoices
            </p>
          )}
        </>
      )}
    </div>
  );
}
