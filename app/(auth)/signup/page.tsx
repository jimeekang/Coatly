'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle } from 'lucide-react';
import { signUpWithEmail } from '@/app/actions/auth';
import { AuthShell } from '@/components/auth/AuthShell';

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
  'w-full h-12 rounded-lg border border-pm-border bg-white px-4 text-sm text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30 disabled:opacity-50';

export default function SignupPage() {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<'idle' | 'check-email'>('idle');

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
        sideTitle="A cleaner first-run experience builds trust early."
        sideDescription="Even the confirmation step should feel like part of the same product, not a blank dead-end between auth and onboarding."
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-pm-teal-light">
            <CheckCircle className="h-7 w-7 text-pm-teal-mid" aria-hidden="true" />
          </div>
          <p className="text-sm leading-6 text-pm-secondary">
            We sent a confirmation link to your email. After confirming, sign in to continue to
            business setup.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-pm-teal-hover hover:underline"
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
      sideTitle="The first form should feel confident, not cramped."
      sideDescription="Sign up is often the first real interaction with the product. Better spacing, hierarchy, and scale make Coatly feel more credible before the dashboard even loads."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-pm-teal-hover hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {serverError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3 text-sm text-pm-coral-dark"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="businessName" className="mb-1.5 block text-sm font-medium text-pm-body">
            Business Name
          </label>
          <input
            id="businessName"
            type="text"
            autoComplete="organization"
            placeholder="Smith's Painting"
            disabled={isPending}
            aria-invalid={!!errors.businessName}
            aria-describedby={errors.businessName ? 'businessName-error' : undefined}
            className={inputClass}
            {...register('businessName')}
          />
          {errors.businessName && (
            <p id="businessName-error" className="mt-1.5 text-xs text-pm-coral">
              {errors.businessName.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-pm-body">
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
            <p id="email-error" className="mt-1.5 text-xs text-pm-coral">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-pm-body">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            disabled={isPending}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className={inputClass}
            {...register('password')}
          />
          {errors.password && (
            <p id="password-error" className="mt-1.5 text-xs text-pm-coral">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-pm-body">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={isPending}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
            className={inputClass}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p id="confirmPassword-error" className="mt-1.5 text-xs text-pm-coral">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-pm-teal text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover focus:outline-none focus:ring-2 focus:ring-pm-teal-mid focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Create account
        </button>
      </form>

      <p className="mt-3 text-center text-xs text-pm-secondary">
        After sign up, you&apos;ll continue to business setup before using the dashboard.
      </p>
    </AuthShell>
  );
}
