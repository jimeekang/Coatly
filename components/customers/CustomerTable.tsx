'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Customer } from '@/app/actions/customers';

interface CustomerTableProps {
  customers: Customer[];
}

function formatAddress(c: Customer): string {
  const parts = [c.city, c.state].filter(Boolean);
  return parts.join(', ') || '—';
}

function matchesQuery(c: Customer, q: string): boolean {
  const lower = q.toLowerCase();
  return (
    c.name.toLowerCase().includes(lower) ||
    (c.company_name?.toLowerCase().includes(lower) ?? false) ||
    (c.email?.toLowerCase().includes(lower) ?? false) ||
    (c.phone?.includes(lower) ?? false) ||
    (c.city?.toLowerCase().includes(lower) ?? false)
  );
}

export function CustomerTable({ customers }: CustomerTableProps) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? customers.filter((c) => matchesQuery(c, query.trim()))
    : customers;

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
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
          placeholder="Search by name, company, email, phone or suburb…"
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

      {customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-pm-border bg-pm-surface py-16 text-center">
          <p className="text-pm-secondary text-base">No customers yet.</p>
          <p className="text-pm-secondary text-sm mt-1 opacity-70">Add your first customer to get started.</p>
        </div>
      ) : filtered.length === 0 ? (
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
          {/* Mobile cards */}
          <ul className="flex flex-col gap-3 sm:hidden">
            {filtered.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/customers/${c.id}`}
                  className="flex items-center justify-between rounded-xl border border-pm-border bg-white px-4 py-4 transition-colors hover:bg-pm-teal-light active:bg-pm-teal-light"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-pm-body truncate">{c.name}</p>
                    {c.company_name && (
                      <p className="text-sm text-pm-secondary truncate">{c.company_name}</p>
                    )}
                    <p className="text-sm text-pm-secondary mt-0.5">{formatAddress(c)}</p>
                  </div>
                  <svg className="ml-3 shrink-0 text-pm-secondary" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-pm-border bg-white">
            <table className="w-full text-sm text-left">
              <thead className="bg-pm-surface border-b border-pm-border">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">Name</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">Company</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">Email</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">Phone</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary">Location</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-pm-border">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-pm-teal-light transition-colors">
                    <td className="px-5 py-4 font-medium text-pm-body">{c.name}</td>
                    <td className="px-5 py-4 text-pm-secondary">{c.company_name || '—'}</td>
                    <td className="px-5 py-4 text-pm-secondary">{c.email || '—'}</td>
                    <td className="px-5 py-4 text-pm-secondary">{c.phone || '—'}</td>
                    <td className="px-5 py-4 text-pm-secondary">{formatAddress(c)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/customers/${c.id}`}
                        className="inline-flex items-center gap-1 text-pm-teal-hover font-medium hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {query.trim() && (
            <p className="text-xs text-pm-secondary text-right">
              {filtered.length} of {customers.length} customers
            </p>
          )}
        </>
      )}
    </div>
  );
}
