'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCustomer,
  type CustomerFormData,
  type CustomerProperty,
} from '@/app/actions/customers';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

const FIELD_CLASS =
  'w-full rounded-lg border border-pm-border bg-white px-4 py-3 text-base text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30 h-12';

const FIELD_DISABLED_CLASS =
  'w-full rounded-lg border border-pm-border bg-pm-surface px-4 py-3 text-base text-pm-secondary h-12 cursor-not-allowed';

const LABEL_CLASS = 'block text-sm font-medium text-pm-body mb-1';

const REQUIRED = <span className="ml-0.5 text-pm-coral">*</span>;
const OPTIONAL = <span className="ml-1.5 text-xs font-normal text-pm-secondary">(optional)</span>;

function createEmptyProperty(index = 0): CustomerProperty {
  return {
    label: index === 0 ? 'Primary property' : `Property ${index + 1}`,
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postcode: '',
    notes: '',
  };
}

function createEmptyCustomerForm(): CustomerFormData {
  return {
    name: '',
    email: '',
    phone: '',
    emails: [''],
    phones: [''],
    company_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postcode: '',
    properties: [createEmptyProperty()],
    billing_same_as_site: true,
    billing_address_line1: '',
    billing_address_line2: '',
    billing_city: '',
    billing_state: '',
    billing_postcode: '',
    notes: '',
  };
}

function mergeCustomerFormDefaults(
  defaultValues?: Partial<CustomerFormData>
): CustomerFormData {
  const merged = {
    ...createEmptyCustomerForm(),
    ...defaultValues,
  };
  const emails = defaultValues?.emails?.length
    ? defaultValues.emails
    : defaultValues?.email
      ? [defaultValues.email]
      : [''];
  const phones = defaultValues?.phones?.length
    ? defaultValues.phones
    : defaultValues?.phone
      ? [defaultValues.phone]
      : [''];
  const properties = defaultValues?.properties?.length
    ? defaultValues.properties
    : [
        {
          label: 'Primary property',
          address_line1: defaultValues?.address_line1 ?? '',
          address_line2: defaultValues?.address_line2 ?? '',
          city: defaultValues?.city ?? '',
          state: defaultValues?.state ?? '',
          postcode: defaultValues?.postcode ?? '',
          notes: '',
        },
      ];

  return {
    ...merged,
    email: emails[0] ?? '',
    phone: phones[0] ?? '',
    emails,
    phones,
    address_line1: properties[0]?.address_line1 ?? '',
    address_line2: properties[0]?.address_line2 ?? '',
    city: properties[0]?.city ?? '',
    state: properties[0]?.state ?? '',
    postcode: properties[0]?.postcode ?? '',
    properties,
    billing_same_as_site: defaultValues?.billing_same_as_site ?? true,
    billing_address_line1: defaultValues?.billing_address_line1 ?? '',
    billing_address_line2: defaultValues?.billing_address_line2 ?? '',
    billing_city: defaultValues?.billing_city ?? '',
    billing_state: defaultValues?.billing_state ?? '',
    billing_postcode: defaultValues?.billing_postcode ?? '',
  };
}

function isNextNavigationSignal(error: unknown) {
  if (!error || typeof error !== 'object' || !('digest' in error)) {
    return false;
  }

  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND'))
  );
}

