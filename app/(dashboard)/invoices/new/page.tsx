import Link from 'next/link';
import type { Metadata } from 'next';
import { getInvoiceDraftFromQuote, getInvoiceFormOptions } from '@/modules/invoices/application/actions';
import { InvoiceCreateScreen } from '@/modules/invoices/ui/InvoiceCreateScreen';
import { AIDraftPanel } from '@/modules/ai/ui/AIDraftPanel';
import { UpgradePrompt } from '@/modules/billing/ui/UpgradePrompt';
import { generateAIDraft } from '@/modules/ai/application/actions';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { createServerClient } from '@/lib/supabase/server';
import { getLiveSubscriptionSnapshotForUser } from '@/modules/billing/application/server';

export const metadata: Metadata = { title: 'New Invoice' };

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams?: Promise<{ quoteId?: string; customer_id?: string; customerId?: string }>;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedQuoteId =
    typeof resolvedSearchParams.quoteId === 'string' ? resolvedSearchParams.quoteId : null;
  const requestedCustomerId =
    typeof resolvedSearchParams.customer_id === 'string'
      ? resolvedSearchParams.customer_id
      : typeof resolvedSearchParams.customerId === 'string'
        ? resolvedSearchParams.customerId
        : null;
  const subscription = user
    ? await getLiveSubscriptionSnapshotForUser(user.id)
    : null;
  const { data, error } = await getInvoiceFormOptions();
  const customers = data.customers;
  const quotes = data.quotes;
  const quoteDraftResult =
    requestedQuoteId ? await getInvoiceDraftFromQuote(requestedQuoteId) : { data: null, error: null };
  const pageError = error ?? quoteDraftResult.error;

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 lg:max-w-6xl">
      <PageHeader
        title="New Invoice"
        subtitle="Create a draft, compare it against the linked quote, and keep payment details ready for sending."
        backHref="/invoices"
        backLabel="All invoices"
        className="mb-5"
      />

      {pageError ? (
        <ErrorAlert>{pageError}</ErrorAlert>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low px-5 py-8">
          <h2 className="text-base font-bold text-on-surface">Add a customer first</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Invoices are linked to a saved customer in your workspace.
          </p>
          <Link
            href="/customers/new"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
          >
            Go to New Customer
          </Link>
        </div>
      ) : (
        <InvoiceCreateScreen
          customers={customers}
          quotes={quotes}
          businessDefaults={data.businessDefaults}
          initialDefaultValues={quoteDraftResult.data ?? undefined}
          initialCustomerId={
            requestedCustomerId && customers.some((customer) => customer.id === requestedCustomerId)
              ? requestedCustomerId
              : undefined
          }
          canUseAI={subscription?.features.ai ?? false}
          generateAIDraft={generateAIDraft}
          AIDraftPanel={AIDraftPanel}
          UpgradePrompt={UpgradePrompt}
        />
      )}
    </div>
  );
}
