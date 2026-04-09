'use client';
/* eslint-disable @next/next/no-img-element */

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { CheckCircle2, ImagePlus, Loader2, Upload } from 'lucide-react';
import { saveBusinessProfile } from '@/app/actions/business';
import { normalizeAbn } from '@/lib/abn-lookup';
import { useAbnLookup } from '@/hooks/useAbnLookup';
import type { BusinessFormValues } from '@/lib/businesses';
import { businessUpdateSchema, type BusinessUpdateInput } from '@/lib/supabase/validators';

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] as const;

const inputBase =
  'w-full rounded-xl border border-pm-border bg-white px-4 text-sm text-pm-body transition-colors focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30 disabled:opacity-50';

function inputClass(hasError: boolean, extra = 'h-12') {
  return `${inputBase} ${extra} ${hasError ? 'border-pm-coral' : ''}`;
}

const labelClass = 'mb-1.5 block text-sm font-medium text-pm-body';
const errorClass = 'mt-1.5 text-xs text-pm-coral';

type FormInput = BusinessUpdateInput;

export default function BusinessProfileForm({
  defaultValues,
}: {
  defaultValues: BusinessFormValues;
}) {
  const [isPending, startTransition] = useTransition();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(defaultValues.logoPreviewUrl);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    setError,
    control,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(businessUpdateSchema),
    defaultValues: {
      name: defaultValues.name,
      abn: defaultValues.abn,
      addressLine1: defaultValues.addressLine1,
      city: defaultValues.city,
      state: defaultValues.state,
      postcode: defaultValues.postcode,
      phone: defaultValues.phone,
      email: defaultValues.email,
      paymentTerms: defaultValues.paymentTerms,
      bankDetails: defaultValues.bankDetails,
      logo_url: defaultValues.logoUrl,
    },
  });
  const abnValue = useWatch({ control, name: 'abn' }) ?? '';
  const logoValue = useWatch({ control, name: 'logo_url' }) ?? '';
  const abnLookup = useAbnLookup(abnValue);

  useEffect(() => {
    if (abnLookup.status !== 'success') return;

    const { data } = abnLookup;
    setValue('name', data.businessName, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (data.addressLine1) {
      setValue('addressLine1', data.addressLine1, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    if (data.suburb) {
      setValue('city', data.suburb, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    if (data.state) {
      setValue('state', data.state, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    if (data.postcode) {
      setValue('postcode', data.postcode, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [abnLookup, setValue]);

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoUploadError(null);
    setSuccessMessage(null);
    clearErrors('root');
    setIsUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/business-logo', {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json()) as {
        path?: string;
        signedUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.path || !payload.signedUrl) {
        setLogoUploadError(payload.error ?? 'Logo upload failed.');
        return;
      }

      setValue('logo_url', payload.path, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setLogoPreviewUrl(payload.signedUrl);
    } catch (error) {
      setLogoUploadError(
        error instanceof Error ? error.message : 'Logo upload failed.'
      );
    } finally {
      event.target.value = '';
      setIsUploadingLogo(false);
    }
  }

  function onSubmit(data: FormInput) {
    setSuccessMessage(null);
    clearErrors('root');

    startTransition(async () => {
      const result = await saveBusinessProfile(data);

      if (result.error) {
        setError('root', { message: result.error });
        return;
      }

      setSuccessMessage(result.success ?? 'Business details saved successfully.');
    });
  }

  function onInvalidSubmit() {
    setSuccessMessage(null);
    setError('root', {
      type: 'manual',
      message: 'Please fix the highlighted format issues before saving.',
    });
  }

  return (
    <div className="rounded-3xl border border-pm-border bg-white p-5 md:p-6">
      {errors.root?.message && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-pm-coral bg-pm-coral-light px-4 py-3 text-sm text-pm-coral-dark"
        >
          {errors.root.message}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mb-5 flex items-start gap-2 rounded-xl border border-pm-teal-pale bg-pm-teal-light px-4 py-3 text-sm text-pm-teal-hover"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)} noValidate className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="name" className={labelClass}>
              Business Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="organization"
              disabled={isPending}
              className={inputClass(!!errors.name)}
              {...register('name', { required: 'Business name is required' })}
            />
            {errors.name && <p className={errorClass}>{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="abn" className={labelClass}>
              ABN
            </label>
            <input
              id="abn"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="12 345 678 901"
              disabled={isPending}
              className={inputClass(!!errors.abn)}
              {...register('abn')}
            />
            {errors.abn && <p className={errorClass}>{errors.abn.message}</p>}
            <p
              className={`mt-1.5 text-xs ${
                abnLookup.status === 'error'
                  ? 'text-pm-coral-dark'
                  : abnLookup.status === 'success'
                    ? 'text-pm-teal-hover'
                    : 'text-pm-secondary'
              }`}
            >
              {abnLookup.status === 'loading' && 'Looking up ABN details...'}
              {abnLookup.status === 'success' &&
                `${abnLookup.data.businessName} loaded into your business profile.`}
              {abnLookup.status === 'error' && abnLookup.error}
              {abnLookup.status === 'idle' &&
                (normalizeAbn(abnValue).length === 11
                  ? 'ABN looks valid. Details will load shortly.'
                  : 'Enter all 11 ABN digits to auto-fill business name and address.')}
            </p>
          </div>
        </div>

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-pm-body">Business Address</legend>

          <div className="space-y-3">
            <div>
              <input
                id="addressLine1"
                type="text"
                autoComplete="street-address"
                placeholder="Street address"
                disabled={isPending}
                className={inputClass(!!errors.addressLine1)}
                {...register('addressLine1')}
              />
              {errors.addressLine1 && (
                <p className={errorClass}>{errors.addressLine1.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  id="city"
                  type="text"
                  autoComplete="address-level2"
                  placeholder="Suburb"
                  disabled={isPending}
                  className={inputClass(!!errors.city)}
                  {...register('city')}
                />
                {errors.city && <p className={errorClass}>{errors.city.message}</p>}
              </div>

              <div>
                <input
                  id="postcode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="Postcode"
                  maxLength={4}
                  disabled={isPending}
                  className={inputClass(!!errors.postcode)}
                  {...register('postcode')}
                />
                {errors.postcode && <p className={errorClass}>{errors.postcode.message}</p>}
              </div>
            </div>

            <div>
              <select
                id="state"
                disabled={isPending}
                className={`${inputClass(!!errors.state)} text-pm-body`}
                {...register('state')}
              >
                <option value="">Select state</option>
                {AU_STATES.map((stateOption) => (
                  <option key={stateOption} value={stateOption}>
                    {stateOption}
                  </option>
                ))}
              </select>
              {errors.state && <p className={errorClass}>{errors.state.message}</p>}
            </div>
          </div>
        </fieldset>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              disabled={isPending}
              className={inputClass(!!errors.phone)}
              {...register('phone')}
            />
            {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              Business Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              disabled={isPending}
              className={inputClass(!!errors.email)}
              {...register('email')}
            />
            {errors.email && <p className={errorClass}>{errors.email.message}</p>}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="paymentTerms" className={labelClass}>
              Default Payment Terms
            </label>
            <textarea
              id="paymentTerms"
              rows={5}
              disabled={isPending}
              placeholder="Example: Payment due within 7 days from invoice date."
              className={inputClass(!!errors.paymentTerms, 'min-h-[132px] py-3')}
              {...register('paymentTerms')}
            />
            {errors.paymentTerms && (
              <p className={errorClass}>{errors.paymentTerms.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="bankDetails" className={labelClass}>
              Default Bank Details
            </label>
            <textarea
              id="bankDetails"
              rows={5}
              disabled={isPending}
              placeholder={'Example: Account Name: Coatly Pty Ltd\nBSB: 123-456\nAccount Number: 12345678'}
              className={inputClass(!!errors.bankDetails, 'min-h-[132px] py-3')}
              {...register('bankDetails')}
            />
            {errors.bankDetails && (
              <p className={errorClass}>{errors.bankDetails.message}</p>
            )}
            <p className="mt-1.5 text-xs text-pm-secondary">
              These defaults are copied into new invoices and can still be edited per invoice.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-pm-border bg-pm-surface/60 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <label htmlFor="logo-upload" className={labelClass}>
                Business Logo
              </label>
              <p className="text-sm text-pm-secondary">
                Upload a PNG or JPG logo. This will appear on your quote and invoice PDFs.
              </p>
            </div>

            <label
              htmlFor="logo-upload"
              className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-pm-border bg-white px-4 py-2.5 text-sm font-semibold text-pm-body transition-colors hover:bg-pm-surface ${
                isPending || isUploadingLogo ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              {isUploadingLogo ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="h-4 w-4" aria-hidden="true" />
              )}
              {isUploadingLogo ? 'Uploading...' : 'Upload logo'}
            </label>
          </div>

          <input
            id="logo-upload"
            type="file"
            accept="image/png,image/jpeg"
            disabled={isPending || isUploadingLogo}
            className="sr-only"
            onChange={handleLogoChange}
          />

          <input type="hidden" {...register('logo_url')} />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-pm-border bg-white">
              {logoPreviewUrl ? (
                <img
                  src={logoPreviewUrl}
                  alt="Business logo preview"
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImagePlus className="h-8 w-8 text-pm-secondary" aria-hidden="true" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-pm-body">
                {logoValue ? 'Logo ready to save' : 'No logo uploaded yet'}
              </p>
              <p className="text-xs text-pm-secondary">
                {logoValue
                  ? 'Save business details to apply this logo across your documents.'
                  : 'Best results come from a square or wide image with a transparent background.'}
              </p>
              {logoValue && (
                <button
                  type="button"
                  disabled={isPending || isUploadingLogo}
                  onClick={() => {
                    setLogoPreviewUrl('');
                    setValue('logo_url', '', {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  className="text-xs font-semibold text-pm-teal transition-colors hover:text-pm-teal-hover"
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>

          {(errors.logo_url?.message || logoUploadError) && (
            <p className={errorClass}>{errors.logo_url?.message ?? logoUploadError}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending || isUploadingLogo}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-pm-teal px-4 text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover focus:outline-none focus:ring-2 focus:ring-pm-teal-mid focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Save Business Details
        </button>
      </form>
    </div>
  );
}