export function CustomerForm({
  defaultValues,
  onSubmit = createCustomer,
  onSuccess,
  onCancel,
  cancelLabel = 'Cancel',
  submitLabel = 'Save Customer',
}: {
  defaultValues?: Partial<CustomerFormData>;
  onSubmit?: (data: CustomerFormData) => Promise<{ error?: string } | void>;
  onSuccess?: () => void;
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

  function updateEmail(index: number, value: string) {
    setForm((prev) => {
      const emails = [...prev.emails];
      emails[index] = value;
      return { ...prev, email: emails[0] ?? '', emails };
    });
    setError(null);
  }

  function addEmail() {
    setForm((prev) => ({ ...prev, emails: [...prev.emails, ''] }));
  }

  function removeEmail(index: number) {
    setForm((prev) => {
      const emails = prev.emails.filter((_, i) => i !== index);
      const nextEmails = emails.length ? emails : [''];
      return { ...prev, email: nextEmails[0] ?? '', emails: nextEmails };
    });
  }

  function updatePhone(index: number, value: string) {
    setForm((prev) => {
      const phones = [...prev.phones];
      phones[index] = value;
      return { ...prev, phone: phones[0] ?? '', phones };
    });
    setError(null);
  }

  function addPhone() {
    setForm((prev) => ({ ...prev, phones: [...prev.phones, ''] }));
  }

  function removePhone(index: number) {
    setForm((prev) => {
      const phones = prev.phones.filter((_, i) => i !== index);
      const nextPhones = phones.length ? phones : [''];
      return { ...prev, phone: nextPhones[0] ?? '', phones: nextPhones };
    });
  }

  function updateProperty(index: number, field: keyof CustomerProperty, value: string) {
    setForm((prev) => {
      const properties = [...prev.properties];
      properties[index] = { ...(properties[index] ?? createEmptyProperty(index)), [field]: value };
      return {
        ...prev,
        properties,
        address_line1: properties[0]?.address_line1 ?? '',
        address_line2: properties[0]?.address_line2 ?? '',
        city: properties[0]?.city ?? '',
        state: properties[0]?.state ?? '',
        postcode: properties[0]?.postcode ?? '',
      };
    });
    setError(null);
  }

  function addProperty() {
    setForm((prev) => ({
      ...prev,
      properties: [...prev.properties, createEmptyProperty(prev.properties.length)],
    }));
  }

  function removeProperty(index: number) {
    setForm((prev) => {
      const properties = prev.properties.filter((_, i) => i !== index);
      const nextProperties = properties.length ? properties : [createEmptyProperty()];
      return {
        ...prev,
        properties: nextProperties,
        address_line1: nextProperties[0]?.address_line1 ?? '',
        address_line2: nextProperties[0]?.address_line2 ?? '',
        city: nextProperties[0]?.city ?? '',
        state: nextProperties[0]?.state ?? '',
        postcode: nextProperties[0]?.postcode ?? '',
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await onSubmit(form);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setLoading(false);
      onSuccess?.();
    } catch (submitError) {
      if (isNextNavigationSignal(submitError)) {
        throw submitError;
      }

      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Customer could not be saved. Please try again.'
      );
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

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className={LABEL_CLASS}>
                Emails{OPTIONAL}
              </label>
              <button
                type="button"
                onClick={addEmail}
                className="min-h-11 rounded-lg border border-pm-border bg-white px-3 text-sm font-medium text-pm-body"
              >
                Add Email
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {form.emails.map((email, index) => (
                <div key={index} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    autoComplete={index === 0 ? 'email' : 'off'}
                    inputMode="email"
                    placeholder={index === 0 ? 'Primary email' : 'Additional email'}
                    value={email}
                    onChange={(event) => updateEmail(index, event.target.value)}
                    className={`${FIELD_CLASS} min-w-0 flex-1`}
                  />
                  {form.emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(index)}
                      className="min-h-12 shrink-0 rounded-lg border border-pm-border bg-white px-3 text-sm font-medium text-pm-secondary"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className={LABEL_CLASS}>
                Phone Numbers{OPTIONAL}
              </label>
              <button
                type="button"
                onClick={addPhone}
                className="min-h-11 rounded-lg border border-pm-border bg-white px-3 text-sm font-medium text-pm-body"
              >
                Add Phone
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {form.phones.map((phone, index) => (
                <div key={index} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="tel"
                    autoComplete={index === 0 ? 'tel' : 'off'}
                    inputMode="tel"
                    placeholder={index === 0 ? 'Primary phone' : 'Additional phone'}
                    value={phone}
                    onChange={(event) => updatePhone(index, event.target.value)}
                    className={`${FIELD_CLASS} min-w-0 flex-1`}
                  />
                  {form.phones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePhone(index)}
                      className="min-h-12 shrink-0 rounded-lg border border-pm-border bg-white px-3 text-sm font-medium text-pm-secondary"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary">
            Site Address
          </h3>
          <button
            type="button"
            onClick={addProperty}
            className="min-h-11 rounded-lg border border-pm-border bg-white px-3 text-sm font-medium text-pm-body"
          >
            Add Site
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {form.properties.map((property, index) => (
            <div key={index} className="rounded-xl border border-pm-border bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-pm-secondary">
                  {index === 0 ? 'Primary Site' : `Site ${index + 1}`}
                </p>
                {form.properties.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProperty(index)}
                    className="min-h-10 rounded-lg border border-pm-border bg-white px-3 text-sm font-medium text-pm-secondary"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className={LABEL_CLASS}>Property Label{OPTIONAL}</label>
                  <input
                    type="text"
                    placeholder="e.g. Home, Rental, Beach house"
                    value={property.label}
                    onChange={(event) => updateProperty(index, 'label', event.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Street Address{OPTIONAL}</label>
                  <input
                    type="text"
                    autoComplete={index === 0 ? 'address-line1' : 'off'}
                    placeholder="e.g. 12 Harbor St"
                    value={property.address_line1}
                    onChange={(event) => updateProperty(index, 'address_line1', event.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Unit / Apt{OPTIONAL}</label>
                  <input
                    type="text"
                    autoComplete={index === 0 ? 'address-line2' : 'off'}
                    placeholder="e.g. Unit 3"
                    value={property.address_line2}
                    onChange={(event) => updateProperty(index, 'address_line2', event.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Suburb{OPTIONAL}</label>
                  <input
                    type="text"
                    autoComplete={index === 0 ? 'address-level2' : 'off'}
                    placeholder="e.g. Manly"
                    value={property.city}
                    onChange={(event) => updateProperty(index, 'city', event.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLASS}>State{OPTIONAL}</label>
                    <select
                      value={property.state}
                      onChange={(event) => updateProperty(index, 'state', event.target.value)}
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
                    <label className={LABEL_CLASS}>Postcode{OPTIONAL}</label>
                    <input
                      type="text"
                      autoComplete={index === 0 ? 'postal-code' : 'off'}
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="e.g. 2095"
                      value={property.postcode}
                      onChange={(event) => updateProperty(index, 'postcode', event.target.value)}
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Property Notes{OPTIONAL}</label>
                  <input
                    type="text"
                    placeholder="e.g. Gate code, parking notes"
                    value={property.notes}
                    onChange={(event) => updateProperty(index, 'notes', event.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Billing Address ── */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-pm-secondary mb-3">
          Billing Address
        </h3>
        <div className="rounded-xl border border-pm-border bg-white p-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.billing_same_as_site}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, billing_same_as_site: e.target.checked }))
              }
              className="w-5 h-5 rounded border-pm-border text-pm-teal focus:ring-pm-teal-mid cursor-pointer"
            />
            <span className="text-sm text-pm-body font-medium">Same as site address</span>
          </label>

          {!form.billing_same_as_site && (
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label className={LABEL_CLASS}>Street Address{OPTIONAL}</label>
                <input
                  type="text"
                  autoComplete="billing address-line1"
                  placeholder="e.g. 12 Harbor St"
                  value={form.billing_address_line1}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, billing_address_line1: e.target.value }))
                  }
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Unit / Apt{OPTIONAL}</label>
                <input
                  type="text"
                  autoComplete="billing address-line2"
                  placeholder="e.g. Suite 1"
                  value={form.billing_address_line2}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, billing_address_line2: e.target.value }))
                  }
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Suburb{OPTIONAL}</label>
                <input
                  type="text"
                  autoComplete="billing address-level2"
                  placeholder="e.g. Manly"
                  value={form.billing_city}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, billing_city: e.target.value }))
                  }
                  className={FIELD_CLASS}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLASS}>State{OPTIONAL}</label>
                  <select
                    value={form.billing_state}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, billing_state: e.target.value }))
                    }
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
                  <label className={LABEL_CLASS}>Postcode{OPTIONAL}</label>
                  <input
                    type="text"
                    autoComplete="billing postal-code"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="e.g. 2095"
                    value={form.billing_postcode}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, billing_postcode: e.target.value }))
                    }
                    className={FIELD_CLASS}
                  />
                </div>
              </div>
            </div>
          )}
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
            className="flex-2 h-14 rounded-xl bg-pm-teal text-base font-semibold text-white active:bg-pm-teal-hover disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
