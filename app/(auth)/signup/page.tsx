'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { signUpWithEmail } from '@/modules/auth/application/actions';
import { AuthShell } from '@/modules/auth/ui/AuthShell';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import {
  FormField,
  FormLabel,
  formControlClassName,
} from '@/components/forms/FormField';
import { cn } from '@/lib/utils';

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

export default function SignupPage() {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<'idle' | 'check-email'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-container">
            <CheckCircle className="h-7 w-7 text-primary-container" aria-hidden="true" />
          </div>
          <p className="text-sm leading-6 text-on-surface-variant">
            We sent a confirmation link to your email. After confirming, sign in to continue to
            business setup.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded text-sm font-medium text-primary/90 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
            className="rounded font-medium text-primary/90 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Sign in
          </Link>
        </>
      }
    >
      {serverError && <ErrorAlert className="mb-4">{serverError}</ErrorAlert>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField
          htmlFor="businessName"
          label="Business Name"
          type="text"
          autoComplete="organization"
          placeholder="Smith's Painting"
          disabled={isPending}
          error={errors.businessName?.message}
          {...register('businessName')}
        />

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

        <div>
          <FormLabel htmlFor="password">Password</FormLabel>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              disabled={isPending}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={cn(formControlClassName, 'pr-14 disabled:opacity-50')}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              disabled={isPending}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="mt-1 text-sm text-error">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              disabled={isPending}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              className={cn(formControlClassName, 'pr-14 disabled:opacity-50')}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              disabled={isPending}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="confirmPassword-error" className="mt-1 text-sm text-error">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Create account
        </button>
      </form>

      <p className="mt-3 text-center text-xs text-on-surface-variant">
        After sign up, you&apos;ll continue to business setup before using the dashboard.
      </p>
    </AuthShell>
  );
}
