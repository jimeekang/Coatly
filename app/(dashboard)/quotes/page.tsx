import Link from 'next/link';
import type { Metadata } from 'next';
import { getQuotes } from '@/app/actions/quotes';
import { QuoteTable } from '@/components/quotes/QuoteTable';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { getMonthlyActiveQuoteUsageForCurrentUser } from '@/lib/supabase/request-context';

export const metadata: Metadata = { title: 'Quotes' };

export default async function QuotesPage() {
  const { data, error } = await getQuotes();
  const quoteUsage = await getMonthlyActiveQuoteUsageForCurrentUser();

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-on-surface sm:text-4xl">Quotes</h1>
          <p className="mt-1 text-sm text-on-surface-variant font-medium">
            Save and review customer quotes from your workspace.
          </p>
        </div>
        <Link
          href="/quotes/new"
          className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold tracking-tight shadow-sm transition-colors sm:px-5 ${
            quoteUsage?.reached
              ? 'border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high'
              : 'bg-primary text-on-primary hover:opacity-90'
          }`}
        >
          {quoteUsage?.reached ? 'View Starter Limit' : 'New Quote'}
        </Link>
      </div>

      {quoteUsage && quoteUsage.limit !== null && (
        quoteUsage.reached ? (
          <UpgradePrompt
            badge="Starter Limit Reached"
            title={`You've used all ${quoteUsage.limit} active Starter quote slots this month`}
            description="Starter includes up to 10 active draft, sent, or approved quotes each month. Upgrade to Pro to keep creating quotes without a monthly cap."
          />
        ) : (
          <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 sm:px-5 sm:py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Starter Usage
            </p>
            <p className="mt-1 text-base font-semibold text-on-surface">
              {quoteUsage.remaining} of {quoteUsage.limit} active quote slots remaining this
              month
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Active quotes include draft, sent, and approved quotes created this Sydney
              month.
            </p>
          </div>
        )
      )}

      {error ? (
        <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3">
          <p className="text-sm text-on-error-container">{error}</p>
        </div>
      ) : (
        <QuoteTable quotes={data} />
      )}
    </div>
  );
}
