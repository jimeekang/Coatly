import type { Metadata } from 'next';
import { getJobFormOptions, getJobs } from '@/app/actions/jobs';
import { JobsWorkspace } from '@/components/jobs/JobsWorkspace';

export const metadata: Metadata = { title: 'Jobs' };

export default async function JobsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    quoteId?: string;
    customerId?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const [jobsResult, optionsResult] = await Promise.all([getJobs(), getJobFormOptions()]);

  const requestedQuoteId = typeof params.quoteId === 'string' ? params.quoteId : null;
  const requestedCustomerId =
    typeof params.customerId === 'string' ? params.customerId : null;
  const selectedQuote =
    optionsResult.data.quotes.find((quote) => quote.id === requestedQuoteId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">Jobs</h1>
        <p className="mt-1 text-sm text-on-surface-variant font-medium">
          Track active work, site progress, and quote handover from one place.
        </p>
      </div>

      {jobsResult.error && (
        <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3">
          <p className="text-sm text-on-error-container">{jobsResult.error}</p>
        </div>
      )}

      {optionsResult.error && (
        <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3">
          <p className="text-sm text-on-error-container">{optionsResult.error}</p>
        </div>
      )}

      <JobsWorkspace
        jobs={jobsResult.data}
        customers={optionsResult.data.customers}
        quotes={optionsResult.data.quotes}
        initialQuoteId={selectedQuote?.id ?? null}
        initialCustomerId={selectedQuote?.customer_id ?? requestedCustomerId}
      />
    </div>
  );
}
