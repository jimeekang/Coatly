'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCustomer,
  type CustomerFormData,
  type CustomerProperty,
} from '@/modules/customers/application/actions';
import {
  FormField,
  FormOptionalIndicator,
  FormRequiredIndicator,
  formControlClassName,
  formDisabledControlClassName,
  formLabelClassName,
} from '@/components/forms/FormField';
import { FormFooter, FormFooterButton } from '@/components/forms/FormFooter';
import { FormSection } from '@/components/forms/FormSection';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { GoogleAddressAutocomplete } from '@/components/forms/GoogleAddressAutocomplete';
import type { ParsedGooglePlaceAddress } from '@/lib/google-places-address';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

const REQUIRED = <FormRequiredIndicator />;
const OPTIONAL = <FormOptionalIndicator />;

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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
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

  function updateProperty(
    index: number,
    field: keyof CustomerProperty,
    value: string
  ) {
    setForm((prev) => {
      const properties = [...prev.properties];
      properties[index] = {
        ...(properties[index] ?? createEmptyProperty(index)),
        [field]: value,
      };
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

  function updatePropertyAddress(
    index: number,
    address: ParsedGooglePlaceAddress
  ) {
    setForm((prev) => {
      const properties = [...prev.properties];
      const currentProperty = properties[index] ?? createEmptyProperty(index);
      const nextProperty = {
        ...currentProperty,
        address_line1: address.addressLine1 || currentProperty.address_line1,
        address_line2: address.addressLine2 || currentProperty.address_line2,
        city: address.city || currentProperty.city,
        state: address.state || currentProperty.state,
        postcode: address.postcode || currentProperty.postcode,
      };
      properties[index] = nextProperty;

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

  function updateBillingAddress(address: ParsedGooglePlaceAddress) {
    setForm((prev) => ({
      ...prev,
      billing_address_line1: address.addressLine1 || prev.billing_address_line1,
      billing_address_line2: address.addressLine2 || prev.billing_address_line2,
      billing_city: address.city || prev.billing_city,
      billing_state: address.state || prev.billing_state,
      billing_postcode: address.postcode || prev.billing_postcode,
    }));
    setError(null);
  }

  function addProperty() {
    setForm((prev) => ({
      ...prev,
      properties: [
        ...prev.properties,
        createEmptyProperty(prev.properties.length),
      ],
    }));
  }

  function removeProperty(index: number) {
    setForm((prev) => {
      const properties = prev.properties.filter((_, i) => i !== index);
      const nextProperties = properties.length
        ? properties
        : [createEmptyProperty()];
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-32">
      {/* ── Contact Details ── */}
      <FormSection title="Contact Details">
        <div className="flex flex-col gap-4">
          {/* Full Name */}
          <div>
            <label htmlFor="name" className={formLabelClassName}>
              Full Name{REQUIRED}
            </label>
            {useCompanyName ? (
              <div className={formDisabledControlClassName}>
                {form.company_name || (
                  <span className="text-on-surface-variant">
                    Auto-filled from company name
                  </span>
                )}
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
                className={formControlClassName}
              />
            )}
          </div>

          {/* Company Name + checkbox */}
          <div>
            <FormField
              htmlFor="company_name"
              label="Company Name"
              optional
              name="company_name"
              type="text"
              autoComplete="organization"
              placeholder="e.g. Smith Painting Co."
              value={form.company_name}
              onChange={handleChange}
            />
            {/* 체크박스: company name을 대표 이름으로 저장 */}
            <label className="mt-2 flex cursor-pointer items-center gap-2.5 select-none">
              <input
                type="checkbox"
                checked={useCompanyName}
                onChange={handleUseCompanyName}
                className="border-outline-variant text-primary focus:ring-primary/20 h-5 w-5 cursor-pointer rounded"
              />
              <span className="text-on-surface-variant text-sm">
                Save using company name as the display name
              </span>
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className={formLabelClassName}>Emails{OPTIONAL}</label>
              <button
                type="button"
                onClick={addEmail}
                className="border-outline-variant text-on-surface bg-surface-container-lowest hover:bg-surface-container-low focus-visible:ring-primary/40 min-h-11 rounded-xl border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2"
              >
                + New Email
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {form.emails.map((email, index) => (
                <div key={index} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    autoComplete={index === 0 ? 'email' : 'off'}
                    inputMode="email"
                    placeholder={
                      index === 0 ? 'Primary email' : 'Additional email'
                    }
                    value={email}
                    onChange={(event) => updateEmail(index, event.target.value)}
                    className={`${formControlClassName} min-w-0 flex-1`}
                  />
                  {form.emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmail(index)}
                      className="border-outline-variant text-on-surface-variant bg-surface-container-lowest hover:bg-surface-container-low focus-visible:ring-primary/40 min-h-12 shrink-0 rounded-xl border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2"
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
              <label className={formLabelClassName}>Phone Numbers{OPTIONAL}</label>
              <button
                type="button"
                onClick={addPhone}
                className="border-outline-variant text-on-surface bg-surface-container-lowest hover:bg-surface-container-low focus-visible:ring-primary/40 min-h-11 rounded-xl border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2"
              >
                + New Phone
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {form.phones.map((phone, index) => (
                <div key={index} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="tel"
                    autoComplete={index === 0 ? 'tel' : 'off'}
                    inputMode="tel"
                    placeholder={
                      index === 0 ? 'Primary phone' : 'Additional phone'
                    }
                    value={phone}
                    onChange={(event) => updatePhone(index, event.target.value)}
                    className={`${formControlClassName} min-w-0 flex-1`}
                  />
                  {form.phones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePhone(index)}
                      className="border-outline-variant text-on-surface-variant bg-surface-container-lowest hover:bg-surface-container-low focus-visible:ring-primary/40 min-h-12 shrink-0 rounded-xl border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-on-surface-variant text-sm font-semibold tracking-wide uppercase">
            Site Address
          </h3>
          <button
            type="button"
            onClick={addProperty}
            className="border-outline-variant text-on-surface bg-surface-container-lowest hover:bg-surface-container-low focus-visible:ring-primary/40 min-h-11 rounded-xl border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2"
          >
            + New Site
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {form.properties.map((property, index) => (
            <div
              key={index}
              className="border-outline-variant bg-surface-container-lowest rounded-xl border p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
                  {index === 0 ? 'Primary Site' : `Site ${index + 1}`}
                </p>
                {form.properties.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProperty(index)}
                    className="border-outline-variant text-on-surface-variant bg-surface-container-lowest hover:bg-surface-container-low focus-visible:ring-primary/40 min-h-11 rounded-xl border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className={formLabelClassName}>
                    Property Label{OPTIONAL}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Home, Rental, Beach house"
                    value={property.label}
                    onChange={(event) =>
                      updateProperty(index, 'label', event.target.value)
                    }
                    className={formControlClassName}
                  />
                </div>
                <div>
                  <label className={formLabelClassName}>
                    Street Address{OPTIONAL}
                  </label>
                  <GoogleAddressAutocomplete
                    autoComplete={index === 0 ? 'address-line1' : 'off'}
                    placeholder="e.g. 12 Harbor St"
                    value={property.address_line1}
                    onChange={(value) =>
                      updateProperty(index, 'address_line1', value)
                    }
                    onAddressSelected={(address) =>
                      updatePropertyAddress(index, address)
                    }
                    className={formControlClassName}
                  />
                </div>
                <div>
                  <label className={formLabelClassName}>Unit / Apt{OPTIONAL}</label>
                  <input
                    type="text"
                    autoComplete={index === 0 ? 'address-line2' : 'off'}
                    placeholder="e.g. Unit 3"
                    value={property.address_line2}
                    onChange={(event) =>
                      updateProperty(index, 'address_line2', event.target.value)
                    }
                    className={formControlClassName}
                  />
                </div>
                <div>
                  <label className={formLabelClassName}>Suburb{OPTIONAL}</label>
                  <input
                    type="text"
                    autoComplete={index === 0 ? 'address-level2' : 'off'}
                    placeholder="e.g. Manly"
                    value={property.city}
                    onChange={(event) =>
                      updateProperty(index, 'city', event.target.value)
                    }
                    className={formControlClassName}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={formLabelClassName}>State{OPTIONAL}</label>
                    <select
                      value={property.state}
                      onChange={(event) =>
                        updateProperty(index, 'state', event.target.value)
                      }
                      className={formControlClassName}
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
                    <label className={formLabelClassName}>Postcode{OPTIONAL}</label>
                    <input
                      type="text"
                      autoComplete={index === 0 ? 'postal-code' : 'off'}
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="e.g. 2095"
                      value={property.postcode}
                      onChange={(event) =>
                        updateProperty(index, 'postcode', event.target.value)
                      }
                      className={formControlClassName}
                    />
                  </div>
                </div>
                <div>
                  <label className={formLabelClassName}>
                    Property Notes{OPTIONAL}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gate code, parking notes"
                    value={property.notes}
                    onChange={(event) =>
                      updateProperty(index, 'notes', event.target.value)
                    }
                    className={formControlClassName}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      {/* ── Billing Address ── */}
      <FormSection title="Billing Address">
        <div className="border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <label className="flex cursor-pointer items-center gap-3 select-none">
            <input
              type="checkbox"
              checked={form.billing_same_as_site}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  billing_same_as_site: e.target.checked,
                }))
              }
              className="border-outline-variant text-primary focus:ring-primary/20 h-5 w-5 cursor-pointer rounded"
            />
            <span className="text-on-surface text-sm font-medium">
              Same as site address
            </span>
          </label>

          {!form.billing_same_as_site && (
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label className={formLabelClassName}>Street Address{OPTIONAL}</label>
                <GoogleAddressAutocomplete
                  autoComplete="billing address-line1"
                  placeholder="e.g. 12 Harbor St"
                  value={form.billing_address_line1}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      billing_address_line1: value,
                    }))
                  }
                  onAddressSelected={updateBillingAddress}
                  className={formControlClassName}
                />
              </div>
              <div>
                <label className={formLabelClassName}>Unit / Apt{OPTIONAL}</label>
                <input
                  type="text"
                  autoComplete="billing address-line2"
                  placeholder="e.g. Suite 1"
                  value={form.billing_address_line2}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      billing_address_line2: e.target.value,
                    }))
                  }
                  className={formControlClassName}
                />
              </div>
              <div>
                <label className={formLabelClassName}>Suburb{OPTIONAL}</label>
                <input
                  type="text"
                  autoComplete="billing address-level2"
                  placeholder="e.g. Manly"
                  value={form.billing_city}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      billing_city: e.target.value,
                    }))
                  }
                  className={formControlClassName}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={formLabelClassName}>State{OPTIONAL}</label>
                  <select
                    value={form.billing_state}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        billing_state: e.target.value,
                      }))
                    }
                    className={formControlClassName}
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
                  <label className={formLabelClassName}>Postcode{OPTIONAL}</label>
                  <input
                    type="text"
                    autoComplete="billing postal-code"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="e.g. 2095"
                    value={form.billing_postcode}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        billing_postcode: e.target.value,
                      }))
                    }
                    className={formControlClassName}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </FormSection>

      {/* ── Notes ── */}
      <FormSection title="Notes">
        <FormField
          as="textarea"
          htmlFor="notes"
          label="Internal Notes"
          name="notes"
          rows={3}
          placeholder="e.g. Prefers work before 9am, park in rear"
          value={form.notes}
          onChange={handleChange}
          className="resize-none"
        />
      </FormSection>

      {/* ── 에러 메시지 ── */}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {/* ── CTA — 하단 고정 ── */}
      <FormFooter>
          <FormFooterButton
            type="button"
            variant="secondary"
            onClick={() => {
              if (onCancel) {
                onCancel();
                return;
              }
              router.back();
            }}
            disabled={loading}
            className="flex-1 font-medium"
          >
            {cancelLabel}
          </FormFooterButton>
          <FormFooterButton
            type="submit"
            disabled={loading || !canSubmit}
            className="flex-[2]"
          >
            {loading ? 'Saving…' : submitLabel}
          </FormFooterButton>
      </FormFooter>
    </form>
  );
}
