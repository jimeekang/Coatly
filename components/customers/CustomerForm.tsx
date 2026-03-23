'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCustomer, type CustomerFormData } from '@/app/actions/customers';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

const FIELD_CLASS =
  'w-full rounded-lg border border-pm-border bg-white px-4 py-3 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30 h-12';

const FIELD_DISABLED_CLASS =
  'w-full rounded-lg border border-pm-border bg-pm-surface px-4 py-3 text-base text-pm-secondary h-12 cursor-not-allowed';

const LABEL_CLASS = 'block text-sm font-medium text-pm-body mb-1';

const REQUIRED = <span className="ml-0.5 text-pm-coral">*</span>;
const OPTIONAL = <span className="ml-1.5 text-xs font-normal text-pm-secondary">(optional)</span>;

function createEmptyCustomerForm(): CustomerFormData {
  return {
    name: '',
    email: '',
    phone: '',
    company_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postcode: '',
    notes: '',
  };
}

function mergeCustomerFormDefaults(
  defaultValues?: Partial<CustomerFormData>
): CustomerFormData {
  return {
    ...createEmptyCustomerForm(),
    ...defaultValues,
  };
}

export function CustomerForm({
  defaultValues,
  onSubmit = createCustomer,
  onCancel,
  cancelLabel = 'Cancel',
  submitLabel = 'Save Customer',
}: {
  defaultValues?: Partial<CustomerFormData>;
  onSubmit?: (data: CustomerFormData) => Promise<{ error?: string } | void>;
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCompanyName, setUseCompanyName] = useState(false);

  const [form, setForm] = useState<CustomerFormData>(() =>
    mergeCustomerFormDefaults(defaultValues)
  );

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // 체크박스 활성 시 company_name → name 자동 동기화
      if (name === 'company_name' && useCompanyName) {
        next.name = value;
      }
      return next;
    });
    setError(null);
  }

  function handleUseCompanyName(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked;
    setUseCompanyName(checked);
    if (checked) {
      setForm((prev) => ({ ...prev, name: prev.company_name }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await onSubmit(form);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  const canSubmit = Boolean(form.name.trim());

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-28">
      {/* ── Contact Details ── */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary mb-3">
          Contact Details
        </h3>
        <div className="flex flex-col gap-4">

          {/* Full Name */}
          <div>
            <label htmlFor="name" className={LABEL_CLASS}>
              Full Name{REQUIRED}
            </label>
            {useCompanyName ? (
              <div className={FIELD_DISABLED_CLASS}>
                {form.company_name || <span className="text-pm-border">Auto-filled from company name</span>}
              </div>
            ) : (
              <input
                id="name"
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

          {/* Company Name + checkbox */}
          <div>
            <label htmlFor="company_name" className={LABEL_CLASS}>
              Company Name
              {OPTIONAL}
            </label>
            <input
              id="company_name"
              name="company_name"
              type="text"
              autoComplete="organization"
              placeholder="e.g. Smith Painting Co."
              value={form.company_name}
              onChange={handleChange}
              className={FIELD_CLASS}
            />
            {/* 체크박스: company name을 대표 이름으로 저장 */}
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

          {/* Email */}
          <div>
            <label htmlFor="email" className={LABEL_CLASS}>
              Email{OPTIONAL}
            </label>
            <input
              id="email"
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

          {/* Phone */}
          <div>
            <label htmlFor="phone" className={LABEL_CLASS}>
              Phone{OPTIONAL}
            </label>
            <input
              id="phone"
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

      {/* ── Address ── */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary mb-3">
          Address
        </h3>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="address_line1" className={LABEL_CLASS}>
              Street Address{OPTIONAL}
            </label>
            <input
              id="address_line1"
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
            <label htmlFor="address_line2" className={LABEL_CLASS}>
              Unit / Apt
              {OPTIONAL}
            </label>
            <input
              id="address_line2"
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
            <label htmlFor="city" className={LABEL_CLASS}>
              Suburb{OPTIONAL}
            </label>
            <input
              id="city"
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
              <label htmlFor="state" className={LABEL_CLASS}>
                State{OPTIONAL}
              </label>
              <select
                id="state"
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
              <label htmlFor="postcode" className={LABEL_CLASS}>
                Postcode{OPTIONAL}
              </label>
              <input
                id="postcode"
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

      {/* ── Notes ── */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary mb-3">
          Notes
        </h3>
        <div>
          <label htmlFor="notes" className={LABEL_CLASS}>
            Internal Notes
            <span className="ml-1.5 text-xs font-normal text-pm-secondary">
              (not shown to client)
            </span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="e.g. Prefers work before 9am, park in rear"
            value={form.notes}
            onChange={handleChange}
            className="w-full rounded-lg border border-pm-border bg-white px-4 py-3 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30 resize-none"
          />
        </div>
      </section>

      {/* ── 에러 메시지 ── */}
      {error && (
        <div className="rounded-lg bg-pm-coral-light border border-pm-coral px-4 py-3">
          <p className="text-sm text-pm-coral-dark">{error}</p>
        </div>
      )}

      {/* ── CTA — 하단 고정 ── */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-pm-border px-4 py-4">
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (onCancel) {
                onCancel();
                return;
              }
              router.back();
            }}
            disabled={loading}
            className="flex-1 h-14 rounded-xl border border-pm-border bg-white text-base font-medium text-pm-body active:bg-pm-surface disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="flex-[2] h-14 rounded-xl bg-pm-teal text-base font-semibold text-white active:bg-pm-teal-hover disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
