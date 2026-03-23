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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-pm-body">Quotes</h1>
          <p className="mt-1 text-sm text-pm-secondary">
            Save and review customer quotes from your workspace.
          </p>
        </div>
        <Link
          href="/quotes/new"
          className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            quoteUsage?.reached
              ? 'border border-pm-border bg-white text-pm-body hover:bg-pm-surface'
              : 'bg-pm-teal text-white hover:bg-pm-teal-hover'
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
            description="Starter includes up to 10 active draft, sent, or accepted quotes each month. Upgrade to Pro to keep creating quotes without a monthly cap."
          />
        ) : (
          <div className="rounded-2xl border border-pm-border bg-white px-4 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pm-secondary">
              Starter Usage
            </p>
            <p className="mt-1 text-base font-semibold text-pm-body">
              {quoteUsage.remaining} of {quoteUsage.limit} active quote slots remaining this
              month
            </p>
            <p className="mt-1 text-sm text-pm-secondary">
              Active quotes include draft, sent, and accepted quotes created this Sydney
              month.
            </p>
          </div>
        )
      )}

      {error ? (
        <div className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3">
          <p className="text-sm text-pm-coral-dark">{error}</p>
        </div>
      ) : (
        <QuoteTable quotes={data} />
      )}
    </div>
  );
}
