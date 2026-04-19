import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getInvoice,
  getInvoiceFormOptions,
  getLinkedInvoicesForQuote,
} from '@/app/actions/invoices';
import { InvoiceDetail } from '@/components/invoices/InvoiceDetail';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data } = await getInvoice(id);
  return { title: data?.invoice_number ?? 'Invoice' };
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const [{ data: invoice, error }, { data: formOptions }] = await Promise.all([
    getInvoice(id),
    getInvoiceFormOptions(),
  ]);

  if (!invoice || error) notFound();
  const linkedQuote =
    invoice.quote_id
      ? formOptions.quotes.find((quote) => quote.id === invoice.quote_id) ?? null
      : null;
  const linkedInvoiceResult =
    invoice.quote_id ? await getLinkedInvoicesForQuote(invoice.quote_id) : { data: null, error: null };
  const linkedInvoiceSummary = linkedInvoiceResult.data?.summary ?? null;
  const quoteBilling =
    linkedQuote && linkedInvoiceSummary
      ? {
          billed_total_cents: linkedInvoiceSummary.billed_total_cents,
          remaining_total_cents: Math.max(
            linkedQuote.total_cents - linkedInvoiceSummary.billed_total_cents,
            0
          ),
          linked_invoice_count: linkedInvoiceSummary.linked_invoice_count,
          current_stage_label:
            linkedInvoiceResult.data?.invoices.find((linkedInvoice) => linkedInvoice.id === invoice.id)
              ?.quote_stage_label ?? invoice.quote_stage_label ?? null,
        }
      : null;

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 lg:max-w-6xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/invoices"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-pm-surface text-pm-secondary transition-colors active:bg-pm-border"
          aria-label="Back to invoices"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-pm-body">
            {invoice.invoice_number}
          </h1>
          <p className="truncate text-sm text-pm-secondary">
            {invoice.customer.name} · {invoice.invoice_type} · {invoice.status}
          </p>
        </div>
      </div>

      <InvoiceDetail invoice={invoice} linkedQuote={linkedQuote} quoteBilling={quoteBilling} />
    </div>
  );
}
