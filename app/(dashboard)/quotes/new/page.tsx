import type { Metadata } from 'next';
import { getQuoteFormOptions } from '@/modules/quotes/application/actions';
import { getMaterialItemsForPicker } from '@/modules/materials/application/actions';
import { listQuoteTemplates } from '@/modules/quotes/application/template-actions';
import { QuoteCreateScreen } from '@/modules/quotes/ui/QuoteCreateScreen';
import { AIDraftPanel } from '@/modules/ai/ui/AIDraftPanel';
import { UpgradePrompt } from '@/modules/billing/ui/UpgradePrompt';
import { generateAIDraft } from '@/modules/ai/application/actions';
import { isAIDraftConfigured } from '@/modules/ai/application/drafts';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { PageHeader, PrimaryActionLink } from '@/components/layout/PageHeader';
import { createServerClient } from '@/lib/supabase/server';
import { getLiveMonthlyActiveQuoteUsageForUser } from '@/modules/billing/application/server';

export const metadata: Metadata = { title: 'New Quote' };

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams?: Promise<{ customer_id?: string; customerId?: string }>;
}) {
  const [{ data, error }, { data: libraryItems }, { data: templates }] =
    await Promise.all([
      getQuoteFormOptions(),
      getMaterialItemsForPicker(),
      listQuoteTemplates(),
    ]);
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedCustomerId =
    typeof resolvedSearchParams.customer_id === 'string'
      ? resolvedSearchParams.customer_id
      : typeof resolvedSearchParams.customerId === 'string'
        ? resolvedSearchParams.customerId
        : null;
  const customers = data.customers;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const usageResult = user
    ? await getLiveMonthlyActiveQuoteUsageForUser(supabase, user.id)
    : null;
  const subscription = usageResult?.snapshot ?? null;
  const quoteUsage = usageResult?.usage ?? null;
  const aiConfigured = isAIDraftConfigured();

  return (
    <div className="mx-auto w-full max-w-lg pt-4 pb-32 lg:max-w-6xl">
      <PageHeader
        title="New Quote"
        subtitle="Build a quote manually."
        backHref="/quotes"
        backLabel="All quotes"
        className="mb-5"
      />

      {quoteUsage && (
        <div className="border-outline-variant bg-surface-container-low mb-5 rounded-xl border px-4 py-3">
          <SectionLabel>Starter Usage</SectionLabel>
          <p className="text-on-surface mt-1 text-base font-semibold">
            {quoteUsage.remaining} of {quoteUsage.limit} active quote slots
            remaining this month
          </p>
          <p className="text-on-surface-variant mt-1 text-sm">
            Starter includes up to {quoteUsage.limit} draft, sent, or approved
            quotes each month. Upgrade to Pro for unlimited quoting and AI
            drafting.
          </p>
        </div>
      )}

      {error ? (
        <ErrorAlert>{error}</ErrorAlert>
      ) : customers.length === 0 ? (
        <div className="border-outline-variant bg-surface-container-low rounded-xl border border-dashed px-5 py-8">
          <h2 className="text-on-surface text-base font-semibold">
            Add a customer first
          </h2>
          <p className="text-on-surface-variant mt-1 text-sm">
            Quotes are linked to a saved customer in your workspace.
          </p>
          <PrimaryActionLink href="/customers/new" className="mt-4">
            + New Customer
          </PrimaryActionLink>
        </div>
      ) : (
        <QuoteCreateScreen
          customers={customers}
          canUseAI={aiConfigured && (subscription?.features.ai ?? false)}
          showAIUpgrade={aiConfigured && !(subscription?.features.ai ?? false)}
          quoteNumberPreview={data.nextQuoteNumber ?? undefined}
          rateSettings={data.userRates}
          libraryItems={libraryItems}
          templates={templates}
          initialCustomerId={
            requestedCustomerId &&
            customers.some((customer) => customer.id === requestedCustomerId)
              ? requestedCustomerId
              : undefined
          }
          generateAIDraft={generateAIDraft}
          AIDraftPanel={AIDraftPanel}
          UpgradePrompt={UpgradePrompt}
        />
      )}
    </div>
  );
}
