import type { Metadata } from 'next';
import { getQuotes } from '@/app/actions/quotes';
import { QuoteTable } from '@/components/quotes/QuoteTable';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import {
  PageHeader,
  PrimaryActionLink,
  SecondaryActionLink,
} from '@/components/layout/PageHeader';
import { getMonthlyActiveQuoteUsageForCurrentUser } from '@/lib/supabase/request-context';

export const metadata: Metadata = { title: 'Quotes' };

export default async function QuotesPage() {
  const { data, error } = await getQuotes();
  const quoteUsage = await getMonthlyActiveQuoteUsageForCurrentUser();

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Quotes"
        subtitle="Save and review customer quotes from your workspace."
        action={
          quoteUsage?.reached ? (
            <SecondaryActionLink href="/quotes/new">View Starter Limit</SecondaryActionLink>
          ) : (
            <PrimaryActionLink href="/quotes/new">+ New Quote</PrimaryActionLink>
          )
        }
      />

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
        <ErrorAlert>{error}</ErrorAlert>
      ) : (
        <QuoteTable quotes={data} />
      )}
    </div>
  );
}
