import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getInvoice, getInvoiceFormOptions, updateInvoice } from '@/modules/invoices/application/actions';
import { InvoiceForm } from '@/modules/invoices/ui/InvoiceForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorAlert } from '@/components/shared/ErrorAlert';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Edit Invoice' };

export default async function EditInvoicePage({ params }: Props) {
  const { id } = await params;
  const [{ data: invoice, error: invoiceError }, { data: formOptions, error: formError }] =
    await Promise.all([getInvoice(id), getInvoiceFormOptions()]);

  if (!invoice || invoiceError) notFound();
  if (invoice.status !== 'draft') notFound();

  const customers = formOptions.customers;
  const quotes = formOptions.quotes;

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 lg:max-w-6xl">
      <PageHeader
        title="Edit Invoice"
        subtitle={invoice.invoice_number}
        backHref={`/invoices/${invoice.id}`}
        backLabel="Back to invoice"
        className="mb-6"
      />

      {formError ? (
        <ErrorAlert>{formError}</ErrorAlert>
      ) : (
        <InvoiceForm
          customers={customers}
          quotes={quotes}
          businessDefaults={formOptions.businessDefaults}
          onSubmit={(data) => updateInvoice(invoice.id, data)}
          invoiceNumberPreview={invoice.invoice_number}
          submitLabel="Save Changes"
          mode="edit"
          defaultValues={{
            customer_id: invoice.customer_id,
            quote_id: invoice.quote_id,
            invoice_type: invoice.invoice_type,
            status: invoice.status,
            business_abn: invoice.business_abn,
            payment_terms: invoice.payment_terms,
            bank_details: invoice.bank_details,
            due_date: invoice.due_date,
            paid_date: invoice.paid_date,
            payment_method: invoice.payment_method,
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
