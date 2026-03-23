'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { requestPasswordReset } from '@/app/actions/auth';
import { BrandLogo } from '@/components/branding/BrandLogo';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPageClient() {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  function onSubmit(data: ForgotPasswordInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await requestPasswordReset(data);
      if ('error' in result) {
        setServerError(result.error);
        return;
      }
      setSentEmail(data.email);
    });
  }

  if (sentEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-pm-surface px-4 py-8">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-pm-teal-light flex items-center justify-center">
            <CheckCircle className="h-7 w-7 text-pm-teal-mid" aria-hidden="true" />
          </div>
          <h1 className="mb-2 text-[22px] font-semibold text-pm-body">Check your email</h1>
          <p className="text-sm text-pm-secondary">
            We sent a password reset link to{' '}
            <span className="font-medium text-pm-body">{sentEmail}</span>.
          </p>
          <p className="mt-2 text-sm text-pm-secondary">
            Open the link in that email to set a new password.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-pm-teal-hover hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-pm-surface px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandLogo width={176} height={40} priority />
        </div>

        <div className="rounded-2xl border border-pm-border bg-white p-6">
          <h1 className="mb-2 text-[22px] font-semibold text-pm-body">Forgot password</h1>
          <p className="mb-6 text-sm text-pm-secondary">
            Enter your email and we&apos;ll send you a reset link.
          </p>

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
                className="h-12 w-full rounded-lg border border-pm-border bg-white px-4 text-sm text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30 disabled:opacity-50"
                {...register('email')}
              />
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-pm-coral">
                  {errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-pm-teal text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover focus:outline-none focus:ring-2 focus:ring-pm-teal-mid focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Send reset email
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-pm-secondary">
          Remembered your password?{' '}
          <Link href="/login" className="font-medium text-pm-teal-hover hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
