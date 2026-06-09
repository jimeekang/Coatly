'use server';

import { getBusinessRateSettings, saveBusinessRateSettings } from '@/modules/settings/domain/businesses';
import { parseUserRateSettings } from '@/modules/price-rates/domain/rate-settings';
import type { UserRateSettings } from '@/modules/price-rates/domain/rate-settings';
import { requireCurrentUser } from '@/lib/supabase/request-context';
import { createServerClient } from '@/lib/supabase/server';

export async function getRateSettingsAction(): Promise<{
  data: UserRateSettings | null;
  error: string | null;
}> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: 'Not authenticated' };

  return getBusinessRateSettings(supabase, user.id);
}

export async function updateRateSettingsAction(rawRates: unknown): Promise<{
  error: string | null;
}> {
  const [supabase, user] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
  ]);

  const rates = parseUserRateSettings(rawRates);

  return saveBusinessRateSettings(supabase, user.id, rates);
}
