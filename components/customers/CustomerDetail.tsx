'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateCustomer,
  deleteCustomer,
  type Customer,
  type CustomerFormData,
  type CustomerProperty,
} from '@/app/actions/customers';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CustomerForm } from '@/components/customers/CustomerForm';

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
    notes: c.notes ?? '',
  };
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

function ContactValue({ value, primary }: { value: string; primary: boolean }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span className="min-w-0 break-all text-base text-pm-body">{value}</span>
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

interface Props {
  customer: Customer;
}

export function CustomerDetail({ customer }: Props) {
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
            className="h-10 rounded-lg border border-pm-border bg-white px-5 text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface"
          >
            Edit
          </button>
          <button
            onClick={() => setDialog('delete')}
            disabled={deleting}
            className="h-10 rounded-lg bg-red-600 px-5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
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
                    <ContactValue
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
                    <ContactValue
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
              Properties
            </h3>
          </div>
          <div className="space-y-3 px-5 py-4">
            {customer.properties?.length ? (
              customer.properties.map((property, index) => (
                <div key={`${property.label}-${index}`} className="rounded-lg border border-pm-border bg-pm-surface px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-pm-body">{property.label || `Property ${index + 1}`}</p>
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
