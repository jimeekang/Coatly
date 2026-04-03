import type { Metadata } from 'next';
import { WorkspaceAssistant } from '@/components/dashboard/WorkspaceAssistant';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { createServerClient } from '@/lib/supabase/server';
import { getSubscriptionSnapshotForCurrentUser, requireCurrentUser } from '@/lib/supabase/request-context';
import { formatAUD } from '@/utils/format';

export const metadata: Metadata = { title: 'Dashboard' };

function getSydneyYearMonth(date: string | Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
  }).format(typeof date === 'string' ? new Date(date) : date);
}

export default async function DashboardPage() {
  const [supabase, user, subscription] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
    getSubscriptionSnapshotForCurrentUser(),
  ]);

  const businessName =
    (user.user_metadata?.business_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'there';

  const [{ data: customers }, { data: quotes }, { data: invoices }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, company_name, email, phone, address_line1, city, state, postcode')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('name', { ascending: true }),
    supabase
      .from('quotes')
      .select('id, quote_number, title, customer_id, total_cents, status, valid_until, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, status, total_cents, amount_paid_cents, paid_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const customerOptions =
    customers?.map((customer) => ({
      id: customer.id,
      name: customer.name,
      company_name: customer.company_name,
      email: customer.email,
      phone: customer.phone,
      address: [customer.address_line1, customer.city, customer.state, customer.postcode]
        .filter(Boolean)
        .join(', ') || null,
    })) ?? [];

  const quoteOptions =
    quotes?.map((quote) => ({
      id: quote.id,
      customer_id: quote.customer_id,
      quote_number: quote.quote_number,
      title: quote.title,
      total_cents: quote.total_cents,
      status: quote.status,
      valid_until: quote.valid_until,
    })) ?? [];

  const currentSydneyMonth = getSydneyYearMonth(new Date());
  const activeQuoteCount =
    quotes?.filter((quote) => ['draft', 'sent', 'approved'].includes(quote.status)).length ?? 0;
  const starterQuoteUsageThisMonth =
    quotes?.filter(
      (quote) =>
        ['draft', 'sent', 'approved'].includes(quote.status) &&
        getSydneyYearMonth(quote.created_at) === currentSydneyMonth
    ).length ?? 0;
  const quoteLimit = subscription.features.activeQuoteLimit;
  const quoteSlotsRemaining =
    quoteLimit === null ? null : Math.max(quoteLimit - starterQuoteUsageThisMonth, 0);

  const pendingInvoiceCount =
    invoices?.filter((invoice) => ['draft', 'sent', 'overdue'].includes(invoice.status)).length ??
    0;

  const customerCount = customers?.length ?? 0;

  const revenueThisMonthCents =
    invoices?.reduce((sum, invoice) => {
      if (!invoice.paid_at) return sum;
      if (getSydneyYearMonth(invoice.paid_at) !== currentSydneyMonth) return sum;
      return sum + (invoice.amount_paid_cents ?? invoice.total_cents ?? 0);
    }, 0) ?? 0;

  const overviewStats = [
    {
      label: 'Active Quotes',
      value: String(activeQuoteCount),
      hint:
        quoteLimit === null
          ? 'Unlimited draft, sent, and approved quotes'
          : `${starterQuoteUsageThisMonth}/${quoteLimit} active quotes used this month`,
    },
    {
      label: 'Pending Invoices',
      value: String(pendingInvoiceCount),
      hint: 'Draft, sent, and overdue invoices',
    },
    {
      label: 'Customers',
      value: String(customerCount),
      hint: 'Active customer records',
    },
    {
      label: 'Revenue this month',
      value: formatAUD(revenueThisMonthCents),
      hint: 'Paid invoices this month',
    },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-on-surface leading-tight">
          G&apos;day, <span className="text-primary">{businessName}</span>
        </h1>
        <p className="mt-2 text-on-surface-variant font-medium">
          {subscription.plan === 'pro'
            ? 'Run your workspace from one place and let AI draft the paperwork first.'
            : 'Run your workspace from one place and keep track of quotes, invoices, and customers.'}
        </p>
      </div>

      {quoteSlotsRemaining !== null && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Starter Usage
          </p>
          <p className="mt-1 text-base font-semibold text-on-surface">
            {quoteSlotsRemaining} of {quoteLimit} active quote slots remaining this month
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Starter includes up to {quoteLimit} draft, sent, or approved quotes each Sydney
            month. Upgrade to Pro for unlimited quoting and AI tools.
          </p>
        </div>
      )}

      {/* Overview stats */}
      <section aria-labelledby="overview-heading">
        <h2
          id="overview-heading"
          className="mb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
        >
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {overviewStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-container-low p-6 rounded-2xl hover:bg-surface-container transition-colors"
            >
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-3">
                {stat.label}
              </p>
              <div className="text-3xl font-extrabold tracking-tighter text-on-surface">
                {stat.value}
              </div>
              <p className="mt-1.5 text-[11px] text-on-surface-variant">{stat.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <div>
        {subscription.features.ai ? (
          <WorkspaceAssistant customers={customerOptions} quotes={quoteOptions} />
        ) : (
          <UpgradePrompt
            badge="Pro Plan"
            title="Dashboard AI is available on Pro"
            description="Starter keeps the core quoting and invoicing tools. Upgrade to Pro to ask the dashboard AI to search records or prepare customer, quote, and invoice drafts from one prompt."
          />
        )}
      </div>
    </div>
  );
}
