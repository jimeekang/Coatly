import type { Metadata } from 'next';
import Link from 'next/link';
import { WorkspaceAssistant } from '@/modules/assistant/ui/WorkspaceAssistant';
import { CustomerForm } from '@/modules/customers/ui/CustomerForm';
import { QuoteForm } from '@/modules/quotes/ui/QuoteForm';
import { InvoiceForm } from '@/modules/invoices/ui/InvoiceForm';
import { createQuote } from '@/modules/quotes/application/actions';
import { createInvoice } from '@/modules/invoices/application/actions';
import { UpgradePrompt } from '@/modules/billing/ui/UpgradePrompt';
import { resolveInvoiceStatus } from '@/modules/invoices/domain/invoices';
import { getInvoiceQuoteOptions } from '@/modules/invoices/infrastructure/invoice-options';
import { createServerClient } from '@/lib/supabase/server';
import { requireCurrentUser } from '@/lib/supabase/request-context';
import { getSubscriptionSnapshotForCurrentUser } from '@/modules/billing/application/request-context';
import { formatAUD } from '@/utils/format';
import type { InvoiceStatus } from '@/modules/invoices/domain/invoice';

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
  const draftQuoteCount = quotes?.filter((quote) => quote.status === 'draft').length ?? 0;
  const sentQuoteCount = quotes?.filter((quote) => quote.status === 'sent').length ?? 0;
  const approvedQuoteCount =
    quotes?.filter((quote) => quote.status === 'approved').length ?? 0;

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

  const quotePipelineStats = [
    { label: 'Draft', status: 'draft' },
    { label: 'Sent', status: 'sent' },
    { label: 'Approved', status: 'approved' },
    { label: 'Rejected', status: 'rejected' },
    { label: 'Expired', status: 'expired' },
  ].map((item) => {
    const matchingQuotes = quotes?.filter((quote) => quote.status === item.status) ?? [];
    return {
      label: item.label,
      count: matchingQuotes.length,
      totalCents: matchingQuotes.reduce((sum, quote) => sum + (quote.total_cents ?? 0), 0),
    };
  });

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

  const actionItems = [
    {
      label: 'Quote',
      title: 'Create the next quote',
      body: 'Start a clean quote and send it while the job details are fresh.',
      href: '/quotes/new',
      cta: '+ New Quote',
      variant: 'primary',
    },
    {
      label: 'Follow up',
      title: `${sentQuoteCount} sent quote${sentQuoteCount === 1 ? '' : 's'}`,
      body:
        sentQuoteCount > 0
          ? 'Check sent quotes and move accepted work forward.'
          : `${draftQuoteCount} draft quote${draftQuoteCount === 1 ? '' : 's'} waiting in the pipeline.`,
      href: '/quotes',
      cta: 'Review Quotes',
      variant: 'secondary',
    },
    {
      label: 'Cash',
      title:
        overdueInvoiceCount > 0
          ? `${overdueInvoiceCount} overdue invoice${overdueInvoiceCount === 1 ? '' : 's'}`
          : `${pendingInvoiceCount} invoice${pendingInvoiceCount === 1 ? '' : 's'} to watch`,
      body:
        approvedQuoteCount > 0
          ? `${approvedQuoteCount} approved quote${approvedQuoteCount === 1 ? '' : 's'} can become invoices.`
          : 'Keep sent and overdue invoices visible before they slip.',
      href: pendingInvoiceCount > 0 ? '/invoices' : '/invoices/new',
      cta: pendingInvoiceCount > 0 ? 'Open Invoices' : 'New Invoice',
      variant: overdueInvoiceCount > 0 ? 'warning' : 'secondary',
    },
  ] as const;

  return (
    <div className="min-w-0 space-y-5 sm:space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-on-surface leading-tight sm:text-4xl">
          G&apos;day, <span className="text-primary">{businessName}</span>
        </h1>
        <p className="mt-2 text-on-surface-variant font-medium">
          {subscription.plan === 'pro'
            ? 'Run your workspace from one place and let AI draft the paperwork first.'
            : 'Run your workspace from one place and keep track of quotes, invoices, and customers.'}
        </p>
      </div>

      <section aria-labelledby="next-actions-heading" className="space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            Today
          </p>
          <h2 id="next-actions-heading" className="mt-1 text-lg font-bold text-on-surface">
            Next actions
          </h2>
        </div>
        <div className="grid min-w-0 gap-3 md:grid-cols-3">
          {actionItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={[
                'group flex min-h-36 min-w-0 flex-col justify-between rounded-2xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                item.variant === 'primary'
                  ? 'border-primary/25 bg-primary text-on-primary hover:bg-primary/90'
                  : item.variant === 'warning'
                    ? 'border-warning/25 bg-warning-container text-on-surface hover:border-warning/40'
                    : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/30 hover:bg-surface-container-low',
              ].join(' ')}
            >
              <div>
                <p
                  className={[
                    'text-[10px] font-bold uppercase tracking-widest',
                    item.variant === 'primary'
                      ? 'text-on-primary/75'
                      : 'text-on-surface-variant',
                  ].join(' ')}
                >
                  {item.label}
                </p>
                <p className="mt-2 text-base font-bold leading-snug">{item.title}</p>
                <p
                  className={[
                    'mt-1 text-sm leading-relaxed',
                    item.variant === 'primary'
                      ? 'text-on-primary/80'
                      : 'text-on-surface-variant',
                  ].join(' ')}
                >
                  {item.body}
                </p>
              </div>
              <span
                className={[
                  'mt-4 inline-flex min-h-11 w-fit items-center rounded-xl px-4 text-sm font-semibold transition-colors',
                  item.variant === 'primary'
                    ? 'bg-on-primary text-primary group-hover:bg-on-primary/90'
                    : 'border border-outline-variant bg-surface-container-lowest text-on-surface group-hover:border-primary/40 group-hover:text-primary',
                ].join(' ')}
              >
                {item.cta}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {quoteSlotsRemaining !== null && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 sm:px-5 sm:py-4">
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

      {/* Workspace assistant — primary action surface */}
      <div>
        {subscription.features.ai ? (
          <WorkspaceAssistant
            customers={customerOptions}
            quotes={quoteOptions}
            CustomerForm={CustomerForm}
            QuoteForm={QuoteForm}
            InvoiceForm={InvoiceForm}
            createQuote={createQuote}
            createInvoice={createInvoice}
          />
        ) : (
          <UpgradePrompt
            badge="Pro Plan"
            title="Dashboard AI is available on Pro"
            description="Starter keeps the core quoting and invoicing tools. Upgrade to Pro to ask the dashboard AI to search records or prepare customer, quote, and invoice drafts from one prompt."
          />
        )}
      </div>

      {/* Quote pipeline — quotes that need action */}
      <section aria-labelledby="pipeline-heading">
        <h2
          id="pipeline-heading"
          className="mb-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant"
        >
          Quote Pipeline
        </h2>
        <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2 sm:gap-3">
          {quotePipelineStats.map((stat) => (
            <div key={stat.label} className="min-w-0 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 sm:rounded-2xl sm:p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                {stat.label}
              </p>
              <p className="mt-2 text-xl font-extrabold tracking-tight text-on-surface sm:text-2xl">
                {stat.count}
              </p>
              <p className="mt-1 truncate text-xs text-on-surface-variant">
                {formatAUD(stat.totalCents)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* KPI cards */}
      <section aria-labelledby="kpi-heading">
        <h2
          id="kpi-heading"
          className="mb-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant"
        >
          This Month
        </h2>
        <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3 sm:gap-4">
          {kpiStats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl p-4 transition-colors sm:rounded-2xl sm:p-6 ${
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
                className={`break-words text-2xl font-extrabold sm:text-3xl ${
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
        <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3 sm:gap-4">
          {overviewStats.map((stat) => (
            <div
              key={stat.label}
              className="min-w-0 rounded-xl bg-surface-container-low p-4 transition-colors hover:bg-surface-container sm:rounded-2xl sm:p-6"
            >
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-3">
                {stat.label}
              </p>
              <div className="flex items-start justify-between gap-3">
                <div className="text-2xl font-extrabold text-on-surface sm:text-3xl">
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
    </div>
  );
}
