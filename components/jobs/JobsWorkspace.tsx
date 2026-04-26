'use client';

import { useDeferredValue, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createJob } from '@/app/actions/jobs';
import {
  JOB_STATUS_LABELS,
  type JobCustomerOption,
  type JobListItem,
  type JobQuoteOption,
  type JobStatus,
} from '@/lib/jobs';
import { formatDate } from '@/utils/format';

type JobFilterStatus = 'all' | JobStatus;

type JobFormState = {
  title: string;
  customer_id: string;
  quote_id: string;
  status: JobStatus;
  scheduled_date: string;
  notes: string;
};

const STATUS_FILTER_OPTIONS: Array<{ value: JobFilterStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGE_STYLES: Record<JobStatus, string> = {
  scheduled: 'bg-sky-50 text-sky-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-surface-container-highest text-on-surface-variant',
};

const JOB_LEFT_BORDER: Record<JobStatus, string> = {
  scheduled: 'border-l-sky-400',
  in_progress: 'border-l-amber-400',
  completed: 'border-l-emerald-500',
  cancelled: 'border-l-outline',
};

function buildInitialFormState(
  quotes: JobQuoteOption[],
  quoteId?: string | null,
  customerId?: string | null,
): JobFormState {
  const matchedQuote = quoteId ? quotes.find((q) => q.id === quoteId) : null;
  return {
    title: '',
    customer_id: matchedQuote?.customer_id ?? customerId ?? '',
    quote_id: matchedQuote?.id ?? '',
    status: 'scheduled',
    scheduled_date: '',
    notes: '',
  };
}

function getCustomerLabel(customer: JobCustomerOption) {
  return customer.company_name || customer.name;
}

function isPastScheduled(job: JobListItem) {
  if (job.status === 'completed' || job.status === 'cancelled') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduled = new Date(`${job.scheduled_date}T00:00:00`);
  return scheduled < today;
}

export function JobsWorkspace({
  jobs,
  customers,
  quotes,
  initialQuoteId,
  initialCustomerId,
}: {
  jobs: JobListItem[];
  customers: JobCustomerOption[];
  quotes: JobQuoteOption[];
  initialQuoteId?: string | null;
  initialCustomerId?: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobFilterStatus>('all');
  const [formOpen, setFormOpen] = useState(
    Boolean(initialQuoteId || initialCustomerId || jobs.length === 0),
  );
  const [form, setForm] = useState<JobFormState>(() =>
    buildInitialFormState(quotes, initialQuoteId, initialCustomerId),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const filteredQuotes = quotes.filter((q) =>
    form.customer_id ? q.customer_id === form.customer_id : true,
  );

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = statusFilter === 'all' ? true : job.status === statusFilter;
    const matchesQuery = normalizedQuery
      ? [job.title, job.customer.name, job.customer.company_name, job.quote?.quote_number, job.quote?.title]
          .filter(Boolean)
          .some((v) => v?.toLowerCase().includes(normalizedQuery))
      : true;
    return matchesStatus && matchesQuery;
  });

  function clearPrefillRoute() {
    if (initialQuoteId || initialCustomerId) {
      router.replace('/jobs', { scroll: false });
    }
  }

  function handleCustomerChange(customerId: string) {
    setForm((cur) => {
      const selectedQuote = quotes.find((q) => q.id === cur.quote_id);
      const nextQuoteId =
        selectedQuote && selectedQuote.customer_id === customerId ? cur.quote_id : '';
      return { ...cur, customer_id: customerId, quote_id: nextQuoteId };
    });
  }

  function handleQuoteChange(quoteId: string) {
    const selectedQuote = quotes.find((q) => q.id === quoteId);
    setForm((cur) => ({
      ...cur,
      quote_id: quoteId,
      customer_id: selectedQuote?.customer_id ?? cur.customer_id,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    startTransition(() => {
      void (async () => {
        const result = await createJob({
          customer_id: form.customer_id,
          quote_id: form.quote_id || null,
          title: form.title,
          status: form.status,
          scheduled_date: form.scheduled_date,
          notes: form.notes,
        });
        if (result.error) {
          setFormError(result.error);
          return;
        }
        clearPrefillRoute();
        setFormOpen(false);
        setForm(buildInitialFormState(quotes, null, null));
        router.refresh();
      })();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header row with New Job button */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
          {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
        </p>
        {!formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:opacity-90"
          >
            New Job
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3">
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
            placeholder="Search jobs, customers, or quotes..."
            className="w-full bg-surface-container border-none rounded-lg py-4 pl-12 pr-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-on-surface"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {STATUS_FILTER_OPTIONS.map((option) => {
            const active = statusFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
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
      </div>

      {/* Create form */}
      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-outline-variant bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Create Job</h2>
              <p className="mt-0.5 text-sm text-on-surface-variant">
                Keep the next site visit, prep day, or handover visible.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { clearPrefillRoute(); setFormOpen(false); }}
              className="min-h-10 rounded-lg border border-outline-variant px-4 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
            >
              Cancel
            </button>
          </div>

          {initialQuoteId && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-on-surface">
              Quote pre-selected. Choose a date and save to add it to the job list.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-on-surface">
              Job Title
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                placeholder="e.g. Harbour kitchen repaint"
                className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-on-surface">
              Scheduled Date
              <input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => setForm((c) => ({ ...c, scheduled_date: e.target.value }))}
                className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-on-surface">
              Customer
              <select
                value={form.customer_id}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="">Select a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{getCustomerLabel(c)}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-on-surface">
              Linked Quote
              <select
                value={form.quote_id}
                onChange={(e) => handleQuoteChange(e.target.value)}
                className="h-11 rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="">No linked quote</option>
                {filteredQuotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quote_number}{q.title ? ` · ${q.title}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {(Object.keys(JOB_STATUS_LABELS) as JobStatus[]).map((status) => {
              const active = form.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setForm((c) => ({ ...c, status }))}
                  className={`min-h-10 rounded-full border px-4 text-xs font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  {JOB_STATUS_LABELS[status]}
                </button>
              );
            })}
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-on-surface">
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
              rows={3}
              placeholder="Site access, paint spec, or handover notes"
              className="rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm font-normal text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </label>

          {formError && (
            <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3">
              <p className="text-sm text-on-error-container">{formError}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Job'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low py-16 text-center">
          <p className="text-base text-on-surface-variant">No jobs yet.</p>
          <p className="mt-1 text-sm text-on-surface-variant opacity-70">
            Create your first scheduled job to track site work from quote to completion.
          </p>
          {!formOpen && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:opacity-90"
            >
              Create First Job
            </button>
          )}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low py-12 text-center">
          <p className="text-base text-on-surface-variant">No jobs match this filter.</p>
          <button
            type="button"
            onClick={() => { setQuery(''); setStatusFilter('all'); }}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Clear search and filters
          </button>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {filteredJobs.map((job) => (
              <li
                key={job.id}
                className={`relative bg-surface-container-lowest rounded-lg shadow-sm border border-black/5 border-l-4 ${JOB_LEFT_BORDER[job.status]} hover:shadow-md transition-shadow`}
              >
                <Link href={`/jobs/${job.id}`} className="block p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-outline">
                        {job.quote?.quote_number ?? 'Standalone Job'}
                      </p>
                      <h3 className="font-bold text-on-surface text-base leading-tight mt-0.5">
                        {job.title}
                      </h3>
                      <p className="text-on-surface-variant text-sm font-medium mt-0.5">
                        {getCustomerLabel(job.customer)}
                      </p>
                    </div>
                    <span className={`inline-flex rounded px-3 py-1 text-[10px] font-bold uppercase tracking-widest shrink-0 ml-3 ${STATUS_BADGE_STYLES[job.status]}`}>
                      {JOB_STATUS_LABELS[job.status]}
                    </span>
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
                        Scheduled {formatDate(job.scheduled_date)}
                      </div>
                      {job.start_date && job.end_date && (
                        <div className="flex items-center gap-1.5 text-outline text-xs font-medium">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {formatDate(job.start_date)} → {formatDate(job.end_date)}
                          {job.duration_days ? ` (${job.duration_days}d)` : ''}
                        </div>
                      )}
                      {job.customer.address && (
                        <p className="text-xs text-outline mt-0.5 truncate max-w-[240px]">
                          {job.customer.address}
                        </p>
                      )}
                    </div>
                    {isPastScheduled(job) && (
                      <span className="rounded-full bg-warning-container px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning shrink-0">
                        Overdue
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {(normalizedQuery || statusFilter !== 'all') && (
            <p className="text-xs text-on-surface-variant text-right">
              {filteredJobs.length} of {jobs.length} jobs
            </p>
          )}
        </>
      )}
    </div>
  );
}
