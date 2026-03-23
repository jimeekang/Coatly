import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getInvoice, getInvoiceFormOptions, updateInvoice } from '@/app/actions/invoices';
import { InvoiceForm } from '@/components/invoices/InvoiceForm';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Edit Invoice' };

export default async function EditInvoicePage({ params }: Props) {
  const { id } = await params;
  const [{ data: invoice, error: invoiceError }, { data: formOptions, error: formError }] =
    await Promise.all([getInvoice(id), getInvoiceFormOptions()]);

  if (!invoice || invoiceError) notFound();

  const customers = formOptions.customers;
  const quotes = formOptions.quotes;

  return (
    <div className="mx-auto max-w-lg px-4 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/invoices/${invoice.id}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-pm-surface text-pm-secondary transition-colors active:bg-pm-border"
          aria-label="Back to invoice"
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
        <div>
          <h1 className="text-2xl font-bold text-pm-body">Edit Invoice</h1>
          <p className="mt-0.5 text-sm text-pm-secondary">{invoice.invoice_number}</p>
        </div>
      </div>

      {formError ? (
        <div className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3">
          <p className="text-sm text-pm-coral-dark">{formError}</p>
        </div>
      ) : (
        <InvoiceForm
          customers={customers}
          quotes={quotes}
          onSubmit={(data) => updateInvoice(invoice.id, data)}
          invoiceNumberPreview={invoice.invoice_number}
          submitLabel="Save Changes"
          defaultValues={{
            customer_id: invoice.customer_id,
            quote_id: invoice.quote_id,
            invoice_type: invoice.invoice_type,
            status: invoice.status,
            due_date: invoice.due_date,
            notes: invoice.notes,
            line_items: invoice.line_items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unit_price_cents: item.unit_price_cents,
            })),
          }}
        />
      )}
    </div>
  );
}
