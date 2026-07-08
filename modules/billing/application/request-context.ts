import { cache } from 'react';
import {
  getMonthlyActiveQuoteUsageForUser,
  getSubscriptionSnapshotForUser,
} from '@/modules/billing/application/access';
import { createServerClient } from '@/lib/supabase/server';
import { requireCurrentUser } from '@/lib/supabase/request-context';

export const getSubscriptionSnapshotForCurrentUser = cache(async () => {
  const [supabase, user] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
  ]);

  return getSubscriptionSnapshotForUser(supabase, user.id);
});

export const getMonthlyActiveQuoteUsageForCurrentUser = cache(async () => {
  const [supabase, user, snapshot] = await Promise.all([
    createServerClient(),
    requireCurrentUser(),
    getSubscriptionSnapshotForCurrentUser(),
  ]);

  return getMonthlyActiveQuoteUsageForUser(supabase, user.id, snapshot);
});
