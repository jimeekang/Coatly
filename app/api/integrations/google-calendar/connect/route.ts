import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  buildGoogleCalendarAuthorizationUrl,
  canUserConnectGoogleCalendar,
  createGoogleCalendarOAuthState,
  GOOGLE_CALENDAR_STATE_COOKIE,
  isGoogleCalendarOAuthConfigured,
} from '@/modules/schedule/infrastructure/google-calendar/oauth';
import { resolveSafeInternalPath } from '@/lib/security/paths';
import { createServerClient } from '@/lib/supabase/server';

function getSafeNextPath(next: string | null) {
  return resolveSafeInternalPath(next, '/settings', ['/settings']);
}

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const origin = request.nextUrl.origin;
  const nextPath = getSafeNextPath(request.nextUrl.searchParams.get('next'));

  if (!user) {
    return NextResponse.redirect(new URL('/login', origin));
  }

  if (!canUserConnectGoogleCalendar(user)) {
    const settingsUrl = new URL('/settings', origin);
    settingsUrl.searchParams.set(
      'calendar_error',
      'Google Calendar is available only for Coatly accounts that sign in with Google.'
    );
    return NextResponse.redirect(settingsUrl);
  }

  if (!isGoogleCalendarOAuthConfigured()) {
    const settingsUrl = new URL('/settings', origin);
    settingsUrl.searchParams.set(
      'calendar_error',
      'Google Calendar is not configured on the server yet.'
    );
    return NextResponse.redirect(settingsUrl);
  }

  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() ||
    `${origin}/api/integrations/google-calendar/callback`;
  const state = createGoogleCalendarOAuthState(nextPath);
  const authUrl = buildGoogleCalendarAuthorizationUrl({
    redirectUri,
    state: state.stateParam,
    loginHint: user.email ?? null,
  });
  const response = NextResponse.redirect(authUrl);

  response.cookies.set(GOOGLE_CALENDAR_STATE_COOKIE, state.cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });

  return response;
}
