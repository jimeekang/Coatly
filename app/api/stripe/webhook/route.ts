import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.redirect(new URL('/api/webhooks/stripe', request.url), 308);
}
