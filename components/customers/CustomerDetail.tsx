'use client';

import { useState } from 'react';
import {
  updateCustomer,
  deleteCustomer,
  type Customer,
  type CustomerFormData,
} from '@/app/actions/customers';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

const FIELD_CLASS =
  'w-full rounded-lg border border-pm-border bg-white px-4 py-3 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30 h-12';

const FIELD_DISABLED_CLASS =
  'w-full rounded-lg border border-pm-border bg-pm-surface px-4 py-3 text-base text-pm-secondary h-12 flex items-center';

const LABEL_CLASS = 'block text-sm font-medium text-pm-body mb-1';
const REQUIRED = <span className="text-pm-coral ml-0.5">*</span>;
const OPTIONAL = <span className="ml-1.5 text-xs font-normal text-pm-secondary">(optional)</span>;

function toFormData(c: Customer): CustomerFormData {
  return {
    name: c.name ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    company_name: c.company_name ?? '',
    address_line1: c.address_line1 ?? '',
    address_line2: c.address_line2 ?? '',
    city: c.city ?? '',
    state: c.state ?? '',
    postcode: c.postcode ?? '',
    notes: c.notes ?? '',
  };
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-pm-secondary uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-base text-pm-body">{value || '—'}</p>
    </div>
  );
}

/* ─────────────────────────────────────────── */

type DialogType = 'cancel' | 'delete' | null;

interface Props {
  customer: Customer;
}

