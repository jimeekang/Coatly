'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle } from 'lucide-react';
import { signUpWithEmail } from '@/modules/auth/application/actions';
import { AuthShell } from '@/modules/auth/ui/AuthShell';
import { PasswordInput } from '@/modules/auth/ui/PasswordInput';
import { ErrorAlert } from '@/components/shared/ErrorAlert';

const signupSchema = z
  .object({
    businessName: z.string().min(1, 'Business name is required'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupInput = z.infer<typeof signupSchema>;

const inputClass =
  'h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-base text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50';

export default function SignupPage() {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<'idle' | 'check-email'>(
    'idle'
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  function onSubmit(data: SignupInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await signUpWithEmail({
        email: data.email,
        password: data.password,
        businessName: data.businessName,
      });
      if ('error' in result) {
        setServerError(result.error);
      } else {
        setSuccessState(result.success);
      }
    });
  }

  if (successState === 'check-email') {
    return (
      <AuthShell
        eyebrow="Account created"
        title="Check your inbox."
        description="Confirm the email we just sent, then come back to finish your business setup."
        sideTitle="One step away from your workspace."
        sideDescription="Confirm your email and you're in. From there, set up your business profile and start sending quotes straight away."
      >
        <div className="text-center">
          <div className="bg-success-container mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
            <CheckCircle
              className="text-primary-container h-7 w-7"
              aria-hidden="true"
            />
          </div>
          <p className="text-on-surface-variant text-sm leading-6">
            We sent a confirmation link to your email. After confirming, sign in
            to continue to business setup.
          </p>
          <Link
            href="/login"
            className="text-primary/90 hover:bg-primary/10 focus-visible:ring-primary/30 mt-6 inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Back to login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Create account"
      title="Set up Coatly for your business."
      description="Create your account, then continue into business setup before you start quoting and invoicing."
      sideTitle="Get your painting business organised in minutes."
      sideDescription="Create your free account, set up your business profile, and start sending professional quotes and invoices the same day."
      footer={
        <>
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-primary/90 hover:bg-primary/10 focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl px-3 font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Sign in
          </Link>
        </>
      }
    >
      {serverError && <ErrorAlert className="mb-4">{serverError}</ErrorAlert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="businessName"
            className="text-on-surface mb-1.5 block text-sm font-medium"
          >
            Business Name
          </label>
          <input
            id="businessName"
            type="text"
            autoComplete="organization"
            placeholder="Smith's Painting"
            disabled={isPending}
            aria-invalid={!!errors.businessName}
            aria-describedby={
              errors.businessName ? 'businessName-error' : undefined
            }
            className={inputClass}
            {...register('businessName')}
          />
          {errors.businessName && (
            <p id="businessName-error" className="text-error mt-1.5 text-xs">
              {errors.businessName.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="text-on-surface mb-1.5 block text-sm font-medium"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            disabled={isPending}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={inputClass}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" className="text-error mt-1.5 text-xs">
              {errors.email.message}
            </p>
          )}
        </div>

        <PasswordInput
          id="password"
          label="Password"
          error={errors.password?.message}
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          disabled={isPending}
          {...register('password')}
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm password"
          error={errors.confirmPassword?.message}
          autoComplete="new-password"
          placeholder="••••••••"
          disabled={isPending}
          {...register('confirmPassword')}
        />

        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          Create account
        </button>
      </form>

      <p className="text-on-surface-variant mt-3 text-center text-xs">
        After sign up, you&apos;ll continue to business setup before using the
        dashboard.
      </p>
    </AuthShell>
  );
}
