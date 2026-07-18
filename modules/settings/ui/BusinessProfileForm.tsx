'use client';
/* eslint-disable @next/next/no-img-element */

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useTransition } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { CheckCircle2, ImagePlus, Loader2, Upload } from 'lucide-react';
import { saveBusinessProfile } from '@/modules/settings/application/business-actions';
import {
  FormField,
  FormLabel,
  formControlClassName,
} from '@/components/forms/FormField';
import { FormSection } from '@/components/forms/FormSection';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { GoogleAddressAutocomplete } from '@/components/forms/GoogleAddressAutocomplete';
import { cn } from '@/lib/utils';
import { normalizeAbn } from '@/lib/abn-lookup';
import { useAbnLookup } from '@/hooks/useAbnLookup';
import type { BusinessFormValues } from '@/modules/settings/domain/businesses';
import {
  formatStreetAddressWithUnit,
  type ParsedGooglePlaceAddress,
} from '@/lib/google-places-address';
import {
  businessUpdateSchema,
  type BusinessUpdateInput,
} from '@/lib/supabase/validators';

const AU_STATES = [
  'ACT',
  'NSW',
  'NT',
  'QLD',
  'SA',
  'TAS',
  'VIC',
  'WA',
] as const;

function inputClass(hasError: boolean) {
  return cn(
    formControlClassName,
    'disabled:opacity-50',
    hasError && 'border-error'
  );
}

const errorClass = 'mt-1.5 text-xs text-error';

type FormInput = BusinessUpdateInput;

