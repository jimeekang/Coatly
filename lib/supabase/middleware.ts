import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSubscriptionSnapshotForUser } from '@/lib/subscription/access';
import {
  getProfileWithOnboardingFallback,
  inferOnboardingCompleted,
} from '@/lib/profile/onboarding';

const PAID_APP_PREFIXES = [
  '/dashboard',
  '/quotes',
  '/invoices',
  '/customers',
  '/settings',
];

function matchesPrefixes(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

function buildResponse(requestHeaders: Headers, baseResponse: NextResponse) {
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  baseResponse.headers.forEach((value, key) => {
    response.headers.set(key, value);
  });

  baseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}

export async function updateSession(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request });
  }

  const requestHeaders = new Headers(request.headers);
  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = matchesPrefixes(pathname, ['/login', '/signup']);
  const isPaidAppRoute = matchesPrefixes(pathname, PAID_APP_PREFIXES);
  const isOnboardingRoute = matchesPrefixes(pathname, ['/onboarding']);
  const isSubscribeRoute = matchesPrefixes(pathname, ['/subscribe']);
  const needsAuth = isPaidAppRoute || isOnboardingRoute || isSubscribeRoute;

  if (!user && needsAuth) {
    return redirectTo(request, '/login');
  }

  let onboardingCompleted: boolean | null = null;
  let hasActiveSubscription: boolean | null = null;

  if (user && (needsAuth || isAuthRoute)) {
    try {
      const [{ data: profile }, snapshot] = await Promise.all([
        getProfileWithOnboardingFallback(supabase, user.id),
        getSubscriptionSnapshotForUser(supabase, user.id),
      ]);

      onboardingCompleted = inferOnboardingCompleted(profile);
      hasActiveSubscription = snapshot.active;
      requestHeaders.set('x-paintmate-subscription-plan', snapshot.plan);
      requestHeaders.set('x-paintmate-subscription-status', snapshot.status);
      requestHeaders.set(
        'x-paintmate-subscription-active',
        snapshot.active ? 'true' : 'false'
      );
      requestHeaders.set(
        'x-paintmate-subscription-cancel-scheduled',
        snapshot.cancelScheduled ? 'true' : 'false'
      );
    } catch (error) {
      console.error('Failed to read subscription snapshot in middleware', error);
      requestHeaders.set('x-paintmate-subscription-plan', 'starter');
      requestHeaders.set('x-paintmate-subscription-status', 'unknown');
      requestHeaders.set('x-paintmate-subscription-active', 'false');
      requestHeaders.set('x-paintmate-subscription-cancel-scheduled', 'false');
    }
  }

  if (user && isAuthRoute) {
    if (onboardingCompleted === false) {
      return redirectTo(request, '/onboarding');
    }

    if (hasActiveSubscription === false) {
      return redirectTo(request, '/subscribe');
    }

    return redirectTo(request, '/dashboard');
  }

  if (user && isOnboardingRoute && onboardingCompleted === true) {
    return redirectTo(request, hasActiveSubscription ? '/dashboard' : '/subscribe');
  }

  if (user && isSubscribeRoute) {
    if (onboardingCompleted === false) {
      return redirectTo(request, '/onboarding');
    }

    if (hasActiveSubscription) {
      return redirectTo(request, '/dashboard');
    }
  }

  if (user && isPaidAppRoute) {
    if (onboardingCompleted === false) {
      return redirectTo(request, '/onboarding');
    }

    if (hasActiveSubscription === false) {
      return redirectTo(request, '/subscribe');
    }
  }

  return buildResponse(requestHeaders, supabaseResponse);
}
