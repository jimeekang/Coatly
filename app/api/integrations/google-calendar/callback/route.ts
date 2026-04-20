import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  completeGoogleCalendarConnection,
} from '@/lib/google-calendar/service';
import {
  GOOGLE_CALENDAR_STATE_COOKIE,
  parseGoogleCalendarOAuthState,
} from '@/lib/google-calendar/oauth';
import { createServerClient } from '@/lib/supabase/server';

function buildSettingsRedirect(origin: string, message: string | null, next = '/settings') {
  const url = new URL(next, origin);
  if (message) {
    url.searchParams.set('calendar_error', message);
  }
  return url;
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const errorDescription = request.nextUrl.searchParams.get('error_description');
  const parsedState = parseGoogleCalendarOAuthState(request.nextUrl.searchParams.get('state'));
  const cookieState = request.cookies.get(GOOGLE_CALENDAR_STATE_COOKIE)?.value ?? null;
  const nextPath = parsedState?.next ?? '/settings';

  const clearCookieResponse = (url: URL) => {
    const response = NextResponse.redirect(url);
    response.cookies.set(GOOGLE_CALENDAR_STATE_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
    return response;
  };

  if (!parsedState || !cookieState || parsedState.nonce !== cookieState) {
    return clearCookieResponse(
      buildSettingsRedirect(origin, 'Google Calendar connection could not be verified.', nextPath)
    );
  }

  if (error) {
    return clearCookieResponse(
      buildSettingsRedirect(
        origin,
        errorDescription ?? `Google Calendar authorization failed: ${error}.`,
        nextPath
      )
    );
  }

  if (!code) {
    return clearCookieResponse(
      buildSettingsRedirect(origin, 'Missing Google authorization code.', nextPath)
    );
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return clearCookieResponse(new URL('/login', origin));
  }

  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() ||
    `${origin}/api/integrations/google-calendar/callback`;

  try {
    await completeGoogleCalendarConnection({
      supabase,
      user,
      code,
      redirectUri,
    });

    const successUrl = new URL(nextPath, origin);
    successUrl.searchParams.set('calendar_success', 'connected');
    return clearCookieResponse(successUrl);
  } catch (connectionError) {
    return clearCookieResponse(
      buildSettingsRedirect(origin, connectionError instanceof Error ? connectionError.message : null, nextPath)
    );
  }
}
