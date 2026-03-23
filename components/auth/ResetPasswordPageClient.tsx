'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { BrandLogo } from '@/components/branding/BrandLogo';
import { APP_NAME } from '@/config/constants';
import { createBrowserClient } from '@/lib/supabase/client';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

type RecoveryState = 'checking' | 'ready' | 'invalid' | 'success';

export default function ResetPasswordPageClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('checking');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    const supabase = createBrowserClient();
    let isActive = true;
    let invalidTimer: ReturnType<typeof setTimeout> | undefined;
    const hasRecoveryHash =
      window.location.hash.includes('type=recovery') ||
      window.location.hash.includes('access_token=');

    const markReadyFromSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      if (error) {
        setRecoveryState('invalid');
        setServerError(error.message);
        return;
      }

      if (data.session) {
        setRecoveryState('ready');
        return;
      }

      if (hasRecoveryHash) {
        invalidTimer = setTimeout(() => {
          if (isActive) {
            setRecoveryState('invalid');
          }
        }, 1500);
        return;
      }

      setRecoveryState('invalid');
    };

    void markReadyFromSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!isActive) {
        return;
      }

      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        if (invalidTimer) {
          clearTimeout(invalidTimer);
        }
        setRecoveryState('ready');
      }
    });

    return () => {
      isActive = false;
      if (invalidTimer) {
        clearTimeout(invalidTimer);
      }
      subscription.unsubscribe();
    };
  }, []);

  function onSubmit(data: ResetPasswordInput) {
    setServerError(null);

    startTransition(async () => {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        setServerError(error.message);
        return;
      }

      setRecoveryState('success');
      router.replace('/dashboard');
      router.refresh();
    });
  }

  if (recoveryState === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-pm-surface px-4 py-8">
        <div className="w-full max-w-sm rounded-2xl border border-pm-border bg-white p-6 text-center shadow-sm">
          <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin text-pm-teal" />
          <p className="text-sm text-pm-secondary">Checking your reset link...</p>
        </div>
      </main>
    );
  }

  if (recoveryState === 'invalid') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-pm-surface px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <BrandLogo width={176} height={40} priority />
          </div>

          <div className="rounded-2xl border border-pm-border bg-white p-6 text-center shadow-sm">
            <h1 className="mb-2 text-xl font-bold text-pm-body">Reset link expired</h1>
            <p className="text-sm text-pm-secondary">
              This password reset link is invalid or has expired.
            </p>
            {serverError && (
              <p className="mt-3 text-sm text-pm-coral-dark">{serverError}</p>
            )}
            <Link
              href="/forgot-password"
              className="mt-6 inline-block text-sm font-medium text-pm-teal hover:underline"
            >
              Request a new reset email
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (recoveryState === 'success') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-pm-surface px-4 py-8">
        <div className="w-full max-w-sm rounded-2xl border border-pm-border bg-white p-6 text-center shadow-sm">
          <CheckCircle
            className="mx-auto mb-4 h-12 w-12 text-pm-teal-mid"
            aria-hidden="true"
          />
          <h1 className="mb-2 text-xl font-bold text-pm-body">Password updated</h1>
          <p className="text-sm text-pm-secondary">Redirecting you back into {APP_NAME}...</p>
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

        <div className="rounded-2xl border border-pm-border bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-xl font-bold text-pm-body">Set new password</h1>
          <p className="mb-6 text-sm text-pm-secondary">
            Enter a new password for your account.
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
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-pm-body"
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                disabled={isPending}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className="h-12 w-full rounded-lg border border-pm-border px-4 text-sm text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30 disabled:opacity-50"
                {...register('password')}
              />
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-pm-coral-dark">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-pm-body"
              >
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your new password"
                disabled={isPending}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={
                  errors.confirmPassword ? 'confirmPassword-error' : undefined
                }
                className="h-12 w-full rounded-lg border border-pm-border px-4 text-sm text-pm-body focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30 disabled:opacity-50"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p
                  id="confirmPassword-error"
                  className="mt-1.5 text-xs text-pm-coral-dark"
                >
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-pm-teal text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover focus:outline-none focus:ring-2 focus:ring-pm-teal-mid focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Update password
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
