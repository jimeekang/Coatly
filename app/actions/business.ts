'use server';

import { redirect } from 'next/navigation';
import { saveBusinessProfileForUser } from '@/lib/businesses';
import type { BusinessUpdateInput } from '@/lib/supabase/validators';
import { createServerClient } from '@/lib/supabase/server';

export async function saveBusinessProfile(
  input: BusinessUpdateInput
): Promise<{ error?: string; success?: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { error } = await saveBusinessProfileForUser({
    supabase,
    user,
    input,
  });

  if (error) {
    return { error };
  }

  return { success: 'Business details saved.' };
}
