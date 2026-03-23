'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { signInWithEmail, getGoogleOAuthUrl } from '@/app/actions/auth';
import { BrandLogo } from '@/components/branding/BrandLogo';
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
    <main className="flex min-h-screen items-center justify-center bg-pm-surface px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <BrandLogo width={176} height={40} priority />
        </div>

        <div className="rounded-2xl border border-pm-border bg-white p-6">
          <h1 className="mb-6 text-[22px] font-semibold text-pm-body">Sign in</h1>

          {displayedError && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3 text-sm text-pm-coral-dark"
            >
              {displayedError}
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
                disabled={isLoading}
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

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-pm-body">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={isLoading}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className="h-12 w-full rounded-lg border border-pm-border bg-white px-4 text-sm text-pm-body placeholder-pm-secondary focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30 disabled:opacity-50"
                {...register('password')}
              />
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-pm-coral">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-pm-teal-hover hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-pm-teal text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover focus:outline-none focus:ring-2 focus:ring-pm-teal-mid focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Sign in
            </button>
          </form>

          <div className="relative my-5" aria-hidden="true">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-pm-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-pm-secondary">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg border border-pm-border bg-white text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface focus:outline-none focus:ring-2 focus:ring-pm-teal-mid focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGooglePending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </button>

          <p className="mt-2 text-center text-xs text-pm-secondary">
            Google sign-in is available only for emails already registered in {APP_NAME}.
          </p>
        </div>

        <p className="mt-5 text-center text-sm text-pm-secondary">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-pm-teal-hover hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </main>
  );
}
