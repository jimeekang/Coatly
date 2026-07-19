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
import { FormField } from '@/components/forms/FormField';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

const linkClassName =
  'rounded font-medium text-primary/90 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

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
        eyebrow="Password reset"
        title="Check your email"
        description="Open the link in that email to set a new password."
        footer={
          <Link href="/login" className={linkClassName}>
            Back to sign in
          </Link>
        }
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-container">
            <CheckCircle className="h-7 w-7 text-primary-container" aria-hidden="true" />
          </div>
          <p className="text-sm leading-6 text-on-surface-variant">
            We sent a password reset link to{' '}
            <span className="font-medium text-on-surface">{sentEmail}</span>.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Forgot password"
      description="Enter your email and we'll send you a reset link."
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
          htmlFor="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          disabled={isPending}
          error={errors.email?.message}
          {...register('email')}
        />

        <button
          type="submit"
          disabled={isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Send reset email
        </button>
      </form>
    </AuthShell>
  );
}
