'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  updateCustomer,
  deleteCustomer,
  type Customer,
  type CustomerFormData,
  type CustomerProperty,
} from '@/app/actions/customers';
import type { QuoteListItem } from '@/lib/quotes';
import type { InvoiceListItem } from '@/types/invoice';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { formatAUD, formatDate } from '@/utils/format';

function toFormData(c: Customer): CustomerFormData {
  return {
    name: c.name ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    emails: c.emails?.length ? c.emails : [c.email ?? ''],
    phones: c.phones?.length ? c.phones : [c.phone ?? ''],
    company_name: c.company_name ?? '',
    address_line1: c.address_line1 ?? '',
    address_line2: c.address_line2 ?? '',
    city: c.city ?? '',
    state: c.state ?? '',
    postcode: c.postcode ?? '',
    properties: c.properties?.length
      ? c.properties
      : [
          {
            label: 'Primary property',
            address_line1: c.address_line1 ?? '',
            address_line2: c.address_line2 ?? '',
            city: c.city ?? '',
            state: c.state ?? '',
            postcode: c.postcode ?? '',
            notes: '',
          },
        ],
    billing_same_as_site: c.billing_same_as_site ?? true,
    billing_address_line1: c.billing_address_line1 ?? '',
    billing_address_line2: c.billing_address_line2 ?? '',
    billing_city: c.billing_city ?? '',
    billing_state: c.billing_state ?? '',
    billing_postcode: c.billing_postcode ?? '',
    notes: c.notes ?? '',
  };
}

function formatBillingAddress(c: Customer): string {
  return [
    c.billing_address_line1,
    c.billing_address_line2,
    c.billing_city,
    c.billing_state,
    c.billing_postcode,
  ]
    .filter(Boolean)
    .join(', ');
}

function formatPropertyAddress(property: CustomerProperty) {
  return [
    property.address_line1,
    property.address_line2,
    property.city,
    property.state,
    property.postcode,
  ]
    .filter(Boolean)
    .join(', ');
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-pm-secondary">
        {label}
      </p>
      <p className="text-base text-pm-body">{value || '-'}</p>
    </div>
  );
}

function PhoneValue({ value, primary }: { value: string; primary: boolean }) {
  const tel = value.replace(/\s/g, '');
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <a
        href={`tel:${tel}`}
        className="min-w-0 break-all text-base text-pm-teal underline-offset-2 hover:underline active:opacity-70"
      >
        {value}
      </a>
      {primary && (
        <span className="shrink-0 rounded-full bg-pm-teal-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pm-teal">
          Primary
        </span>
      )}
    </div>
  );
}

function EmailValue({ value, primary }: { value: string; primary: boolean }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <a
        href={`mailto:${value}`}
        className="min-w-0 break-all text-base text-pm-teal underline-offset-2 hover:underline active:opacity-70"
      >
        {value}
      </a>
      {primary && (
        <span className="shrink-0 rounded-full bg-pm-teal-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pm-teal">
          Primary
        </span>
      )}
    </div>
  );
}

function getContactValues(values: string[] | undefined, fallback: string | null) {
  return values?.length ? values : fallback ? [fallback] : [];
}

type DialogType = 'cancel' | 'delete' | null;

const QUOTE_STATUS_STYLE: Record<string, string> = {
  draft:    'bg-pm-surface text-pm-secondary border border-pm-border',
  sent:     'bg-blue-50 text-blue-700 border border-blue-200',
  approved: 'bg-pm-teal-light text-pm-teal border border-pm-teal-pale',
  declined: 'bg-red-50 text-red-600 border border-red-200',
  expired:  'bg-orange-50 text-orange-700 border border-orange-200',
};

const INVOICE_STATUS_STYLE: Record<string, string> = {
  draft:     'bg-pm-surface text-pm-secondary border border-pm-border',
  sent:      'bg-blue-50 text-blue-700 border border-blue-200',
  paid:      'bg-green-50 text-green-700 border border-green-200',
  overdue:   'bg-red-50 text-red-600 border border-red-200',
  cancelled: 'bg-pm-surface text-pm-secondary border border-pm-border',
};

interface Props {
  customer: Customer;
  quotes?: QuoteListItem[];
  invoices?: InvoiceListItem[];
}

