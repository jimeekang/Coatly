import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createSupabaseServerClientMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: createSupabaseServerClientMock,
}));

import { updateSession } from '@/lib/supabase/session';

describe('updateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('does not refresh Supabase auth while rendering the login page', async () => {
    const response = await updateSession(
      new NextRequest('http://localhost:3000/login')
    );

    expect(response.status).toBe(200);
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it('still redirects protected pages when there is no user', async () => {
    createSupabaseServerClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const response = await updateSession(
      new NextRequest('http://localhost:3000/dashboard')
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login'
    );
  });
});
