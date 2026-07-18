'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Sparkles } from 'lucide-react';
import { GoogleAddressAutocomplete } from '@/components/forms/GoogleAddressAutocomplete';
import { normalizeAbn } from '@/lib/abn-lookup';
import { useAbnLookup } from '@/hooks/useAbnLookup';
import {
  formatStreetAddressWithUnit,
  type ParsedGooglePlaceAddress,
} from '@/lib/google-places-address';
import { ErrorAlert } from '@/components/shared/ErrorAlert';

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

const schema = z.object({
  businessName: z.string().trim().min(1, 'Business name is required'),
  abn: z
    .string()
    .min(1, 'ABN is required')
    .transform((v) => v.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{11}$/, 'ABN must be 11 digits')),
  phone: z.string().trim(),
  addressLine1: z.string().trim(),
  city: z.string().trim(),
  state: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' || AU_STATES.includes(value as (typeof AU_STATES)[number]),
      'Select a valid Australian state'
    ),
  postcode: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^\d{4}$/.test(value),
      'Postcode must be 4 digits'
    ),
  createExampleData: z.boolean(),
});

type FormInput = z.infer<typeof schema>;

const inputBase =
  'h-12 w-full rounded-xl border bg-surface-container-lowest px-4 text-base text-on-surface transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50';

function inputClass(hasError: boolean) {
  return `${inputBase} ${hasError ? 'border-error' : 'border-outline-variant'}`;
}

const labelClass = 'block text-sm font-medium text-on-surface mb-1.5';
const errorClass = 'mt-1.5 text-sm text-error';

type CompleteOnboarding = (data: {
  businessName: string;
  abn: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  postcode: string;
  createExampleData: boolean;
}) => Promise<{ error: string } | void>;

interface Props {
  defaultValues: {
    businessName: string;
    abn: string;
    phone: string;
    addressLine1: string;
    city: string;
    state: string;
    postcode: string;
  };
  completeOnboarding: CompleteOnboarding;
}

export default function OnboardingForm({
  defaultValues,
  completeOnboarding,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [optionalDetailsOpen, setOptionalDetailsOpen] = useState(() =>
    Boolean(
      defaultValues.phone.trim() ||
      defaultValues.addressLine1.trim() ||
      defaultValues.city.trim() ||
      defaultValues.state.trim() ||
      defaultValues.postcode.trim()
    )
  );

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...defaultValues,
      createExampleData: false,
    },
  });
  const abnValue = useWatch({ control, name: 'abn' }) ?? '';
  const addressLine1Value = useWatch({ control, name: 'addressLine1' }) ?? '';
  const abnLookup = useAbnLookup(abnValue);

  useEffect(() => {
    if (abnLookup.status !== 'success') return;

    const { data } = abnLookup;
    setValue('businessName', data.businessName, {
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

    clearErrors('abn');
  }, [abnLookup, clearErrors, setValue]);

  function onSubmit(data: FormInput) {
    startTransition(async () => {
      const result = await completeOnboarding({
        businessName: data.businessName,
        abn: data.abn,
        phone: data.phone,
        addressLine1: data.addressLine1,
        city: data.city,
        state: data.state,
        postcode: data.postcode,
        createExampleData: data.createExampleData,
      });
      if (result && 'error' in result) {
        setError('root', { message: result.error });
      }
    });
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

  return (
    <div className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-6 shadow-sm">
      {errors.root && (
        <ErrorAlert className="mb-5">{errors.root.message}</ErrorAlert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label htmlFor="abn" className={labelClass}>
            ABN <span className="text-error">*</span>
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
          {errors.abn && (
            <p className={errorClass}>{errors.abn.message as string}</p>
          )}
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
              `${
                abnLookup.data.businessName
              } loaded. Review any missing address fields before saving.`}
            {abnLookup.status === 'error' && abnLookup.error}
            {abnLookup.status === 'idle' &&
              (normalizeAbn(abnValue).length === 11
                ? 'ABN looks valid. Details will load shortly.'
                : 'Enter all 11 ABN digits to auto-fill business details.')}
          </p>
        </div>

        <div>
          <label htmlFor="businessName" className={labelClass}>
            Business Name <span className="text-error">*</span>
          </label>
          <input
            id="businessName"
            type="text"
            autoComplete="organization"
            placeholder="Smith's Painting"
            disabled={isPending}
            className={inputClass(!!errors.businessName)}
            {...register('businessName')}
          />
          {errors.businessName && (
            <p className={errorClass}>{errors.businessName.message}</p>
          )}
        </div>

        <details
          open={optionalDetailsOpen}
          onToggle={(event) => setOptionalDetailsOpen(event.currentTarget.open)}
          className="border-outline-variant bg-surface-container-low rounded-2xl border p-4"
        >
          <summary className="text-on-surface focus-visible:ring-primary/40 flex min-h-11 cursor-pointer items-center rounded-xl text-base font-semibold focus-visible:ring-2 focus-visible:outline-none">
            Optional business details
          </summary>
          <p className="text-on-surface-variant mt-1 text-sm">
            Add contact and address details now, or complete them later in
            Settings.
          </p>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0400 000 000"
                disabled={isPending}
                className={inputClass(!!errors.phone)}
                {...register('phone')}
              />
              {errors.phone && (
                <p className={errorClass}>{errors.phone.message}</p>
              )}
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="text-on-surface mb-1 text-sm font-medium">
                Business Address
              </legend>

              <div>
                <label htmlFor="addressLine1" className={labelClass}>
                  Street address
                </label>
                <GoogleAddressAutocomplete
                  id="addressLine1"
                  autoComplete="street-address"
                  placeholder="Street address"
                  disabled={isPending}
                  value={addressLine1Value}
                  onChange={(value) =>
                    setValue('addressLine1', value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  onAddressSelected={applyGoogleAddress}
                  aria-invalid={!!errors.addressLine1}
                  className={inputClass(!!errors.addressLine1)}
                />
                {errors.addressLine1 && (
                  <p className={errorClass}>{errors.addressLine1.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="city" className={labelClass}>
                    Suburb
                  </label>
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
                  <label htmlFor="postcode" className={labelClass}>
                    Postcode
                  </label>
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
                    <p className={errorClass}>
                      {errors.postcode.message as string}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="state" className={labelClass}>
                  State
                </label>
                <select
                  id="state"
                  disabled={isPending}
                  className={`${inputClass(!!errors.state)} text-on-surface`}
                  {...register('state')}
                >
                  <option value="">Select state</option>
                  {AU_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <p className={errorClass}>{errors.state.message}</p>
                )}
              </div>
            </fieldset>
          </div>
        </details>

        <div className="border-success-container bg-success-container/70 rounded-2xl border p-4">
          <label className="focus-within:ring-primary/30 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl focus-within:ring-2 focus-within:outline-none">
            <input
              type="checkbox"
              disabled={isPending}
              className="border-primary-fixed text-primary mt-1 h-5 w-5 cursor-pointer rounded focus:outline-none"
              {...register('createExampleData')}
            />
            <div>
              <div className="text-primary flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Add sample data
              </div>
              <p className="text-primary/90 mt-1 text-sm">
                Optional. Add one sample customer, quote, and invoice so you can
                explore the app straight away.
              </p>
              <p className="text-primary-container mt-1 text-xs">
                This only runs when your workspace is empty.
              </p>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          Save &amp; continue
        </button>
      </form>
    </div>
  );
}
