'use client';

import Link from 'next/link';
import { useState } from 'react';
import { deleteInvoice } from '@/app/actions/invoices';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { InvoiceWithCustomer } from '@/types/invoice';
import { formatAUD, formatDate } from '@/utils/format';

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-pm-secondary">
        {label}
      </p>
      <p className="text-base text-pm-body">{value || '—'}</p>
    </div>
  );
}

export function InvoiceDetail({ invoice }: { invoice: InvoiceWithCustomer }) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const balanceCents = Math.max(invoice.total_cents - invoice.amount_paid_cents, 0);

  async function confirmDelete() {
    setOpenDeleteDialog(false);
    setDeleting(true);
    const result = await deleteInvoice(invoice.id);
    if (result?.error) {
      setError(result.error);
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6 pb-10">
        <div className="flex justify-end gap-3">
          <Link
            href={`/invoices/${invoice.id}/edit`}
            className="h-10 rounded-lg border border-pm-border bg-white px-5 text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface flex items-center"
          >
            Edit
          </Link>
          <button
            onClick={() => setOpenDeleteDialog(true)}
            disabled={deleting}
            className="h-10 rounded-lg bg-red-600 px-5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3">
            <p className="text-sm text-pm-coral-dark">{error}</p>
          </div>
        )}

        <section className="divide-y divide-pm-border rounded-xl border border-pm-border bg-white">
          <div className="rounded-t-xl bg-pm-surface px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
              Invoice Details
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <InfoRow label="Invoice Number" value={invoice.invoice_number} />
            <InfoRow
              label="Status"
              value={`${invoice.invoice_type} · ${invoice.status}`}
            />
            <InfoRow label="Issued" value={formatDate(invoice.created_at)} />
            <InfoRow
              label="Due Date"
              value={invoice.due_date ? formatDate(invoice.due_date) : 'No due date'}
            />
            <InfoRow label="Total" value={formatAUD(invoice.total_cents)} />
            <InfoRow label="Balance" value={formatAUD(balanceCents)} />
          </div>
        </section>

        <section className="divide-y divide-pm-border rounded-xl border border-pm-border bg-white">
          <div className="rounded-t-xl bg-pm-surface px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
              Customer
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <InfoRow label="Name" value={invoice.customer.name} />
            <InfoRow label="Email" value={invoice.customer.email} />
            <InfoRow label="Phone" value={invoice.customer.phone} />
            <InfoRow label="Address" value={invoice.customer.address} />
          </div>
        </section>

        <section className="divide-y divide-pm-border rounded-xl border border-pm-border bg-white">
          <div className="rounded-t-xl bg-pm-surface px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
              Line Items
            </h3>
          </div>
          <div className="flex flex-col divide-y divide-pm-border">
            {invoice.line_items.map((item) => (
              <div key={item.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-pm-body">{item.description}</p>
                    <p className="mt-0.5 text-sm text-pm-secondary">Qty {item.quantity}</p>
                  </div>
                  <p className="text-right text-sm font-semibold text-pm-body">
                    {formatAUD(item.total_cents)}
                  </p>
                </div>
                <div className="mt-2 text-sm text-pm-secondary">
                  Unit {formatAUD(item.unit_price_cents)} · GST {formatAUD(item.gst_cents)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="divide-y divide-pm-border rounded-xl border border-pm-border bg-white">
          <div className="rounded-t-xl bg-pm-surface px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
              Notes
            </h3>
          </div>
          <div className="px-5 py-4">
            <p className="whitespace-pre-wrap text-base text-pm-body">
              {invoice.notes || '—'}
            </p>
          </div>
        </section>

        <div className="flex justify-end">
          <a
            href={`/api/pdf/invoice?id=${invoice.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-lg border border-pm-border bg-white px-5 text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface"
          >
            Open PDF
          </a>
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
