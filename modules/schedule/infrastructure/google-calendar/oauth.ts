import 'server-only';
import { randomBytes } from 'node:crypto';
import type { User } from '@supabase/supabase-js';
import type { GoogleCalendarScope } from './types';

export const GOOGLE_CALENDAR_STATE_COOKIE = 'google-calendar-oauth-state';

export const GOOGLE_CALENDAR_SCOPES: GoogleCalendarScope[] = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

const DEFAULT_GOOGLE_CLIENT_ID =
  '1005860908873-6icehiqlp8atsb8m20302avmgosep0da.apps.googleusercontent.com';

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
  id_token?: string;
};

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID?.trim() || DEFAULT_GOOGLE_CLIENT_ID;
}

function getGoogleOAuthClientConfig() {
  const clientId = getGoogleClientId();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing Google OAuth configuration. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
    );
  }

  return { clientId, clientSecret };
}

export function isGoogleCalendarOAuthConfigured() {
  return Boolean(
    getGoogleClientId() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_CALENDAR_TOKEN_SECRET?.trim()
  );
}

export function canUserConnectGoogleCalendar(user: Pick<User, 'app_metadata' | 'identities'>) {
  const providers = user.app_metadata?.providers;
  const metadataProvider = user.app_metadata?.provider;

  return Boolean(
    metadataProvider === 'google' ||
      (Array.isArray(providers) && providers.includes('google')) ||
      user.identities?.some((identity) => identity.provider === 'google')
  );
}

export function createGoogleCalendarOAuthState(nextPath: string) {
  const state = {
    nonce: randomBytes(18).toString('base64url'),
    next: nextPath,
  };

  return {
    cookieValue: state.nonce,
    stateParam: Buffer.from(JSON.stringify(state), 'utf8').toString('base64url'),
  };
}

export function parseGoogleCalendarOAuthState(rawState: string | null) {
  if (!rawState) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString('utf8')) as {
      nonce?: string;
      next?: string;
    };

    if (!parsed.nonce || !parsed.next) {
      return null;
    }

    return { nonce: parsed.nonce, next: parsed.next };
  } catch {
    return null;
  }
}

export function buildGoogleCalendarAuthorizationUrl(input: {
  redirectUri: string;
  state: string;
  loginHint?: string | null;
}) {
  const { clientId } = getGoogleOAuthClientConfig();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('scope', GOOGLE_CALENDAR_SCOPES.join(' '));
  url.searchParams.set('state', input.state);

  if (input.loginHint) {
    url.searchParams.set('login_hint', input.loginHint);
  }

  return url;
}

async function postGoogleToken(body: URLSearchParams) {
  const { clientId, clientSecret } = getGoogleOAuthClientConfig();
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | GoogleTokenResponse
    | { error?: string; error_description?: string }
    | null;

  if (!response.ok || !payload || !('access_token' in payload)) {
    const message =
      payload && 'error_description' in payload && payload.error_description
        ? payload.error_description
        : 'Google token exchange failed.';
    throw new Error(message);
  }

  return payload;
}

export async function exchangeGoogleCalendarCodeForTokens(input: {
  code: string;
  redirectUri: string;
}) {
  return postGoogleToken(
    new URLSearchParams({
      code: input.code,
      redirect_uri: input.redirectUri,
      grant_type: 'authorization_code',
    })
  );
}

export async function refreshGoogleCalendarAccessToken(refreshToken: string) {
  return postGoogleToken(
    new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    })
  );
}
