'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { saveBusinessProfile } from '@/app/actions/business';
import type { BusinessFormValues } from '@/lib/businesses';

const inputBase =
  'w-full rounded-xl border border-pm-border bg-white px-4 text-sm text-pm-body transition-colors focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30 disabled:opacity-50';

function inputClass(hasError: boolean, extra = 'h-12') {
  return `${inputBase} ${extra} ${hasError ? 'border-pm-coral' : ''}`;
}

const labelClass = 'mb-1.5 block text-sm font-medium text-pm-body';
const errorClass = 'mt-1.5 text-xs text-pm-coral';

type FormInput = {
  name: string;
  abn?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
};

export default function BusinessProfileForm({
  defaultValues,
}: {
  defaultValues: BusinessFormValues;
}) {
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<FormInput>({
    defaultValues: {
      name: defaultValues.name,
      abn: defaultValues.abn,
      address: defaultValues.address,
      phone: defaultValues.phone,
      email: defaultValues.email,
      logo_url: defaultValues.logoUrl,
    },
  });

  function onSubmit(data: FormInput) {
    setSuccessMessage(null);
    clearErrors('root');

    startTransition(async () => {
      const result = await saveBusinessProfile(data);

      if (result.error) {
        setError('root', { message: result.error });
        return;
      }

      setSuccessMessage(result.success ?? 'Business details saved.');
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
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-pm-teal-pale bg-pm-teal-light px-4 py-3 text-sm text-pm-teal-hover">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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
              disabled={isPending}
              className={inputClass(!!errors.abn)}
              {...register('abn')}
            />
            {errors.abn && <p className={errorClass}>{errors.abn.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="address" className={labelClass}>
            Business Address
          </label>
          <textarea
            id="address"
            rows={3}
            disabled={isPending}
            className={inputClass(!!errors.address, 'min-h-[112px] py-3')}
            {...register('address')}
          />
          {errors.address && <p className={errorClass}>{errors.address.message}</p>}
        </div>

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

        <div>
          <label htmlFor="logo_url" className={labelClass}>
            Logo URL
          </label>
          <input
            id="logo_url"
            type="url"
            inputMode="url"
            autoComplete="url"
            disabled={isPending}
            className={inputClass(!!errors.logo_url)}
            {...register('logo_url')}
          />
          {errors.logo_url && <p className={errorClass}>{errors.logo_url.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-pm-teal px-4 text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover focus:outline-none focus:ring-2 focus:ring-pm-teal-mid focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Save Business Details
        </button>
      </form>
    </div>
  );
}
