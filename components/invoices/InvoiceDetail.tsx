'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { deleteInvoice, sendInvoice } from '@/app/actions/invoices';
import type { InvoiceFormQuoteOption } from '@/components/invoices/InvoiceForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { InvoiceWithCustomer } from '@/types/invoice';
import { formatAUD, formatABN, formatDate } from '@/utils/format';

const STATUS_BADGE: Record<
  InvoiceWithCustomer['status'],
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-pm-surface text-pm-secondary' },
  sent: { label: 'Sent', className: 'bg-blue-50 text-blue-700' },
  paid: { label: 'Paid', className: 'bg-pm-teal-light text-pm-teal-hover' },
  overdue: { label: 'Overdue', className: 'bg-red-50 text-red-700' },
  cancelled: { label: 'Cancelled', className: 'bg-pm-surface text-pm-secondary line-through' },
};

const INVOICE_TYPE_LABEL: Record<InvoiceWithCustomer['invoice_type'], string> = {
  full: 'Full',
  deposit: 'Deposit',
  progress: 'Progress',
  final: 'Final',
};

const PAYMENT_METHOD_LABEL: Record<NonNullable<InvoiceWithCustomer['payment_method']>, string> = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  card: 'Card',
  cheque: 'Cheque',
  other: 'Other',
};

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-pm-secondary">
        {label}
      </p>
      <p className="text-sm leading-6 text-pm-body">{value || '—'}</p>
    </div>
  );
}

