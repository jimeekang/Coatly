import { checkPublicQuoteRateLimit } from '@/lib/security/public-rate-limit';
import { updateSession } from '@/lib/supabase/session';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limit public quote pages (/q/[token])
  if (pathname.startsWith('/q/')) {
    const rateLimit = await checkPublicQuoteRateLimit(request);
    if (!rateLimit.allowed) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
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
