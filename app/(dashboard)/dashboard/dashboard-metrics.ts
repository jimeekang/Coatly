import { getSydneyTodayDateString } from '@/modules/invoices/domain/invoices';

export type DashboardInvoicePayment = {
  effective_status: string;
  amount_paid_cents: number | null;
  paid_date: string | null;
};

export type DashboardQuoteActivity = {
  status: string;
  updated_at: string;
};

/** Matches the invoice KPI definition: paid amount settled in the Sydney month. */
export function getDashboardPaidThisMonthCents(
  invoices: DashboardInvoicePayment[],
  now: Date = new Date()
) {
  const monthPrefix = getSydneyTodayDateString(now).slice(0, 7);

  return invoices.reduce((sum, invoice) => {
    if (invoice.effective_status !== 'paid') return sum;
    if (!invoice.paid_date?.startsWith(monthPrefix)) return sum;
    return sum + (invoice.amount_paid_cents ?? 0);
  }, 0);
}

/** Days since the stalest sent quote last changed, used as a follow-up aging signal. */
export function getStalestSentQuoteActivityAgeDays(
  quotes: DashboardQuoteActivity[],
  now: Date = new Date()
) {
  const sentActivityTimes = quotes
    .filter((quote) => quote.status === 'sent')
    .map((quote) => new Date(quote.updated_at).getTime())
    .filter(Number.isFinite);

  if (sentActivityTimes.length === 0) return null;

  const stalestActivity = Math.min(...sentActivityTimes);
  return Math.max(
    0,
    Math.floor((now.getTime() - stalestActivity) / (24 * 60 * 60 * 1000))
  );
}