export function InvoiceDetail({
  invoice,
  linkedQuote,
}: {
  invoice: InvoiceWithCustomer;
  linkedQuote?: InvoiceFormQuoteOption | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isSending, startSendTransition] = useTransition();

  const balanceCents = Math.max(invoice.total_cents - invoice.amount_paid_cents, 0);
  const linkedQuoteIncludedItems =
    linkedQuote?.line_items.filter((item) => !item.is_optional || item.is_selected) ?? [];

  const statusBadge = STATUS_BADGE[invoice.status];

  async function confirmDelete() {
    setOpenDeleteDialog(false);
    setDeleting(true);
    const result = await deleteInvoice(invoice.id);
    if (result?.error) {
      setError(result.error);
      setDeleting(false);
    }
  }

  function handleSend() {
    startSendTransition(async () => {
      setError(null);
      const result = await sendInvoice(invoice.id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      <div className="space-y-6 pb-10">
        {/* Header card */}
        <section className="rounded-3xl border border-pm-border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pm-secondary">
                  Invoice
                </p>
                <p className="mt-1 text-[28px] font-semibold leading-none text-pm-body">
                  {invoice.invoice_number}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-pm-surface px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pm-body">
                  {INVOICE_TYPE_LABEL[invoice.invoice_type]}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-90">
              <div className="rounded-2xl bg-pm-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                  Total
                </p>
                <p className="mt-1 text-lg font-semibold text-pm-body">
                  {formatAUD(invoice.total_cents)}
                </p>
              </div>
              <div className="rounded-2xl bg-pm-surface px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                  Paid
                </p>
                <p className="mt-1 text-lg font-semibold text-pm-body">
                  {formatAUD(invoice.amount_paid_cents)}
                </p>
              </div>
              <div className="rounded-2xl bg-pm-teal-light px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-pm-teal-mid">
                  Balance
                </p>
                <p className="mt-1 text-lg font-semibold text-pm-teal">
                  {formatAUD(balanceCents)}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap gap-3">
            {invoice.status === 'draft' && (
              <button
                onClick={handleSend}
                disabled={isSending}
                className="inline-flex h-11 items-center rounded-xl bg-pm-teal px-5 text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover disabled:opacity-50"
              >
                {isSending ? 'Sending…' : 'Send Invoice'}
              </button>
            )}
            {invoice.status === 'draft' && (
              <Link
                href={`/invoices/${invoice.id}/edit`}
                className="inline-flex h-11 items-center rounded-xl border border-pm-border bg-white px-4 text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface"
              >
                Edit
              </Link>
            )}
            <a
              href={`/api/pdf/invoice?id=${invoice.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-xl border border-pm-border bg-white px-4 text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface"
            >
              PDF
            </a>
            <button
              onClick={() => setOpenDeleteDialog(true)}
              disabled={deleting}
              className="inline-flex h-11 items-center rounded-xl bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>

          {invoice.status === 'draft' && (
            <p className="mt-3 text-xs text-pm-secondary">
              Sending this invoice will email it to the customer and mark it as sent.
            </p>
          )}
          {invoice.status !== 'draft' && (
            <p className="mt-3 text-xs text-pm-secondary">
              Sent, paid, overdue, and cancelled invoices are locked to preserve billing history.
            </p>
          )}
        </section>

        {error && (
          <div className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3">
            <p className="text-sm text-pm-coral-dark">{error}</p>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
          <div className="space-y-6">
            {/* Line Items */}
            <section className="rounded-3xl border border-pm-border bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-pm-body">Line Items</h3>
              <div className="overflow-hidden rounded-2xl border border-pm-border">
                <div className="hidden grid-cols-[minmax(0,1.6fr)_110px_140px_140px] gap-3 bg-pm-surface px-4 py-3 text-xs font-semibold uppercase tracking-wide text-pm-secondary md:grid">
                  <span>Description</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Unit</span>
                  <span className="text-right">Amount</span>
                </div>
                <div className="divide-y divide-pm-border">
                  {invoice.line_items.map((item) => (
                    <div key={item.id} className="px-4 py-4">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_110px_140px_140px] md:items-start">
                        <div>
                          <p className="whitespace-pre-wrap text-sm font-medium text-pm-body">
                            {item.description}
                          </p>
                          <p className="mt-1 text-xs text-pm-secondary">
                            GST {formatAUD(item.gst_cents)}
                          </p>
                        </div>
                        <p className="text-sm text-pm-secondary md:text-right">
                          <span className="md:hidden">Qty </span>{item.quantity}
                        </p>
                        <p className="text-sm text-pm-secondary md:text-right">
                          <span className="md:hidden">Unit </span>{formatAUD(item.unit_price_cents)}
                        </p>
                        <p className="text-sm font-semibold text-pm-body md:text-right">
                          <span className="md:hidden">Amount </span>{formatAUD(item.total_cents)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Linked Quote items */}
            {linkedQuote && linkedQuoteIncludedItems.length > 0 && (
              <section className="rounded-3xl border border-pm-border bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-pm-body">Linked Quote</h3>
                  <span className="rounded-full bg-pm-teal-light px-3 py-1 text-xs font-medium capitalize text-pm-teal-hover">
                    {linkedQuote.status}
                  </span>
                </div>
                <p className="mb-3 text-sm font-medium text-pm-body">
                  {linkedQuote.quote_number}
                  {linkedQuote.title ? ` — ${linkedQuote.title}` : ''}
                </p>
                <div className="divide-y divide-pm-border rounded-2xl border border-pm-border">
                  {linkedQuoteIncludedItems.map((item, index) => (
                    <div key={`${item.description}-${index}`} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="whitespace-pre-wrap text-sm font-medium text-pm-body">
                          {item.description}
                        </p>
                        <p className="shrink-0 text-sm font-semibold text-pm-body">
                          {formatAUD(item.total_cents)}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-pm-secondary">
                        Qty {item.quantity} × {formatAUD(item.unit_price_cents)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Notes */}
            {invoice.notes && (
              <section className="rounded-3xl border border-pm-border bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-pm-body">Notes</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-pm-body">{invoice.notes}</p>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Invoice details */}
            <section className="rounded-3xl border border-pm-border bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-pm-body">Details</h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <InfoRow label="Issued" value={formatDate(invoice.created_at)} />
                <InfoRow
                  label="Due Date"
                  value={invoice.due_date ? formatDate(invoice.due_date) : 'No due date'}
                />
                {invoice.paid_date && (
                  <InfoRow label="Paid Date" value={formatDate(invoice.paid_date)} />
                )}
                {linkedQuote && (
                  <InfoRow
                    label="Linked Quote"
                    value={`${linkedQuote.quote_number}${linkedQuote.title ? ` · ${linkedQuote.title}` : ''}`}
                  />
                )}
                {invoice.business_abn && (
                  <InfoRow label="ABN" value={formatABN(invoice.business_abn)} />
                )}
              </div>
            </section>

            {/* Customer */}
            <section className="rounded-3xl border border-pm-border bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-pm-body">Customer</h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <InfoRow label="Name" value={invoice.customer.name} />
                <InfoRow label="Email" value={invoice.customer.email} />
                <InfoRow label="Phone" value={invoice.customer.phone} />
                <InfoRow label="Address" value={invoice.customer.address} />
              </div>
            </section>

            {/* Payment summary */}
            <section className="rounded-3xl border border-pm-border bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-pm-body">Payment</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-pm-secondary">Subtotal</dt>
                  <dd className="font-medium text-pm-body">{formatAUD(invoice.subtotal_cents)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-pm-secondary">GST (10%)</dt>
                  <dd className="font-medium text-pm-body">{formatAUD(invoice.gst_cents)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-pm-secondary">Paid</dt>
                  <dd className="font-medium text-pm-body">{formatAUD(invoice.amount_paid_cents)}</dd>
                </div>
                {invoice.payment_method && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-pm-secondary">Method</dt>
                    <dd className="font-medium text-pm-body">
                      {PAYMENT_METHOD_LABEL[invoice.payment_method]}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 border-t border-pm-border pt-3">
                  <dt className="font-semibold text-pm-body">Balance Due</dt>
                  <dd className="text-base font-semibold text-pm-teal">{formatAUD(balanceCents)}</dd>
                </div>
              </dl>
            </section>

            {/* Payment details */}
            {(invoice.payment_terms || invoice.bank_details) && (
              <section className="rounded-3xl border border-pm-border bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-pm-body">Payment Details</h3>
                <div className="space-y-4">
                  {invoice.payment_terms && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-pm-secondary">
                        Terms
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-pm-body">
                        {invoice.payment_terms}
                      </p>
                    </div>
                  )}
                  {invoice.bank_details && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-pm-secondary">
                        Bank
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-pm-body">
                        {invoice.bank_details}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={openDeleteDialog}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setOpenDeleteDialog(false)}
      />
    </>
  );
}
