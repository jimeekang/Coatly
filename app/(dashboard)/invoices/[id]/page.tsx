import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getInvoice } from '@/app/actions/invoices';
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
  const { data: invoice, error } = await getInvoice(id);

  if (!invoice || error) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 pt-4">
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
          <p className="truncate text-sm text-pm-secondary">{invoice.customer.name}</p>
        </div>
      </div>

      <InvoiceDetail invoice={invoice} />
    </div>
  );
}
