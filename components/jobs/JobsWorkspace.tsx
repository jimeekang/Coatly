'use client';

import { useDeferredValue, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createJob, deleteJob, updateJob } from '@/app/actions/jobs';
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

const STATUS_STYLES: Record<JobStatus, string> = {
  scheduled: 'bg-sky-50 text-sky-700 border-sky-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

function buildInitialFormState(
  quotes: JobQuoteOption[],
  quoteId?: string | null,
  customerId?: string | null,
): JobFormState {
  const matchedQuote = quoteId ? quotes.find((quote) => quote.id === quoteId) : null;

  return {
    title: '',
    customer_id: matchedQuote?.customer_id ?? customerId ?? '',
    quote_id: matchedQuote?.id ?? '',
    status: 'scheduled',
    scheduled_date: '',
    notes: '',
  };
}

function buildEditFormState(job: JobListItem): JobFormState {
  return {
    title: job.title,
    customer_id: job.customer_id,
    quote_id: job.quote_id ?? '',
    status: job.status,
    scheduled_date: job.scheduled_date,
    notes: job.notes ?? '',
  };
}

function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] font-semibold uppercase tracking-wider ${STATUS_STYLES[status]}`}
    >
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}

function getCustomerLabel(customer: JobCustomerOption) {
  return customer.company_name || customer.name;
}

function isPastScheduled(job: JobListItem) {
  if (job.status === 'completed' || job.status === 'cancelled') {
    return false;
  }

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
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [form, setForm] = useState<JobFormState>(() =>
    buildInitialFormState(quotes, initialQuoteId, initialCustomerId),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const filteredQuotes = quotes.filter((quote) =>
    form.customer_id ? quote.customer_id === form.customer_id : true,
  );

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = statusFilter === 'all' ? true : job.status === statusFilter;
    const matchesQuery = normalizedQuery
      ? [
          job.title,
          job.customer.name,
          job.customer.company_name,
          job.quote?.quote_number,
          job.quote?.title,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery))
      : true;

    return matchesStatus && matchesQuery;
  });

  function clearPrefillRoute() {
    if (initialQuoteId || initialCustomerId) {
      router.replace('/jobs', { scroll: false });
    }
  }

  function resetCreateForm(closeForm: boolean) {
    setEditingJobId(null);
    setFormError(null);
    setForm(buildInitialFormState(quotes, null, null));
    setFormOpen(!closeForm);
  }

  function openCreateForm() {
    setEditingJobId(null);
    setFormError(null);
    setForm(buildInitialFormState(quotes, initialQuoteId, initialCustomerId));
    setFormOpen(true);
  }

  function openEditForm(job: JobListItem) {
    setEditingJobId(job.id);
    setFormError(null);
    setForm(buildEditFormState(job));
    setFormOpen(true);
  }

  function handleCustomerChange(customerId: string) {
    setForm((current) => {
      const selectedQuote = quotes.find((quote) => quote.id === current.quote_id);
      const nextQuoteId =
        selectedQuote && selectedQuote.customer_id === customerId ? current.quote_id : '';

      return {
        ...current,
        customer_id: customerId,
        quote_id: nextQuoteId,
      };
    });
  }

  function handleQuoteChange(quoteId: string) {
    const selectedQuote = quotes.find((quote) => quote.id === quoteId);

    setForm((current) => ({
      ...current,
      quote_id: quoteId,
      customer_id: selectedQuote?.customer_id ?? current.customer_id,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    startTransition(() => {
      void (async () => {
        const payload = {
          customer_id: form.customer_id,
          quote_id: form.quote_id || null,
          title: form.title,
          status: form.status,
          scheduled_date: form.scheduled_date,
          notes: form.notes,
        };

        const result = editingJobId
          ? await updateJob(editingJobId, payload)
          : await createJob(payload);

        if (result.error) {
          setFormError(result.error);
          return;
        }

        clearPrefillRoute();
        resetCreateForm(true);
        router.refresh();
      })();
    });
  }

  function handleDelete(job: JobListItem) {
    const confirmed = window.confirm(
      `Delete "${job.title}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setFormError(null);

    startTransition(() => {
      void (async () => {
        const result = await deleteJob(job.id);
        if (result.error) {
          setFormError(result.error);
          return;
        }

        if (editingJobId === job.id) {
          resetCreateForm(true);
        }

        router.refresh();
      })();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-pm-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pm-secondary">
              Live Jobs
            </p>
            <p className="mt-1 text-sm text-pm-secondary">
              Create, update, and track site work without leaving the workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-pm-teal px-4 text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover"
          >
            {editingJobId ? 'New Job' : 'Create Job'}
          </button>
        </div>

        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search jobs, customers, or quotes..."
            className="h-12 w-full rounded-xl border border-pm-border bg-pm-surface px-4 text-sm text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTER_OPTIONS.map((option) => {
            const active = statusFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-pm-body text-white'
                    : 'bg-pm-surface text-pm-secondary hover:bg-pm-border'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-pm-border bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-pm-body">
                {editingJobId ? 'Edit Job' : 'Create Job'}
              </h2>
              <p className="mt-1 text-sm text-pm-secondary">
                Keep the next site visit, prep day, or handover visible for the team.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                clearPrefillRoute();
                resetCreateForm(true);
              }}
              className="min-h-11 rounded-xl border border-pm-border px-4 text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface"
            >
              Cancel
            </button>
          </div>

          {initialQuoteId && !editingJobId && (
            <div className="rounded-xl border border-pm-teal/20 bg-pm-teal/5 px-4 py-3 text-sm text-pm-body">
              Quote pre-selected from the quote detail page. Choose a date and save to add
              it to the job list.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-pm-body">
              Job Title
              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="e.g. Harbour kitchen repaint"
                className="h-12 rounded-xl border border-pm-border bg-white px-4 text-sm font-normal text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-pm-body">
              Scheduled Date
              <input
                type="date"
                value={form.scheduled_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scheduled_date: event.target.value,
                  }))
                }
                className="h-12 rounded-xl border border-pm-border bg-white px-4 text-sm font-normal text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-pm-body">
              Customer
              <select
                value={form.customer_id}
                onChange={(event) => handleCustomerChange(event.target.value)}
                className="h-12 rounded-xl border border-pm-border bg-white px-4 text-sm font-normal text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {getCustomerLabel(customer)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-pm-body">
              Linked Quote
              <select
                value={form.quote_id}
                onChange={(event) => handleQuoteChange(event.target.value)}
                className="h-12 rounded-xl border border-pm-border bg-white px-4 text-sm font-normal text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
              >
                <option value="">No linked quote</option>
                {filteredQuotes.map((quote) => (
                  <option key={quote.id} value={quote.id}>
                    {quote.quote_number}
                    {quote.title ? ` · ${quote.title}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {(Object.keys(JOB_STATUS_LABELS) as JobStatus[]).map((status) => {
              const active = form.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      status,
                    }))
                  }
                  className={`min-h-11 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? 'border-pm-teal bg-pm-teal/10 text-pm-teal'
                      : 'border-pm-border bg-white text-pm-secondary hover:bg-pm-surface'
                  }`}
                >
                  {JOB_STATUS_LABELS[status]}
                </button>
              );
            })}
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-pm-body">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              rows={4}
              placeholder="Site access, paint spec, or handover notes"
              className="rounded-xl border border-pm-border bg-white px-4 py-3 text-sm font-normal text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
            />
          </label>

          {formError && (
            <div className="rounded-xl border border-pm-coral bg-pm-coral-light px-4 py-3">
              <p className="text-sm text-pm-coral-dark">{formError}</p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-pm-body px-5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : editingJobId ? 'Save Changes' : 'Save Job'}
            </button>
          </div>
        </form>
      )}

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-pm-border bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-base font-semibold text-pm-body">No jobs yet.</p>
          <p className="mt-2 text-sm text-pm-secondary">
            Create your first scheduled job to track site work from quote to completion.
          </p>
          <button
            type="button"
            onClick={openCreateForm}
            className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl bg-pm-teal px-5 text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover"
          >
            Create First Job
          </button>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-pm-border bg-white px-6 py-10 text-center shadow-sm">
          <p className="text-base font-semibold text-pm-body">No jobs match this filter.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setStatusFilter('all');
            }}
            className="mt-3 text-sm font-medium text-pm-teal hover:underline"
          >
            Clear search and filters
          </button>
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {filteredJobs.map((job) => (
            <li
              key={job.id}
              className="rounded-2xl border border-pm-border bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pm-secondary">
                      {job.quote?.quote_number ?? 'Standalone Job'}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-pm-body">{job.title}</h3>
                    <p className="mt-1 text-sm text-pm-secondary">
                      {getCustomerLabel(job.customer)}
                    </p>
                  </div>
                  <JobStatusBadge status={job.status} />
                </div>

                <div className="grid gap-3 rounded-xl bg-pm-surface p-4 text-sm text-pm-body">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-pm-secondary">Scheduled</span>
                    <span className="font-medium">{formatDate(job.scheduled_date)}</span>
                  </div>

                  {job.quote && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-pm-secondary">Quote</span>
                      <span className="text-right font-medium">
                        {job.quote.quote_number}
                        {job.quote.title ? ` · ${job.quote.title}` : ''}
                      </span>
                    </div>
                  )}

                  {job.customer.address && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-pm-secondary">Address</span>
                      <span className="max-w-[70%] text-right font-medium">
                        {job.customer.address}
                      </span>
                    </div>
                  )}
                </div>

                {isPastScheduled(job) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    This job is scheduled in the past and still open.
                  </div>
                )}

                {job.notes && (
                  <p className="rounded-xl border border-pm-border bg-white px-4 py-3 text-sm text-pm-secondary">
                    {job.notes}
                  </p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => openEditForm(job)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-pm-border px-4 text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(job)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
