import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

// In-memory store for public quote rate limiting.
// Serverless note: each function instance has its own store, so this provides
// best-effort rate limiting. For strict enforcement, replace with Upstash Redis.
const publicQuoteHits = new Map<string, { count: number; windowStart: number }>();

const PUBLIC_QUOTE_RATE_LIMIT = 60;   // max requests per window
const PUBLIC_QUOTE_WINDOW_MS = 60_000; // 1 minute window

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

function isPublicQuoteRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = publicQuoteHits.get(ip);

  if (!entry || now - entry.windowStart > PUBLIC_QUOTE_WINDOW_MS) {
    publicQuoteHits.set(ip, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  if (entry.count > PUBLIC_QUOTE_RATE_LIMIT) {
    return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limit public quote pages (/q/[token])
  if (pathname.startsWith('/q/')) {
    const ip = getClientIp(request);
    if (isPublicQuoteRateLimited(ip)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'Content-Type': 'text/plain',
        },
      });
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)',
  ],
};
