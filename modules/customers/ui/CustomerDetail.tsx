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
import type { InvoiceListItem } from '@/modules/invoices/domain/invoice';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CustomerForm } from '@/modules/customers/ui/CustomerForm';
import {
  INVOICE_STATUS_TONE,
  QUOTE_STATUS_TONE,
  type StatusTone,
} from '@/lib/constants/status-colors';
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
      <p className="text-on-surface-variant mb-0.5 text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-on-surface text-base">{value || '-'}</p>
    </div>
  );
}

function PhoneValue({ value, primary }: { value: string; primary: boolean }) {
  const tel = value.replace(/\s/g, '');
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <a
        href={`tel:${tel}`}
        className="text-primary focus-visible:ring-primary/30 hover:bg-primary/10 inline-flex min-h-11 min-w-0 items-center rounded-xl px-2 text-base break-all underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none active:opacity-70"
      >
        {value}
      </a>
      {primary && (
        <span className="bg-success-container text-primary shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
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
        className="text-primary focus-visible:ring-primary/30 hover:bg-primary/10 inline-flex min-h-11 min-w-0 items-center rounded-xl px-2 text-base break-all underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none active:opacity-70"
      >
        {value}
      </a>
      {primary && (
        <span className="bg-success-container text-primary shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
          Primary
        </span>
      )}
    </div>
  );
}

function getContactValues(
  values: string[] | undefined,
  fallback: string | null
) {
  return values?.length ? values : fallback ? [fallback] : [];
}

type DialogType = 'cancel' | 'delete' | null;

function formatStatusLabel(status: string) {
  const normalized = status.trim().toLowerCase();
  if (!normalized) return 'Unknown';
  return normalized
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function resolveStatusTone(
  status: string,
  tones: Record<string, StatusTone>
): StatusTone {
  return tones[status.trim().toLowerCase()] ?? 'neutral';
}

interface Props {
  customer: Customer;
  quotes?: QuoteListItem[];
  invoices?: InvoiceListItem[];
}

export function CustomerDetail({
  customer,
  quotes = [],
  invoices = [],
}: Props) {
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
            className="border-outline bg-surface-container-lowest text-on-surface hover:bg-surface-container-low focus-visible:ring-primary/30 min-h-11 rounded-xl border px-5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Edit
          </button>
          <button
            onClick={() => setDialog('delete')}
            disabled={deleting}
            className="bg-error text-on-error hover:bg-error/90 focus-visible:ring-error/30 min-h-11 rounded-xl px-5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <section className="divide-outline border-outline bg-surface-container-lowest divide-y rounded-2xl border">
          <div className="bg-surface-container-low rounded-t-2xl px-5 py-3">
            <h3 className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
              Contact Details
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <InfoRow label="Full Name" value={customer.name} />
            <InfoRow label="Company" value={customer.company_name} />
            <div>
              <p className="text-on-surface-variant mb-0.5 text-xs font-medium tracking-wide uppercase">
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
                  <p className="text-on-surface text-base">-</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-on-surface-variant mb-0.5 text-xs font-medium tracking-wide uppercase">
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
                  <p className="text-on-surface text-base">-</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="divide-outline border-outline bg-surface-container-lowest divide-y rounded-2xl border">
          <div className="bg-surface-container-low rounded-t-2xl px-5 py-3">
            <h3 className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
              Site Address
            </h3>
          </div>
          <div className="space-y-3 px-5 py-4">
            {customer.properties?.length ? (
              customer.properties.map((property, index) => (
                <div
                  key={`${property.label}-${index}`}
                  className="border-outline bg-surface-container-low rounded-xl border px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-on-surface font-medium">
                      {property.label || `Site ${index + 1}`}
                    </p>
                    {index === 0 && (
                      <span className="bg-success-container text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-on-surface-variant mt-1 text-sm">
                    {formatPropertyAddress(property) || '-'}
                  </p>
                  {property.notes && (
                    <p className="text-on-surface-variant mt-2 text-sm">
                      {property.notes}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-on-surface text-base">-</p>
            )}
          </div>
        </section>

        <section className="divide-outline border-outline bg-surface-container-lowest divide-y rounded-2xl border">
          <div className="bg-surface-container-low rounded-t-2xl px-5 py-3">
            <h3 className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
              Billing Address
            </h3>
          </div>
          <div className="px-5 py-4">
            {customer.billing_same_as_site !== false ? (
              <p className="text-on-surface-variant text-sm">
                Same as site address
              </p>
            ) : (
              <p className="text-on-surface text-base">
                {formatBillingAddress(customer) || '-'}
              </p>
            )}
          </div>
        </section>

        {customer.notes && (
          <section className="divide-outline border-outline bg-surface-container-lowest divide-y rounded-2xl border">
            <div className="bg-surface-container-low rounded-t-2xl px-5 py-3">
              <h3 className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
                Notes
              </h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-on-surface text-base whitespace-pre-wrap">
                {customer.notes}
              </p>
            </div>
          </section>
        )}

        {/* ── Quotes ── */}
        <section className="divide-outline border-outline bg-surface-container-lowest divide-y rounded-2xl border">
          <div className="bg-surface-container-low flex items-center justify-between gap-3 rounded-t-2xl px-5 py-3">
            <h3 className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
              Quotes
              {quotes.length > 0 && (
                <span className="text-on-surface ml-2">{quotes.length}</span>
              )}
            </h3>
            <Link
              href={`/quotes/new?customer_id=${customer.id}`}
              className="text-primary hover:bg-primary/10 focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
            >
              + New Quote
            </Link>
          </div>
          {quotes.length === 0 ? (
            <div className="px-5 py-4">
              <p className="text-on-surface-variant text-sm">No quotes yet.</p>
            </div>
          ) : (
            <ul className="divide-outline divide-y">
              {quotes.map((q) => {
                const normalizedStatus = q.status.trim().toLowerCase();
                const label = formatStatusLabel(q.status);
                return (
                  <li key={q.id}>
                    <Link
                      href={`/quotes/${q.id}`}
                      className="hover:bg-surface-container-low active:bg-surface-container-low focus-visible:ring-primary/30 flex items-center gap-3 rounded-xl px-5 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-on-surface text-sm font-semibold">
                            {q.quote_number}
                          </span>
                          {q.title && (
                            <span className="text-on-surface-variant truncate text-sm">
                              · {q.title}
                            </span>
                          )}
                        </div>
                        <p className="text-on-surface-variant mt-0.5 text-xs">
                          {formatDate(q.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <StatusBadge
                          tone={resolveStatusTone(
                            normalizedStatus,
                            QUOTE_STATUS_TONE
                          )}
                          label={label}
                        />
                        <span className="text-on-surface text-sm font-medium">
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
        <section className="divide-outline border-outline bg-surface-container-lowest divide-y rounded-2xl border">
          <div className="bg-surface-container-low flex items-center justify-between gap-3 rounded-t-2xl px-5 py-3">
            <h3 className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
              Invoices
              {invoices.length > 0 && (
                <span className="text-on-surface ml-2">{invoices.length}</span>
              )}
            </h3>
            <Link
              href={`/invoices/new?customer_id=${customer.id}`}
              className="text-primary hover:bg-primary/10 focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
            >
              + New Invoice
            </Link>
          </div>
          {invoices.length === 0 ? (
            <div className="px-5 py-4">
              <p className="text-on-surface-variant text-sm">
                No invoices yet.
              </p>
            </div>
          ) : (
            <ul className="divide-outline divide-y">
              {invoices.map((inv) => {
                const normalizedStatus = inv.status.trim().toLowerCase();
                const isOverdue = inv.status === 'overdue';
                return (
                  <li key={inv.id}>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="hover:bg-surface-container-low active:bg-surface-container-low focus-visible:ring-primary/30 flex items-center gap-3 rounded-xl px-5 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-on-surface text-sm font-semibold">
                            {inv.invoice_number}
                          </span>
                          {inv.quote_stage_label && (
                            <span className="text-on-surface-variant text-xs">
                              · {inv.quote_stage_label}
                            </span>
                          )}
                        </div>
                        <p
                          className={`mt-0.5 text-xs ${isOverdue ? 'text-error font-medium' : 'text-on-surface-variant'}`}
                        >
                          {inv.due_date
                            ? `Due ${formatDate(inv.due_date)}`
                            : formatDate(inv.created_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <StatusBadge
                          tone={resolveStatusTone(
                            normalizedStatus,
                            INVOICE_STATUS_TONE
                          )}
                          label={formatStatusLabel(inv.status)}
                        />
                        <span className="text-on-surface text-sm font-medium">
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
