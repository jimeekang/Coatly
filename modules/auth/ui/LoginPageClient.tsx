'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  signInWithEmail,
  getGoogleOAuthUrl,
} from '@/modules/auth/application/actions';
import { AuthShell } from '@/modules/auth/ui/AuthShell';
import { PasswordInput } from '@/modules/auth/ui/PasswordInput';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { APP_NAME } from '@/config/constants';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginInput = z.infer<typeof loginSchema>;

type LoginPageClientProps = {
  initialError?: string | null;
};

export default function LoginPageClient({
  initialError = null,
}: LoginPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isGooglePending, setIsGooglePending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const displayedError = serverError ?? initialError;

  function onSubmit(data: LoginInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await signInWithEmail(data);
      if (result?.error) setServerError(result.error);
    });
  }

  async function handleGoogleLogin() {
    setServerError(null);
    setIsGooglePending(true);
    const result = await getGoogleOAuthUrl();
    if ('error' in result) {
      setServerError(result.error);
      setIsGooglePending(false);
    } else {
      window.location.href = result.url;
    }
  }

  const isLoading = isPending || isGooglePending;

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Pick up where the workday left off."
      description="Open your workspace to keep quotes, invoices, scheduling, and customer follow-up moving."
      sideTitle="Less admin. More time on the tools."
      sideDescription="Every quote, invoice, and customer record in one place — built for Australian painters who want to spend more time painting and less time on paperwork."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="text-primary/90 hover:bg-primary/10 focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl px-3 font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Sign up free
          </Link>
        </>
      }
    >
      {displayedError && (
        <ErrorAlert className="mb-4">{displayedError}</ErrorAlert>
      )}

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
            disabled={isLoading}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className="border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border px-4 text-base focus:ring-2 focus:outline-none disabled:opacity-50"
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
          autoComplete="current-password"
          placeholder="••••••••"
          disabled={isLoading}
          {...register('password')}
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-primary/90 hover:bg-primary/10 focus-visible:ring-primary/30 inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          Sign in
        </button>
      </form>

      <div className="relative my-5" aria-hidden="true">
        <div className="absolute inset-0 flex items-center">
          <div className="border-outline-variant w-full border-t" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-surface-container-lowest text-on-surface-variant px-3 text-xs">
            or
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low focus-visible:ring-primary/30 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border text-base font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGooglePending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        Continue with Google
      </button>

      <p className="text-on-surface-variant mt-2 text-center text-xs">
        Google sign-in is available only for emails already registered in{' '}
        {APP_NAME}.
      </p>
    </AuthShell>
  );
}
