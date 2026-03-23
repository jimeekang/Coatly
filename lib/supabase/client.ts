import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { AppDatabase } from '@/types/app-database';

export function createBrowserClient() {
  return createSupabaseBrowserClient<AppDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
