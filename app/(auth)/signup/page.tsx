'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle } from 'lucide-react';
import { signUpWithEmail } from '@/app/actions/auth';
import { BrandLogo } from '@/components/branding/BrandLogo';

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
      <main className="flex min-h-screen items-center justify-center bg-pm-surface px-4 py-8">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-pm-teal-light flex items-center justify-center">
            <CheckCircle className="h-7 w-7 text-pm-teal-mid" aria-hidden="true" />
          </div>
          <h2 className="text-[22px] font-semibold text-pm-body mb-2">Check your email</h2>
          <p className="text-sm text-pm-secondary">
            We sent a confirmation link to your email. After confirming, sign in to continue to
            business setup.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm text-pm-teal-hover font-medium hover:underline"
          >
            Back to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-pm-surface px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <BrandLogo width={176} height={40} priority />
        </div>

        <div className="bg-white rounded-2xl border border-pm-border p-6">
          <h1 className="text-[22px] font-semibold text-pm-body mb-6">Create account</h1>

          {serverError && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-pm-coral-light border border-pm-coral px-4 py-3 text-sm text-pm-coral-dark"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-pm-body mb-1.5">
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
              <label htmlFor="email" className="block text-sm font-medium text-pm-body mb-1.5">
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
              <label htmlFor="password" className="block text-sm font-medium text-pm-body mb-1.5">
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
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-pm-body mb-1.5">
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
              className="w-full h-12 rounded-lg bg-pm-teal text-white text-sm font-semibold hover:bg-pm-teal-hover focus:outline-none focus:ring-2 focus:ring-pm-teal-mid focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Create account
            </button>
          </form>

          <p className="mt-3 text-center text-xs text-pm-secondary">
            After sign up, you&apos;ll continue to business setup before using the dashboard.
          </p>
        </div>

        <p className="mt-5 text-center text-sm text-pm-secondary">
          Already have an account?{' '}
          <Link href="/login" className="text-pm-teal-hover font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
