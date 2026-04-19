import type { Metadata } from 'next';
import { WorkspaceAssistant } from '@/components/dashboard/WorkspaceAssistant';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { getInvoiceQuoteOptions, resolveInvoiceStatus } from '@/lib/invoices';
import { createServerClient } from '@/lib/supabase/server';
import { getSubscriptionSnapshotForCurrentUser, requireCurrentUser } from '@/lib/supabase/request-context';
import { formatAUD } from '@/utils/format';
import type { InvoiceStatus } from '@/types/invoice';

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

  const [{ data: customers }, { data: quotes }, { data: invoices }, quoteOptionsResult] =
    await Promise.all([
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
      .select('id, status, total_cents, amount_paid_cents, paid_at, due_date, paid_date')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    getInvoiceQuoteOptions(supabase, user.id),
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

  const quoteOptions = quoteOptionsResult.data;
  const invoiceSummaries =
    invoices?.map((invoice) => ({
      ...invoice,
      effective_status: resolveInvoiceStatus(
        invoice.status as InvoiceStatus,
        invoice.due_date,
        invoice.paid_date ?? null
      ),
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
    invoiceSummaries.filter((invoice) =>
      ['draft', 'sent', 'overdue'].includes(invoice.effective_status)
    ).length;
  const overdueInvoiceCount = invoiceSummaries.filter(
    (invoice) => invoice.effective_status === 'overdue'
  ).length;

  const customerCount = customers?.length ?? 0;

  const revenueThisMonthCents =
    invoiceSummaries.reduce((sum, invoice) => {
      if (!invoice.paid_at) return sum;
      if (getSydneyYearMonth(invoice.paid_at) !== currentSydneyMonth) return sum;
      return sum + (invoice.amount_paid_cents ?? invoice.total_cents ?? 0);
    }, 0);

  // KPI: Quote approval rate this month
  const quotesThisMonth =
    quotes?.filter((q) => getSydneyYearMonth(q.created_at) === currentSydneyMonth) ?? [];
  const approvedThisMonth = quotesThisMonth.filter((q) => q.status === 'approved').length;
  const quoteApprovalRate =
    quotesThisMonth.length > 0
      ? Math.round((approvedThisMonth / quotesThisMonth.length) * 100)
      : null;

  // KPI: Outstanding (unpaid) invoice amount
  const outstandingCents =
    invoiceSummaries.reduce((sum, invoice) => {
      if (!['sent', 'overdue'].includes(invoice.effective_status)) return sum;
      const remaining = (invoice.total_cents ?? 0) - (invoice.amount_paid_cents ?? 0);
      return sum + Math.max(remaining, 0);
    }, 0);

  const kpiStats = [
    {
      label: 'Revenue this month',
      value: formatAUD(revenueThisMonthCents),
      hint: 'Paid invoices in Sydney time',
      variant: revenueThisMonthCents > 0 ? ('positive' as const) : ('neutral' as const),
    },
    {
      label: 'Quote approval rate',
      value: quoteApprovalRate !== null ? `${quoteApprovalRate}%` : '—',
      hint:
        quotesThisMonth.length > 0
          ? `${approvedThisMonth} of ${quotesThisMonth.length} quotes this month`
          : 'No quotes created this month yet',
      variant:
        quoteApprovalRate !== null && quoteApprovalRate >= 50
          ? ('positive' as const)
          : ('neutral' as const),
    },
    {
      label: 'Outstanding',
      value: formatAUD(outstandingCents),
      hint: 'Sent & overdue invoices awaiting payment',
      variant: outstandingCents > 0 ? ('warning' as const) : ('neutral' as const),
    },
  ];

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
          <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
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

      {/* KPI cards */}
      <section aria-labelledby="kpi-heading">
        <h2
          id="kpi-heading"
          className="mb-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant"
        >
          This Month
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {kpiStats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl p-6 transition-colors ${
                stat.variant === 'positive'
                  ? 'bg-success-container border border-success/20'
                  : stat.variant === 'warning'
                    ? 'bg-warning-container border border-warning/20'
                    : 'bg-surface-container-low hover:bg-surface-container'
              }`}
            >
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-3">
                {stat.label}
              </p>
              <div
                className={`text-3xl font-extrabold tracking-tighter ${
                  stat.variant === 'positive'
                    ? 'text-success'
                    : stat.variant === 'warning'
                      ? 'text-warning'
                      : 'text-on-surface'
                }`}
              >
                {stat.value}
              </div>
              <p className="mt-1.5 text-[11px] text-on-surface-variant">{stat.hint}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Overview stats */}
      <section aria-labelledby="overview-heading">
        <h2
          id="overview-heading"
          className="mb-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant"
        >
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {overviewStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-container-low p-6 rounded-2xl hover:bg-surface-container transition-colors"
            >
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-3">
                {stat.label}
              </p>
              <div className="flex items-start justify-between gap-3">
                <div className="text-3xl font-extrabold tracking-tighter text-on-surface">
                  {stat.value}
                </div>
                {stat.label === 'Pending Invoices' && overdueInvoiceCount > 0 && (
                  <span className="inline-flex min-h-7 items-center rounded-full bg-error/12 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-error">
                    {overdueInvoiceCount} overdue
                  </span>
                )}
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
