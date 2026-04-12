import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PAID_APP_PREFIXES = [
  '/dashboard',
  '/quotes',
  '/invoices',
  '/customers',
  '/settings',
  '/jobs',
  '/schedule',
  '/materials-service',
  '/price-rates',
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
  const { pathname } = request.nextUrl;
  const isAuthRoute = matchesPrefixes(pathname, ['/login', '/signup']);
  const isPaidAppRoute = matchesPrefixes(pathname, PAID_APP_PREFIXES);
  const isOnboardingRoute = matchesPrefixes(pathname, ['/onboarding']);
  const isSubscribeRoute = matchesPrefixes(pathname, ['/subscribe']);
  const needsAuth = isPaidAppRoute || isOnboardingRoute || isSubscribeRoute;
  const shouldCheckAuth = needsAuth || isAuthRoute;

  if (!shouldCheckAuth) {
    return NextResponse.next({ request });
  }

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

  if (!user && needsAuth) {
    return redirectTo(request, '/login');
  }

  if (user && isAuthRoute) {
    return redirectTo(request, '/dashboard');
  }

  return buildResponse(requestHeaders, supabaseResponse);
}
