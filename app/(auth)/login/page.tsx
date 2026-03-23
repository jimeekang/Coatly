import LoginPageClient from '@/components/auth/LoginPageClient';

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

function getInitialError(error?: string, message?: string): string | null {
  if (message) {
    return message;
  }

  if (error === 'auth_callback_failed') {
    return 'Google sign-in could not be completed. Please try again.';
  }

  if (error === 'oauth_callback_failed') {
    return 'Google sign-in could not be completed.';
  }

  if (error === 'access_denied') {
    return 'Google sign-in was cancelled.';
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialError = getInitialError(
    resolvedSearchParams?.error,
    resolvedSearchParams?.message
  );

  return <LoginPageClient initialError={initialError} />;
}
