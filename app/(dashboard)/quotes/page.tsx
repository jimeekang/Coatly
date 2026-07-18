import type { Metadata } from 'next';
import { getQuotes } from '@/modules/quotes/application/actions';
import { QuoteTable } from '@/modules/quotes/ui/QuoteTable';
import { UpgradePrompt } from '@/modules/billing/ui/UpgradePrompt';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { SectionLabel } from '@/components/ui/SectionLabel';
import {
  PageHeader,
  PrimaryActionLink,
  SecondaryActionLink,
} from '@/components/layout/PageHeader';
import { getMonthlyActiveQuoteUsageForCurrentUser } from '@/modules/billing/application/request-context';

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
            <SecondaryActionLink href="/quotes/new">
              View Starter Limit
            </SecondaryActionLink>
          ) : (
            <PrimaryActionLink href="/quotes/new">
              + New Quote
            </PrimaryActionLink>
          )
        }
      />

      {quoteUsage &&
        quoteUsage.limit !== null &&
        (quoteUsage.reached ? (
          <UpgradePrompt
            badge="Starter Limit Reached"
            title={`You've used all ${quoteUsage.limit} active Starter quote slots this month`}
            description="Starter includes up to 10 active draft, sent, or approved quotes each month. Upgrade to Pro to keep creating quotes without a monthly cap."
          />
        ) : (
          <div className="border-outline-variant bg-surface-container-low rounded-xl border px-4 py-3 sm:px-5 sm:py-4">
            <SectionLabel>Starter Usage</SectionLabel>
            <p className="text-on-surface mt-1 text-base font-semibold">
              {quoteUsage.remaining} of {quoteUsage.limit} active quote slots
              remaining this month
            </p>
            <p className="text-on-surface-variant mt-1 text-sm">
              Active quotes include draft, sent, and approved quotes created
              this Sydney month.
            </p>
          </div>
        ))}

      {error ? <ErrorAlert>{error}</ErrorAlert> : <QuoteTable quotes={data} />}
    </div>
  );
}
