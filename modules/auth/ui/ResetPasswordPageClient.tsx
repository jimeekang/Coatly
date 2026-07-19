'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { APP_NAME } from '@/config/constants';
import { createBrowserClient } from '@/lib/supabase/client';
import { AuthShell } from '@/modules/auth/ui/AuthShell';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { FormField } from '@/components/forms/FormField';

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

const linkClassName =
  'rounded font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

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
      <AuthShell
        eyebrow="Password reset"
        title="Checking your reset link"
        description="Hang tight while we verify your reset link."
      >
        <div className="flex items-center justify-center py-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        </div>
      </AuthShell>
    );
  }

  if (recoveryState === 'invalid') {
    return (
      <AuthShell
        eyebrow="Password reset"
        title="Reset link expired"
        description="This password reset link is invalid or has expired."
        footer={
          <Link href="/forgot-password" className={linkClassName}>
            Request a new reset email
          </Link>
        }
      >
        {serverError && <ErrorAlert>{serverError}</ErrorAlert>}
      </AuthShell>
    );
  }

  if (recoveryState === 'success') {
    return (
      <AuthShell
        eyebrow="Password reset"
        title="Password updated"
        description={`Redirecting you back into ${APP_NAME}...`}
      >
        <div className="flex justify-center py-2">
          <CheckCircle className="h-12 w-12 text-primary-container" aria-hidden="true" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Set new password"
      description="Enter a new password for your account."
      footer={
        <>
          Remembered your password?{' '}
          <Link href="/login" className={linkClassName}>
            Sign in
          </Link>
        </>
      }
    >
      {serverError && <ErrorAlert className="mb-4">{serverError}</ErrorAlert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField
          htmlFor="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          disabled={isPending}
          error={errors.password?.message}
          {...register('password')}
        />

        <FormField
          htmlFor="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your new password"
          disabled={isPending}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <button
          type="submit"
          disabled={isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          Update password
        </button>
      </form>
    </AuthShell>
  );
}
