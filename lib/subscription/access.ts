import type { PlanId } from '@/config/plans';
import { APP_NAME } from '@/config/constants';

const SYDNEY_TIME_ZONE = 'Australia/Sydney';
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due']);
const ACTIVE_QUOTE_STATUSES = ['draft', 'sent', 'accepted'] as const;
const PROFILE_PLAN_COLUMN = 'subscription_tier';

export const STARTER_ACTIVE_QUOTES_MONTHLY_LIMIT = 10;

export type SubscriptionFeatures = {
  ai: boolean;
  xeroSync: boolean;
  jobCosting: boolean;
  prioritySupport: boolean;
  unlimitedQuotes: boolean;
  activeQuoteLimit: number | null;
};

export type SubscriptionSnapshot = {
  plan: PlanId;
  status: string;
  active: boolean;
  cancelScheduled: boolean;
  features: SubscriptionFeatures;
};

export type QuoteUsageSnapshot = {
  count: number;
  limit: number | null;
  remaining: number | null;
  reached: boolean;
};

type SupabaseLike = {
  from: (table: string) => unknown;
};

type MaybeSingleResult = Promise<{
  data: Record<string, unknown> | null;
  error: { message?: string } | null;
}>;

type MaybeSingleSelect = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => MaybeSingleResult;
    };
  };
};

type CountQuery = {
  select: (
    columns: string,
    options: { count: 'exact'; head: true }
  ) => {
    eq: (column: string, value: string) => {
      in: (column: string, values: readonly string[]) => {
        gte: (column: string, value: string) => {
          lt: (
            column: string,
            value: string
          ) => Promise<{ count: number | null; error: { message?: string } | null }>;
        };
      };
    };
  };
};

function hasMissingProfilesColumn(error: { message?: string } | null, column: string) {
  return error?.message?.includes(`profiles.${column}`) ?? false;
}

function getPlanFeatures(plan: PlanId): SubscriptionFeatures {
  return {
    ai: plan === 'pro',
    xeroSync: plan === 'pro',
    jobCosting: plan === 'pro',
    prioritySupport: plan === 'pro',
    unlimitedQuotes: plan === 'pro',
    activeQuoteLimit: plan === 'starter' ? STARTER_ACTIVE_QUOTES_MONTHLY_LIMIT : null,
  };
}

export function normalizePlanId(value: string | null | undefined): PlanId {
  return value === 'pro' ? 'pro' : 'starter';
}

export function formatPlanName(plan: PlanId) {
  return plan === 'pro' ? 'Pro' : 'Starter';
}

export function buildSubscriptionSnapshot(input?: {
  plan?: string | null;
  status?: string | null;
  cancelScheduled?: boolean;
}): SubscriptionSnapshot {
  const plan = normalizePlanId(input?.plan);
  const status = input?.status ?? 'none';

  return {
    plan,
    status,
    active: ACTIVE_SUBSCRIPTION_STATUSES.has(status),
    cancelScheduled: Boolean(input?.cancelScheduled),
    features: getPlanFeatures(plan),
  };
}

export function getSubscriptionSnapshotFromHeaders(headerStore: Headers): SubscriptionSnapshot {
  const plan = headerStore.get('x-paintmate-subscription-plan');
  const status = headerStore.get('x-paintmate-subscription-status');
  const activeHeader = headerStore.get('x-paintmate-subscription-active');
  const cancelScheduledHeader = headerStore.get(
    'x-paintmate-subscription-cancel-scheduled'
  );
  const snapshot = buildSubscriptionSnapshot({
    plan,
    status,
    cancelScheduled: cancelScheduledHeader === 'true',
  });

  if (activeHeader === 'true' || activeHeader === 'false') {
    snapshot.active = activeHeader === 'true';
  }

  return snapshot;
}

export function hasSubscriptionSnapshotHeaders(headerStore: Headers) {
  return (
    headerStore.has('x-paintmate-subscription-plan') ||
    headerStore.has('x-paintmate-subscription-status')
  );
}

function getSydneyYearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SYDNEY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';

  return {
    year: Number(year),
    month: Number(month),
  };
}

function getSydneyOffset(year: number, month: number) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: SYDNEY_TIME_ZONE,
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(Date.UTC(year, month - 1, 1, 12, 0, 0)));

  const rawOffset = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  return rawOffset.replace('GMT', '');
}

