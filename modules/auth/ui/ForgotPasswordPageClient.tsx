'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { requestPasswordReset } from '@/modules/auth/application/actions';
import { AuthShell } from '@/modules/auth/ui/AuthShell';
import { ErrorAlert } from '@/components/shared/ErrorAlert';

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
      <AuthShell
        eyebrow="Password help"
        title="Check your inbox."
        description="Use the secure link in your email to choose a new password and get back to work."
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
          <div className="bg-success-container mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
            <CheckCircle
              className="text-primary-container h-7 w-7"
              aria-hidden="true"
            />
          </div>
          <p className="text-on-surface-variant text-sm">
            We sent a password reset link to{' '}
            <span className="text-on-surface font-medium">{sentEmail}</span>.
          </p>
          <p className="text-on-surface-variant mt-2 text-sm">
            Open the link in that email to set a new password.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Password help"
      title="Reset your password."
      description="Enter the email used for your account and we’ll send you a secure reset link."
      footer={
        <>
          Remembered your password?{' '}
          <Link
            href="/login"
            className="text-primary hover:bg-primary/10 focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl px-3 font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
            className="border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border px-4 text-base focus:ring-2 focus:outline-none disabled:opacity-50"
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" className="text-error mt-1.5 text-sm">
              {errors.email.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          Send reset email
        </button>
      </form>
    </AuthShell>
  );
}