export default function BusinessProfileForm({
  defaultValues,
}: {
  defaultValues: BusinessFormValues;
}) {
  const [isPending, startTransition] = useTransition();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(
    defaultValues.logoPreviewUrl
  );
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

  function applyGoogleAddress(address: ParsedGooglePlaceAddress) {
    const streetAddress = formatStreetAddressWithUnit(address);

    if (streetAddress) {
      setValue('addressLine1', streetAddress, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (address.city) {
      setValue('city', address.city, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (address.state) {
      setValue('state', address.state, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (address.postcode) {
      setValue('postcode', address.postcode, {
        shouldDirty: true,
        shouldValidate: true,
      });
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

      setSuccessMessage(
        result.success ?? 'Business details saved successfully.'
      );
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
    <FormSection className="p-5 md:p-6">
      {errors.root?.message && (
        <ErrorAlert className="mb-5">{errors.root.message}</ErrorAlert>
      )}

      {successMessage && (
        <div
          role="status"
          className="border-primary-fixed bg-success-container text-primary/90 mb-5 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm"
        >
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span>{successMessage}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
        noValidate
        className="space-y-5"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            htmlFor="name"
            label="Business Name"
            error={errors.name?.message}
            type="text"
            autoComplete="organization"
            disabled={isPending}
            className={cn(
              'disabled:opacity-50',
              errors.name && 'border-error'
            )}
            {...register('name', { required: 'Business name is required' })}
          />

          <div>
            <FormField
              htmlFor="abn"
              label="ABN"
              error={errors.abn?.message}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="12 345 678 901"
              disabled={isPending}
              className={cn(
                'disabled:opacity-50',
                errors.abn && 'border-error'
              )}
              {...register('abn')}
            />
            <p
              className={`mt-1.5 text-xs ${
                abnLookup.status === 'error'
                  ? 'text-on-error-container'
                  : abnLookup.status === 'success'
                    ? 'text-primary/90'
                    : 'text-on-surface-variant'
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
          <legend className="text-on-surface mb-3 text-sm font-medium">
            Business Address
          </legend>

          <div className="space-y-3">
            <div>
              <Controller
                control={control}
                name="addressLine1"
                render={({ field }) => (
                  <GoogleAddressAutocomplete
                    id="addressLine1"
                    name={field.name}
                    autoComplete="street-address"
                    placeholder="Street address"
                    disabled={isPending}
                    value={field.value ?? ''}
                    onChange={(value) => {
                      field.onChange(value);
                      clearErrors('addressLine1');
                    }}
                    onBlur={field.onBlur}
                    onAddressSelected={applyGoogleAddress}
                    aria-invalid={!!errors.addressLine1}
                    className={inputClass(!!errors.addressLine1)}
                  />
                )}
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
                {errors.city && (
                  <p className={errorClass}>{errors.city.message}</p>
                )}
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
                {errors.postcode && (
                  <p className={errorClass}>{errors.postcode.message}</p>
                )}
              </div>
            </div>

            <div>
              <select
                id="state"
                disabled={isPending}
                className={`${inputClass(!!errors.state)} text-on-surface`}
                {...register('state')}
              >
                <option value="">Select state</option>
                {AU_STATES.map((stateOption) => (
                  <option key={stateOption} value={stateOption}>
                    {stateOption}
                  </option>
                ))}
              </select>
              {errors.state && (
                <p className={errorClass}>{errors.state.message}</p>
              )}
            </div>
          </div>
        </fieldset>

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            htmlFor="phone"
            label="Phone"
            error={errors.phone?.message}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            disabled={isPending}
            className={cn(
              'disabled:opacity-50',
              errors.phone && 'border-error'
            )}
            {...register('phone')}
          />

          <FormField
            htmlFor="email"
            label="Business Email"
            error={errors.email?.message}
            type="email"
            autoComplete="email"
            disabled={isPending}
            className={cn(
              'disabled:opacity-50',
              errors.email && 'border-error'
            )}
            {...register('email')}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            as="textarea"
            htmlFor="paymentTerms"
            label="Default Payment Terms"
            error={errors.paymentTerms?.message}
            rows={5}
            disabled={isPending}
            placeholder="Example: Payment due within 7 days from invoice date."
            className={cn(
              'min-h-[132px] disabled:opacity-50',
              errors.paymentTerms && 'border-error'
            )}
            {...register('paymentTerms')}
          />

          <div>
            <FormField
              as="textarea"
              htmlFor="bankDetails"
              label="Default Bank Details"
              error={errors.bankDetails?.message}
              rows={5}
              disabled={isPending}
              placeholder={
                'Example: Account Name: Coatly Pty Ltd\nBSB: 123-456\nAccount Number: 12345678'
              }
              className={cn(
                'min-h-[132px] disabled:opacity-50',
                errors.bankDetails && 'border-error'
              )}
              {...register('bankDetails')}
            />
            <p className="text-on-surface-variant mt-1.5 text-xs">
              These defaults are copied into new invoices and can still be
              edited per invoice.
            </p>
          </div>
        </div>

        <div className="border-outline bg-surface-container-low/60 rounded-2xl border border-dashed p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <FormLabel htmlFor="logo-upload">Business Logo</FormLabel>
              <p className="text-on-surface-variant text-sm">
                Upload a PNG or JPG logo. This will appear on your quote and
                invoice PDFs.
              </p>
            </div>

            <label
              htmlFor="logo-upload"
              className={`border-outline text-on-surface hover:bg-surface-container-low inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold transition-colors ${
                isPending || isUploadingLogo
                  ? 'pointer-events-none opacity-60'
                  : ''
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
            <div className="border-outline flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border bg-surface-container-lowest">
              {logoPreviewUrl ? (
                <img
                  src={logoPreviewUrl}
                  alt="Business logo preview"
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImagePlus
                  className="text-on-surface-variant h-8 w-8"
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-on-surface text-sm font-medium">
                {logoValue ? 'Logo ready to save' : 'No logo uploaded yet'}
              </p>
              <p className="text-on-surface-variant text-xs">
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
                  className="text-primary hover:text-primary/90 inline-flex min-h-11 items-center text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>

          {(errors.logo_url?.message || logoUploadError) && (
            <p className={errorClass}>
              {errors.logo_url?.message ?? logoUploadError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending || isUploadingLogo}
          className="bg-primary hover:bg-primary/90 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-on-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
        >
          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          Save Business Details
        </button>
      </form>
    </FormSection>
  );
}