export function CustomerDetail({ customer }: Props) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCompanyName, setUseCompanyName] = useState(false);
  const [form, setForm] = useState<CustomerFormData>(toFormData(customer));
  const [dialog, setDialog] = useState<DialogType>(null);

  /* ── 수정 취소 확인 ── */
  function confirmCancelEdit() {
    setForm(toFormData(customer));
    setUseCompanyName(false);
    setError(null);
    setEditing(false);
    setDialog(null);
  }

  /* ── 삭제 실행 ── */
  async function confirmDelete() {
    setDialog(null);
    setDeleting(true);
    const result = await deleteCustomer(customer.id);
    if (result?.error) {
      setError(result.error);
      setDeleting(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'company_name' && useCompanyName) next.name = value;
      return next;
    });
    setError(null);
  }

  function handleUseCompanyName(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked;
    setUseCompanyName(checked);
    if (checked) setForm((prev) => ({ ...prev, name: prev.company_name }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await updateCustomer(customer.id, form);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  const canSubmit = Boolean(form.name.trim());

  const fullAddress = [
    customer.address_line1,
    customer.address_line2,
    customer.city,
    customer.state,
    customer.postcode,
  ]
    .filter(Boolean)
    .join(', ');

  /* ═══════════════════ VIEW MODE ═══════════════════ */
  if (!editing) {
    return (
      <>
        <div className="flex flex-col gap-6 pb-10">
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setEditing(true)}
              className="h-10 px-5 rounded-lg border border-pm-border bg-white text-sm font-medium text-pm-body hover:bg-pm-surface transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setDialog('delete')}
              disabled={deleting}
              className="h-10 px-5 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-pm-coral-light border border-pm-coral px-4 py-3">
              <p className="text-sm text-pm-coral-dark">{error}</p>
            </div>
          )}

          <section className="rounded-xl border border-pm-border bg-white divide-y divide-pm-border">
            <div className="px-5 py-3 bg-pm-surface rounded-t-xl">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                Contact Details
              </h3>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Full Name" value={customer.name} />
              <InfoRow label="Company" value={customer.company_name} />
              <InfoRow label="Email" value={customer.email} />
              <InfoRow label="Phone" value={customer.phone} />
            </div>
          </section>

          <section className="rounded-xl border border-pm-border bg-white divide-y divide-pm-border">
            <div className="px-5 py-3 bg-pm-surface rounded-t-xl">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                Address
              </h3>
            </div>
            <div className="px-5 py-4">
              <InfoRow label="Full Address" value={fullAddress || null} />
            </div>
          </section>

          {customer.notes && (
            <section className="rounded-xl border border-pm-border bg-white divide-y divide-pm-border">
              <div className="px-5 py-3 bg-pm-surface rounded-t-xl">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                  Notes
                </h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-base text-pm-body whitespace-pre-wrap">{customer.notes}</p>
              </div>
            </section>
          )}
        </div>

        {/* Delete 확인 다이얼로그 */}
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

  /* ═══════════════════ EDIT MODE ═══════════════════ */
  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-28">
        {/* Contact Details */}
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary mb-3">
            Contact Details
          </h3>
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="edit-name" className={LABEL_CLASS}>
                Full Name{REQUIRED}
              </label>
              {useCompanyName ? (
                <div className={FIELD_DISABLED_CLASS}>
                  <span className={form.company_name ? 'text-pm-body' : 'text-pm-border'}>
                    {form.company_name || 'Auto-filled from company name'}
                  </span>
                </div>
              ) : (
                <input
                  id="edit-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="e.g. John Smith"
                  value={form.name}
                  onChange={handleChange}
                  className={FIELD_CLASS}
                />
              )}
            </div>

            <div>
              <label htmlFor="edit-company_name" className={LABEL_CLASS}>
                Company Name
                {OPTIONAL}
              </label>
              <input
                id="edit-company_name"
                name="company_name"
                type="text"
                autoComplete="organization"
                placeholder="e.g. Smith Painting Co."
                value={form.company_name}
                onChange={handleChange}
                className={FIELD_CLASS}
              />
              <label className="mt-2 flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useCompanyName}
                  onChange={handleUseCompanyName}
                  className="w-5 h-5 rounded border-pm-border text-pm-teal focus:ring-pm-teal-mid cursor-pointer"
                />
                <span className="text-sm text-pm-secondary">
                  Save using company name as the display name
                </span>
              </label>
            </div>

            <div>
              <label htmlFor="edit-email" className={LABEL_CLASS}>
                Email{OPTIONAL}
              </label>
              <input
                id="edit-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="e.g. john@example.com"
                value={form.email}
                onChange={handleChange}
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label htmlFor="edit-phone" className={LABEL_CLASS}>
                Phone{OPTIONAL}
              </label>
              <input
                id="edit-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="e.g. 0412 345 678"
                value={form.phone}
                onChange={handleChange}
                className={FIELD_CLASS}
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary mb-3">
            Address
          </h3>
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="edit-address_line1" className={LABEL_CLASS}>
                Street Address{OPTIONAL}
              </label>
              <input
                id="edit-address_line1"
                name="address_line1"
                type="text"
                autoComplete="address-line1"
                placeholder="e.g. 12 Harbor St"
                value={form.address_line1}
                onChange={handleChange}
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label htmlFor="edit-address_line2" className={LABEL_CLASS}>
                Unit / Apt
                {OPTIONAL}
              </label>
              <input
                id="edit-address_line2"
                name="address_line2"
                type="text"
                autoComplete="address-line2"
                placeholder="e.g. Unit 3"
                value={form.address_line2}
                onChange={handleChange}
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label htmlFor="edit-city" className={LABEL_CLASS}>
                Suburb{OPTIONAL}
              </label>
              <input
                id="edit-city"
                name="city"
                type="text"
                autoComplete="address-level2"
                placeholder="e.g. Manly"
                value={form.city}
                onChange={handleChange}
                className={FIELD_CLASS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-state" className={LABEL_CLASS}>
                  State{OPTIONAL}
                </label>
                <select
                  id="edit-state"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  className={FIELD_CLASS}
                >
                  <option value="">Select</option>
                  {AU_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-postcode" className={LABEL_CLASS}>
                  Postcode{OPTIONAL}
                </label>
                <input
                  id="edit-postcode"
                  name="postcode"
                  type="text"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 2095"
                  value={form.postcode}
                  onChange={handleChange}
                  className={FIELD_CLASS}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary mb-3">
            Notes
          </h3>
          <div>
            <label htmlFor="edit-notes" className={LABEL_CLASS}>
              Internal Notes
              <span className="ml-1.5 text-xs font-normal text-pm-secondary">(not shown to client)</span>
            </label>
            <textarea
              id="edit-notes"
              name="notes"
              rows={3}
              placeholder="e.g. Prefers work before 9am, park in rear"
              value={form.notes}
              onChange={handleChange}
              className="w-full rounded-lg border border-pm-border bg-white px-4 py-3 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30 resize-none"
            />
          </div>
        </section>

        {error && (
          <div className="rounded-lg bg-pm-coral-light border border-pm-coral px-4 py-3">
            <p className="text-sm text-pm-coral-dark">{error}</p>
          </div>
        )}

        {/* 하단 고정 CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-pm-border px-4 py-4">
          <div className="max-w-lg mx-auto flex gap-3">
            <button
              type="button"
              onClick={() => setDialog('cancel')}
              disabled={loading}
              className="flex-1 h-14 rounded-xl border border-pm-border bg-white text-base font-medium text-pm-body active:bg-pm-surface disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="flex-2 h-14 rounded-xl bg-pm-teal text-base font-semibold text-white active:bg-pm-teal-hover disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>

      {/* Cancel 확인 다이얼로그 */}
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
