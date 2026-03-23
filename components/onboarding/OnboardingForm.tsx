'use client';

import { useEffect, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Sparkles } from 'lucide-react';
import { completeOnboarding } from '@/app/actions/profile';
import { normalizeAbn } from '@/lib/abn-lookup';
import { useAbnLookup } from '@/hooks/useAbnLookup';

const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] as const;

const schema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  abn: z
    .string()
    .min(1, 'ABN is required')
    .transform((v) => v.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{11}$/, 'ABN must be 11 digits')),
  phone: z.string().min(1, 'Phone is required'),
  addressLine1: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'Suburb is required'),
  state: z.string().min(1, 'State is required'),
  postcode: z
    .string()
    .min(1, 'Postcode is required')
    .regex(/^\d{4}$/, 'Postcode must be 4 digits'),
  createExampleData: z.boolean(),
});

type FormInput = z.infer<typeof schema>;

const inputBase =
  'w-full h-12 rounded-lg border px-4 text-sm text-pm-body focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30 focus:border-pm-teal-mid disabled:opacity-50 bg-white transition-colors';

function inputClass(hasError: boolean) {
  return `${inputBase} ${hasError ? 'border-pm-coral' : 'border-pm-border'}`;
}

const labelClass = 'block text-sm font-medium text-pm-body mb-1.5';
const errorClass = 'mt-1.5 text-xs text-pm-coral-dark';

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
}

export default function OnboardingForm({ defaultValues }: Props) {
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

  return (
    <div className="rounded-2xl border border-pm-border bg-white p-6 shadow-sm">
      {errors.root && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3 text-sm text-pm-coral-dark"
        >
          {errors.root.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label htmlFor="abn" className={labelClass}>
            ABN <span className="text-red-500">*</span>
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
          {errors.abn && <p className={errorClass}>{errors.abn.message as string}</p>}
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
            Business Name <span className="text-red-500">*</span>
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

        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone <span className="text-red-500">*</span>
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
          {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
        </div>

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-pm-body">
            Business Address <span className="text-red-500">*</span>
          </legend>

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
                {errors.postcode && (
                  <p className={errorClass}>{errors.postcode.message as string}</p>
                )}
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
                {AU_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errors.state && <p className={errorClass}>{errors.state.message}</p>}
            </div>
          </div>
        </fieldset>

        <div className="rounded-xl border border-pm-teal-light bg-pm-teal-light/70 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              disabled={isPending}
              className="mt-1 h-5 w-5 rounded border-pm-teal-pale text-pm-teal focus:ring-2 focus:ring-pm-teal-mid"
              {...register('createExampleData')}
            />
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-pm-teal">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Add sample data
              </div>
              <p className="mt-1 text-sm text-pm-teal-hover">
                Optional. Add one sample customer, quote, and invoice so you can
                explore the app straight away.
              </p>
              <p className="mt-1 text-xs text-pm-teal-mid">
                This only runs when your workspace is empty.
              </p>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-pm-teal text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover focus:outline-none focus:ring-2 focus:ring-pm-teal-mid focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Save &amp; continue
        </button>
      </form>
    </div>
  );
}
