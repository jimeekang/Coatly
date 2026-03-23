'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';

type AuthEmailSignupStatus = {
  email_exists: boolean;
  has_email_provider: boolean;
  has_google_provider: boolean;
};

const DUPLICATE_SIGNUP_ERROR = 'This ID is already signed up.';

export async function signInWithEmail(data: {
  email: string;
  password: string;
}): Promise<{ error: string } | void> {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword(data);
  if (error) return { error: error.message };
  redirect('/dashboard');
}

export async function signUpWithEmail(data: {
  email: string;
  password: string;
  businessName: string;
}): Promise<{ error: string } | { success: 'check-email' }> {
  const existingAuthStatus = await getAuthEmailSignupStatus(data.email);

  if (existingAuthStatus?.has_google_provider && !existingAuthStatus.has_email_provider) {
    return { error: `${DUPLICATE_SIGNUP_ERROR} Continue with Google instead.` };
  }

  if (existingAuthStatus?.email_exists) {
    return { error: `${DUPLICATE_SIGNUP_ERROR} Sign in instead.` };
  }

  const supabase = await createServerClient();
  const { data: signUpData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      // business_name stored in user_metadata; DB trigger creates the profile row
      data: { business_name: data.businessName },
    },
  });
  if (error) return { error: normalizeAuthError(error.message) };

  if (signUpData.user && !signUpData.session && signUpData.user.identities?.length === 0) {
    return { error: `${DUPLICATE_SIGNUP_ERROR} Sign in instead.` };
  }

  if (signUpData.session) {
    redirect('/onboarding');
  }

  return { success: 'check-email' };
}

export async function signOut(): Promise<void> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

async function getBaseUrl(): Promise<string> {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  const headerStore = await headers();
  const host =
    headerStore.get('x-forwarded-host') ?? headerStore.get('host') ?? 'localhost:3000';
  const protocol =
    headerStore.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');

  return `${protocol}://${host}`;
}

export async function getGoogleOAuthUrl(): Promise<
  { url: string } | { error: string }
> {
  const supabase = await createServerClient();
  const redirectTo = `${await getBaseUrl()}/auth/callback?next=${encodeURIComponent('/dashboard')}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });
  if (error || !data.url) {
    return { error: normalizeAuthError(error?.message ?? 'OAuth failed') };
  }
  return { url: data.url };
}

export async function requestPasswordReset(data: {
  email: string;
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createServerClient();
  const redirectTo = `${await getBaseUrl()}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
    redirectTo,
  });

  if (error) {
    return { error: normalizeAuthError(error.message) };
  }

  return { success: true };
}

async function getAuthEmailSignupStatus(
  email: string
): Promise<AuthEmailSignupStatus | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  try {
    const supabase = createAdminClient();
    const normalizedEmail = email.trim().toLowerCase();
    let page = 1;

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 200,
      });

      if (error) {
        console.error('Failed to look up signup email status', error);
        return null;
      }

      const matchedUser = data.users.find(
        (user) => user.email?.trim().toLowerCase() === normalizedEmail
      );

      if (matchedUser) {
        const providers = Array.isArray(matchedUser.app_metadata?.providers)
          ? matchedUser.app_metadata.providers
          : [];
        const primaryProvider = matchedUser.app_metadata?.provider;

        return {
          email_exists: true,
          has_email_provider:
            primaryProvider === 'email' || providers.includes('email'),
          has_google_provider:
            primaryProvider === 'google' || providers.includes('google'),
        };
      }

      if (data.users.length < 200) {
        break;
      }

      page += 1;
    }

    return {
      email_exists: false,
      has_email_provider: false,
      has_google_provider: false,
    };
  } catch (error) {
    console.error('Failed to create Supabase admin client for signup lookup', error);
    return null;
  }
}

function normalizeAuthError(message: string): string {
  if (!message) {
    return 'Authentication failed. Please try again.';
  }

  if (
    message.includes('This Google account is not registered yet') ||
    message.includes('This email is already registered with Google') ||
    message.includes('This email is already registered') ||
    message.includes('This email is already registered with email and password') ||
    message.includes('This ID is already signed up')
  ) {
    return message;
  }

  if (message.toLowerCase().includes('user already registered')) {
    return `${DUPLICATE_SIGNUP_ERROR} Sign in instead.`;
  }

  return message;
}
