import type { NextRequest } from 'next/server';

const PUBLIC_QUOTE_ROUTE_KEY = 'public_quote';
const PUBLIC_QUOTE_RATE_LIMIT = 60;
const PUBLIC_QUOTE_WINDOW_SECONDS = 60;

type PublicRateLimitAllowed = {
  allowed: true;
};

type PublicRateLimitBlocked = {
  allowed: false;
  retryAfterSeconds: number;
};

export type PublicRateLimitResult =
  | PublicRateLimitAllowed
  | PublicRateLimitBlocked;

type RateLimitRow = {
  allowed?: boolean;
  retry_after_seconds?: number;
};

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

function getSupabaseRestUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  return `${url.replace(/\/+$/, '')}/rest/v1/rpc/check_public_route_rate_limit`;
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function fallbackResult(): PublicRateLimitResult {
  if (!isProduction()) {
    return { allowed: true };
  }

  return { allowed: false, retryAfterSeconds: PUBLIC_QUOTE_WINDOW_SECONDS };
}

function parseRetryAfter(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return PUBLIC_QUOTE_WINDOW_SECONDS;
  }

  return Math.max(1, Math.ceil(value));
}

async function hashIp(ip: string, secret: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is required for public quote rate limiting.');
  }

  const input = new TextEncoder().encode(`${secret}:${ip}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', input);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function firstRateLimitRow(payload: unknown): RateLimitRow | null {
  if (Array.isArray(payload)) {
    return (payload[0] ?? null) as RateLimitRow | null;
  }

  if (payload && typeof payload === 'object') {
    return payload as RateLimitRow;
  }

  return null;
}

export async function checkPublicQuoteRateLimit(
  request: NextRequest
): Promise<PublicRateLimitResult> {
  const supabaseRestUrl = getSupabaseRestUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseRestUrl || !serviceRoleKey) {
    return fallbackResult();
  }

  try {
    const ipHash = await hashIp(getClientIp(request), serviceRoleKey);
    const response = await fetch(supabaseRestUrl, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_route_key: PUBLIC_QUOTE_ROUTE_KEY,
        p_ip_hash: ipHash,
        p_limit: PUBLIC_QUOTE_RATE_LIMIT,
        p_window_seconds: PUBLIC_QUOTE_WINDOW_SECONDS,
      }),
    });

    if (!response.ok) {
      return fallbackResult();
    }

    const row = firstRateLimitRow(await response.json());
    if (row?.allowed === true) {
      return { allowed: true };
    }

    return {
      allowed: false,
      retryAfterSeconds: parseRetryAfter(row?.retry_after_seconds),
    };
  } catch {
    return fallbackResult();
  }
}
