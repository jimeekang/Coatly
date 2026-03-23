import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

function getSafeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/dashboard';
  }

  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = getSafeNextPath(searchParams.get('next'));
  const errorDescription = searchParams.get('error_description');
  const errorCode = searchParams.get('error');

  if (errorDescription) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'oauth_callback_failed');
    loginUrl.searchParams.set('message', errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'oauth_callback_failed');
    loginUrl.searchParams.set('message', error.message);
    return NextResponse.redirect(loginUrl);
  }

  const loginUrl = new URL('/login', origin);
  loginUrl.searchParams.set(
    'error',
    errorCode === 'access_denied' ? 'access_denied' : 'auth_callback_failed'
  );

  return NextResponse.redirect(loginUrl);
}