function getSydneyMonthBounds(now = new Date()) {
  const { year, month } = getSydneyYearMonth(now);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const monthLabel = String(month).padStart(2, '0');
  const nextMonthLabel = String(nextMonth).padStart(2, '0');

  return {
    start: new Date(`${year}-${monthLabel}-01T00:00:00${getSydneyOffset(year, month)}`),
    end: new Date(
      `${nextYear}-${nextMonthLabel}-01T00:00:00${getSydneyOffset(nextYear, nextMonth)}`
    ),
  };
}

async function loadProfilePlan(
  supabase: SupabaseLike,
  userId: string
): Promise<string | null> {
  const profilesTable = supabase.from('profiles') as MaybeSingleSelect;
  const profileByUserId = await profilesTable
    .select(PROFILE_PLAN_COLUMN)
    .eq('user_id', userId)
    .maybeSingle();

  if (hasMissingProfilesColumn(profileByUserId.error, PROFILE_PLAN_COLUMN)) {
    return null;
  }

  if (hasMissingProfilesColumn(profileByUserId.error, 'user_id')) {
    const profileById = await profilesTable
      .select(PROFILE_PLAN_COLUMN)
      .eq('id', userId)
      .maybeSingle();

    if (
      hasMissingProfilesColumn(profileById.error, PROFILE_PLAN_COLUMN) ||
      hasMissingProfilesColumn(profileById.error, 'id')
    ) {
      return null;
    }

    if (profileById.error) {
      throw new Error(profileById.error.message ?? 'Failed to load profile plan');
    }

    return profileById.data?.subscription_tier
      ? String(profileById.data.subscription_tier)
      : null;
  }

  if (profileByUserId.error) {
    throw new Error(profileByUserId.error.message ?? 'Failed to load profile plan');
  }

  return profileByUserId.data?.subscription_tier
    ? String(profileByUserId.data.subscription_tier)
    : null;
}

export async function getSubscriptionSnapshotForUser(
  supabase: SupabaseLike,
  userId: string
): Promise<SubscriptionSnapshot> {
  const subscriptionsTable = supabase.from('subscriptions') as MaybeSingleSelect;
  const [subscriptionResult, profilePlan] = await Promise.all([
    subscriptionsTable
      .select('plan, status, cancel_at_period_end')
      .eq('user_id', userId)
      .maybeSingle(),
    loadProfilePlan(supabase, userId),
  ]);

  if (subscriptionResult.error) {
    throw new Error(subscriptionResult.error.message ?? 'Failed to load subscription');
  }

  return buildSubscriptionSnapshot({
    plan:
      (subscriptionResult.data?.plan as string | null | undefined) ?? profilePlan ?? 'starter',
    status: (subscriptionResult.data?.status as string | null | undefined) ?? 'none',
    cancelScheduled: Boolean(subscriptionResult.data?.cancel_at_period_end),
  });
}

export async function getMonthlyActiveQuoteUsageForUser(
  supabase: SupabaseLike,
  userId: string,
  snapshot?: SubscriptionSnapshot
): Promise<QuoteUsageSnapshot> {
  const resolvedSnapshot = snapshot ?? (await getSubscriptionSnapshotForUser(supabase, userId));
  const limit = resolvedSnapshot.features.activeQuoteLimit;

  if (limit === null) {
    return {
      count: 0,
      limit: null,
      remaining: null,
      reached: false,
    };
  }

  const { start, end } = getSydneyMonthBounds();
  const query = (supabase.from('quotes') as CountQuery)
    .select('id', { count: 'exact', head: true });

  const { count, error } = await query
    .eq('user_id', userId)
    .in('status', ACTIVE_QUOTE_STATUSES)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());

  if (error) {
    throw new Error(error.message ?? 'Failed to load active quote usage');
  }

  const used = count ?? 0;

  return {
    count: used,
    limit,
    remaining: Math.max(limit - used, 0),
    reached: used >= limit,
  };
}

export function getProFeatureMessage(featureName: string) {
  return `${featureName} is available on the Pro plan. Upgrade in Settings to unlock it.`;
}

export function getActiveSubscriptionRequiredMessage(actionName = 'this feature') {
  return `Choose a paid plan to unlock ${actionName}. Finish checkout before using ${APP_NAME} tools.`;
}
