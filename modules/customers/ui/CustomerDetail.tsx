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
} from '@/modules/customers/application/actions';
import type { QuoteListItem } from '@/modules/quotes/domain/quotes';
import type { InvoiceListItem } from '@/types/invoice';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CustomerForm } from '@/modules/customers/ui/CustomerForm';
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
      <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      <p className="text-base text-on-surface">{value || '-'}</p>
    </div>
  );
}

function PhoneValue({ value, primary }: { value: string; primary: boolean }) {
  const tel = value.replace(/\s/g, '');
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <a
        href={`tel:${tel}`}
        className="min-w-0 break-all text-base text-primary underline-offset-2 hover:underline active:opacity-70"
      >
        {value}
      </a>
      {primary && (
        <span className="shrink-0 rounded-full bg-success-container px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
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
        className="min-w-0 break-all text-base text-primary underline-offset-2 hover:underline active:opacity-70"
      >
        {value}
      </a>
      {primary && (
        <span className="shrink-0 rounded-full bg-success-container px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
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
  draft:    'bg-surface-container-low text-on-surface-variant border border-outline',
  sent:     'bg-secondary-container text-on-secondary-container border border-secondary/30',
  approved: 'bg-success-container text-on-success-container border border-success/30',
  declined: 'bg-error-container text-error border border-error/30',
  expired:  'bg-warning-container text-on-warning-container border border-warning/30',
};

const INVOICE_STATUS_STYLE: Record<string, string> = {
  draft:     'bg-surface-container-low text-on-surface-variant border border-outline',
  sent:      'bg-secondary-container text-on-secondary-container border border-secondary/30',
  paid:      'bg-success-container text-on-success-container border border-success/30',
  overdue:   'bg-error-container text-error border border-error/30',
  cancelled: 'bg-surface-container-low text-on-surface-variant border border-outline',
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
            className="min-h-11 rounded-lg border border-outline bg-white px-5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
          >
            Edit
          </button>
          <button
            onClick={() => setDialog('delete')}
            disabled={deleting}
            className="min-h-11 rounded-lg bg-error px-5 text-sm font-medium text-on-error transition-colors hover:bg-error/90 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-error bg-error-container px-4 py-3">
            <p className="text-sm text-on-error-container">{error}</p>
          </div>
        )}

        <section className="divide-y divide-outline rounded-xl border border-outline bg-white">
          <div className="rounded-t-xl bg-surface-container-low px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Contact Details
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <InfoRow label="Full Name" value={customer.name} />
            <InfoRow label="Company" value={customer.company_name} />
            <div>
              <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
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
                  <p className="text-base text-on-surface">-</p>
                )}
              </div>
            </div>
            <div>
              <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
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
                  <p className="text-base text-on-surface">-</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="divide-y divide-outline rounded-xl border border-outline bg-white">
          <div className="rounded-t-xl bg-surface-container-low px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Site Address
            </h3>
          </div>
          <div className="space-y-3 px-5 py-4">
            {customer.properties?.length ? (
              customer.properties.map((property, index) => (
                <div key={`${property.label}-${index}`} className="rounded-lg border border-outline bg-surface-container-low px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-on-surface">{property.label || `Site ${index + 1}`}</p>
                    {index === 0 && (
                      <span className="rounded-full bg-success-container px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {formatPropertyAddress(property) || '-'}
                  </p>
                  {property.notes && (
                    <p className="mt-2 text-sm text-on-surface-variant">{property.notes}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-base text-on-surface">-</p>
            )}
          </div>
        </section>

        <section className="divide-y divide-outline rounded-xl border border-outline bg-white">
          <div className="rounded-t-xl bg-surface-container-low px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Billing Address
            </h3>
          </div>
          <div className="px-5 py-4">
            {customer.billing_same_as_site !== false ? (
              <p className="text-sm text-on-surface-variant">Same as site address</p>
            ) : (
              <p className="text-base text-on-surface">
                {formatBillingAddress(customer) || '-'}
              </p>
            )}
          </div>
        </section>

        {customer.notes && (
          <section className="divide-y divide-outline rounded-xl border border-outline bg-white">
            <div className="rounded-t-xl bg-surface-container-low px-5 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Notes
              </h3>
            </div>
            <div className="px-5 py-4">
              <p className="whitespace-pre-wrap text-base text-on-surface">{customer.notes}</p>
            </div>
          </section>
        )}

        {/* ── Quotes ── */}
        <section className="divide-y divide-outline rounded-xl border border-outline bg-white">
          <div className="rounded-t-xl bg-surface-container-low px-5 py-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Quotes
              {quotes.length > 0 && (
                <span className="ml-2 text-on-surface">{quotes.length}</span>
              )}
            </h3>
            <Link
              href={`/quotes/new?customer_id=${customer.id}`}
              className="text-xs font-medium text-primary hover:underline"
            >
              + New Quote
            </Link>
          </div>
          {quotes.length === 0 ? (
            <div className="px-5 py-4">
              <p className="text-sm text-on-surface-variant">No quotes yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-outline">
              {quotes.map((q) => {
                const statusClass =
                  QUOTE_STATUS_STYLE[q.status] ?? QUOTE_STATUS_STYLE.draft;
                return (
                  <li key={q.id}>
                    <Link
                      href={`/quotes/${q.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-surface-container-low active:bg-surface-container-low transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-on-surface">
                            {q.quote_number}
                          </span>
                          {q.title && (
                            <span className="truncate text-sm text-on-surface-variant">
                              · {q.title}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          {formatDate(q.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}>
                          {q.status}
                        </span>
                        <span className="text-sm font-medium text-on-surface">
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
        <section className="divide-y divide-outline rounded-xl border border-outline bg-white">
          <div className="rounded-t-xl bg-surface-container-low px-5 py-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Invoices
              {invoices.length > 0 && (
                <span className="ml-2 text-on-surface">{invoices.length}</span>
              )}
            </h3>
            <Link
              href={`/invoices/new?customer_id=${customer.id}`}
              className="text-xs font-medium text-primary hover:underline"
            >
              + New Invoice
            </Link>
          </div>
          {invoices.length === 0 ? (
            <div className="px-5 py-4">
              <p className="text-sm text-on-surface-variant">No invoices yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-outline">
              {invoices.map((inv) => {
                const statusClass =
                  INVOICE_STATUS_STYLE[inv.status] ?? INVOICE_STATUS_STYLE.draft;
                const isOverdue = inv.status === 'overdue';
                return (
                  <li key={inv.id}>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-surface-container-low active:bg-surface-container-low transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-on-surface">
                            {inv.invoice_number}
                          </span>
                          {inv.quote_stage_label && (
                            <span className="text-xs text-on-surface-variant">
                              · {inv.quote_stage_label}
                            </span>
                          )}
                        </div>
                        <p className={`mt-0.5 text-xs ${isOverdue ? 'text-error font-medium' : 'text-on-surface-variant'}`}>
                          {inv.due_date
                            ? `Due ${formatDate(inv.due_date)}`
                            : formatDate(inv.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}>
                          {inv.status}
                        </span>
                        <span className="text-sm font-medium text-on-surface">
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
