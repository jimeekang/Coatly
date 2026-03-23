import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { AppDatabase } from '@/types/app-database';

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient<AppDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — cookies can only be
            // set in middleware or route handlers. Safe to ignore here.
          }
        },
      },
    }
  );
}
