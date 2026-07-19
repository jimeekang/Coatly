import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getInvoice,
  getInvoiceFormOptions,
  getLinkedInvoicesForQuote,
} from '@/modules/invoices/application/actions';
import { InvoiceDetail } from '@/modules/invoices/ui/InvoiceDetail';
import { BackLink } from '@/components/layout/BackLink';

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

  if (error) {
    // Supabase `.single()` returns a PGRST116 "no rows" error when the invoice
    // does not exist or is hidden by RLS — that is a genuine 404. Its message is
    // either "…multiple (or no) rows returned" or "Cannot coerce the result to a
    // single JSON object"; both contain "JSON object". Any other error is a real
    // failure that must surface to the route error boundary, not be masked as 404.
    if (/json object/i.test(error)) notFound();
    throw new Error(error);
  }
  if (!invoice) notFound();
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
      <div className="mb-4">
        <BackLink href="/invoices" label="All invoices" />
      </div>

      <InvoiceDetail invoice={invoice} linkedQuote={linkedQuote} quoteBilling={quoteBilling} />
    </div>
  );
}
