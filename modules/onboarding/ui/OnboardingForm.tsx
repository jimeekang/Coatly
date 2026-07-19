'use client';

import { useEffect, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Sparkles } from 'lucide-react';
import { GoogleAddressAutocomplete } from '@/components/forms/GoogleAddressAutocomplete';
import {
  FormField,
  FormOptionalIndicator,
  formControlClassName,
} from '@/components/forms/FormField';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { normalizeAbn } from '@/lib/abn-lookup';
import { useAbnLookup } from '@/hooks/useAbnLookup';
import { cn } from '@/lib/utils';
import {
  formatStreetAddressWithUnit,
  type ParsedGooglePlaceAddress,
} from '@/lib/google-places-address';

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

// Only business name + ABN are required to finish onboarding; the rest can be
// completed later in Settings. Optional fields still validate format if filled.
const schema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  abn: z
    .string()
    .min(1, 'ABN is required')
    .transform((v) => v.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{11}$/, 'ABN must be 11 digits')),
  phone: z.string(),
  addressLine1: z.string(),
  city: z.string(),
  state: z.string(),
  postcode: z
    .string()
    .refine((v) => v === '' || /^\d{4}$/.test(v), 'Postcode must be 4 digits'),
  createExampleData: z.boolean(),
});

type FormInput = z.infer<typeof schema>;

const errorTextClassName = 'mt-1 text-sm text-error';

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
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
      <p className="mb-5 text-sm text-on-surface-variant">
        Only your business name and ABN are needed to get started. You can finish
        this later in Settings.
      </p>

      {errors.root && <ErrorAlert className="mb-5">{errors.root.message}</ErrorAlert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <FormField
            htmlFor="abn"
            label="ABN"
            required
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="12 345 678 901"
            disabled={isPending}
            error={errors.abn?.message as string | undefined}
            {...register('abn')}
          />
          <p
            className={`mt-1.5 text-xs ${
              abnLookup.status === 'error'
                ? 'text-error'
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

        <FormField
          htmlFor="businessName"
          label="Business Name"
          required
          type="text"
          autoComplete="organization"
          placeholder="Smith's Painting"
          disabled={isPending}
          error={errors.businessName?.message}
          {...register('businessName')}
        />

        <FormField
          htmlFor="phone"
          label="Phone"
          optional
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0400 000 000"
          disabled={isPending}
          error={errors.phone?.message}
          {...register('phone')}
        />

        <fieldset>
          <legend className="mb-3 flex items-center text-sm font-semibold text-on-surface">
            Business Address
            <FormOptionalIndicator />
          </legend>

          <div className="space-y-3">
            <div>
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
                className={cn(
                  formControlClassName,
                  errors.addressLine1 && 'border-error',
                )}
              />
              {errors.addressLine1 && (
                <p className={errorTextClassName}>{errors.addressLine1.message}</p>
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
                  className={cn(
                    formControlClassName,
                    errors.city && 'border-error',
                  )}
                  {...register('city')}
                />
                {errors.city && (
                  <p className={errorTextClassName}>{errors.city.message}</p>
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
                  className={cn(
                    formControlClassName,
                    errors.postcode && 'border-error',
                  )}
                  {...register('postcode')}
                />
                {errors.postcode && (
                  <p className={errorTextClassName}>
                    {errors.postcode.message as string}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="state" className="sr-only">
                State
              </label>
              <select
                id="state"
                disabled={isPending}
                className={cn(
                  formControlClassName,
                  errors.state && 'border-error',
                )}
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
                <p className={errorTextClassName}>{errors.state.message}</p>
              )}
            </div>
          </div>
        </fieldset>

        <div className="rounded-xl border border-success-container bg-success-container/70 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              disabled={isPending}
              className="mt-1 h-5 w-5 rounded border-primary-fixed text-primary focus:ring-2 focus:ring-primary/40"
              {...register('createExampleData')}
            />
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Add sample data
              </div>
              <p className="mt-1 text-sm text-primary/90">
                Optional. Add one sample customer, quote, and invoice so you can
                explore the app straight away.
              </p>
              <p className="mt-1 text-xs text-primary-container">
                This only runs when your workspace is empty.
              </p>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
