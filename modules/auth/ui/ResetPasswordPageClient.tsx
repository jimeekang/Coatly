'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { AuthShell } from '@/modules/auth/ui/AuthShell';
import { PasswordInput } from '@/modules/auth/ui/PasswordInput';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
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
      <AuthShell
        eyebrow="Password reset"
        title="Checking your reset link."
        description="This should only take a moment."
      >
        <div className="text-center">
          <Loader2 className="text-primary mx-auto mb-4 h-6 w-6 animate-spin" />
          <p className="text-on-surface-variant text-sm">
            Preparing a secure password reset.
          </p>
        </div>
      </AuthShell>
    );
  }

  if (recoveryState === 'invalid') {
    return (
      <AuthShell
        eyebrow="Password reset"
        title="That reset link has expired."
        description="Request a fresh link to choose a new password and return to your workspace."
        footer={
          <Link
            href="/login"
            className="text-primary hover:bg-primary/10 focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl px-3 font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Back to sign in
          </Link>
        }
      >
        <div className="text-center">
          {serverError && (
            <ErrorAlert className="mb-4 text-left">{serverError}</ErrorAlert>
          )}
          <Link
            href="/forgot-password"
            className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Request a new reset email
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (recoveryState === 'success') {
    return (
      <AuthShell
        eyebrow="Password reset"
        title="Password updated."
        description={`Taking you back into ${APP_NAME} now.`}
      >
        <div className="text-center">
          <CheckCircle
            className="text-primary-container mx-auto mb-4 h-12 w-12"
            aria-hidden="true"
          />
          <p className="text-on-surface-variant text-sm">
            Your new password is ready to use.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Choose a new password."
      description="Use at least 8 characters, then sign in with your new password from now on."
    >
      {serverError && <ErrorAlert className="mb-4">{serverError}</ErrorAlert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <PasswordInput
          id="password"
          label="New password"
          error={errors.password?.message}
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          disabled={isPending}
          {...register('password')}
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm new password"
          error={errors.confirmPassword?.message}
          autoComplete="new-password"
          placeholder="Repeat your new password"
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
          Update password
        </button>
      </form>
    </AuthShell>
  );
}