export function CustomerDetail({ customer, quotes = [], invoices = [] }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogType>(null);

  function confirmCancelEdit() {
    setError(null);
    setEditing(false);
    setDialog(null);
  }

  async function confirmDelete() {
    setDialog(null);
    setDeleting(true);
    const result = await deleteCustomer(customer.id);
    if (result?.error) {
      setError(result.error);
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <>
        <CustomerForm
          defaultValues={toFormData(customer)}
          onSubmit={(data) => updateCustomer(customer.id, data)}
          onSuccess={() => {
            setEditing(false);
            router.refresh();
          }}
          onCancel={() => setDialog('cancel')}
          submitLabel="Save Changes"
        />
        <ConfirmDialog
          open={dialog === 'cancel'}
          title="Discard Changes"
          message="Are you sure you want to cancel? Any unsaved changes will be lost."
          confirmLabel="Yes, discard"
          cancelLabel="Keep editing"
          onConfirm={confirmCancelEdit}
          onCancel={() => setDialog(null)}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 pb-10">
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setEditing(true)}
            className="min-h-11 rounded-lg border border-pm-border bg-white px-5 text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface"
          >
            Edit
          </button>
          <button
            onClick={() => setDialog('delete')}
            disabled={deleting}
            className="min-h-11 rounded-lg bg-red-600 px-5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
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
              Contact Details
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <InfoRow label="Full Name" value={customer.name} />
            <InfoRow label="Company" value={customer.company_name} />
            <div>
              <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-pm-secondary">
                Emails
              </p>
              <div className="min-w-0 space-y-1">
                {getContactValues(customer.emails, customer.email).map(
                  (email, index) => (
                    <EmailValue
                      key={`${email}-${index}`}
                      value={email}
                      primary={index === 0}
                    />
                  )
                )}
                {!customer.email && !customer.emails?.length && (
                  <p className="text-base text-pm-body">-</p>
                )}
              </div>
            </div>
            <div>
              <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-pm-secondary">
                Phone Numbers
              </p>
              <div className="min-w-0 space-y-1">
                {getContactValues(customer.phones, customer.phone).map(
                  (phone, index) => (
                    <PhoneValue
                      key={`${phone}-${index}`}
                      value={phone}
                      primary={index === 0}
                    />
                  )
                )}
                {!customer.phone && !customer.phones?.length && (
                  <p className="text-base text-pm-body">-</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="divide-y divide-pm-border rounded-xl border border-pm-border bg-white">
          <div className="rounded-t-xl bg-pm-surface px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
              Site Address
            </h3>
          </div>
          <div className="space-y-3 px-5 py-4">
            {customer.properties?.length ? (
              customer.properties.map((property, index) => (
                <div key={`${property.label}-${index}`} className="rounded-lg border border-pm-border bg-pm-surface px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-pm-body">{property.label || `Site ${index + 1}`}</p>
                    {index === 0 && (
                      <span className="rounded-full bg-pm-teal-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pm-teal">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-pm-secondary">
                    {formatPropertyAddress(property) || '-'}
                  </p>
                  {property.notes && (
                    <p className="mt-2 text-sm text-pm-secondary">{property.notes}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-base text-pm-body">-</p>
            )}
          </div>
        </section>

        <section className="divide-y divide-pm-border rounded-xl border border-pm-border bg-white">
          <div className="rounded-t-xl bg-pm-surface px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
              Billing Address
            </h3>
          </div>
          <div className="px-5 py-4">
            {customer.billing_same_as_site !== false ? (
              <p className="text-sm text-pm-secondary">Same as site address</p>
            ) : (
              <p className="text-base text-pm-body">
                {formatBillingAddress(customer) || '-'}
              </p>
            )}
          </div>
        </section>

        {customer.notes && (
          <section className="divide-y divide-pm-border rounded-xl border border-pm-border bg-white">
            <div className="rounded-t-xl bg-pm-surface px-5 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                Notes
              </h3>
            </div>
            <div className="px-5 py-4">
              <p className="whitespace-pre-wrap text-base text-pm-body">{customer.notes}</p>
            </div>
          </section>
        )}

        {/* ── Quotes ── */}
        <section className="divide-y divide-pm-border rounded-xl border border-pm-border bg-white">
          <div className="rounded-t-xl bg-pm-surface px-5 py-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
              Quotes
              {quotes.length > 0 && (
                <span className="ml-2 text-pm-body">{quotes.length}</span>
              )}
            </h3>
            <Link
              href={`/quotes/new?customer_id=${customer.id}`}
              className="text-xs font-medium text-pm-teal hover:underline"
            >
              + New Quote
            </Link>
          </div>
          {quotes.length === 0 ? (
            <div className="px-5 py-4">
              <p className="text-sm text-pm-secondary">No quotes yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-pm-border">
              {quotes.map((q) => {
                const statusClass =
                  QUOTE_STATUS_STYLE[q.status] ?? QUOTE_STATUS_STYLE.draft;
                return (
                  <li key={q.id}>
                    <Link
                      href={`/quotes/${q.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-pm-surface active:bg-pm-surface transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-pm-body">
                            {q.quote_number}
                          </span>
                          {q.title && (
                            <span className="truncate text-sm text-pm-secondary">
                              · {q.title}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-pm-secondary">
                          {formatDate(q.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}>
                          {q.status}
                        </span>
                        <span className="text-sm font-medium text-pm-body">
                          {formatAUD(q.total_cents)}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Invoices ── */}
        <section className="divide-y divide-pm-border rounded-xl border border-pm-border bg-white">
          <div className="rounded-t-xl bg-pm-surface px-5 py-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
              Invoices
              {invoices.length > 0 && (
                <span className="ml-2 text-pm-body">{invoices.length}</span>
              )}
            </h3>
            <Link
              href={`/invoices/new?customer_id=${customer.id}`}
              className="text-xs font-medium text-pm-teal hover:underline"
            >
              + New Invoice
            </Link>
          </div>
          {invoices.length === 0 ? (
            <div className="px-5 py-4">
              <p className="text-sm text-pm-secondary">No invoices yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-pm-border">
              {invoices.map((inv) => {
                const statusClass =
                  INVOICE_STATUS_STYLE[inv.status] ?? INVOICE_STATUS_STYLE.draft;
                const isOverdue = inv.status === 'overdue';
                return (
                  <li key={inv.id}>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-pm-surface active:bg-pm-surface transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-pm-body">
                            {inv.invoice_number}
                          </span>
                          {inv.quote_stage_label && (
                            <span className="text-xs text-pm-secondary">
                              · {inv.quote_stage_label}
                            </span>
                          )}
                        </div>
                        <p className={`mt-0.5 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-pm-secondary'}`}>
                          {inv.due_date
                            ? `Due ${formatDate(inv.due_date)}`
                            : formatDate(inv.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}>
                          {inv.status}
                        </span>
                        <span className="text-sm font-medium text-pm-body">
                          {formatAUD(inv.total_cents)}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={dialog === 'delete'}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}
