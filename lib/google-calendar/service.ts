import 'server-only';
import { revalidatePath } from 'next/cache';
import { buildQuoteCustomerAddress } from '@/lib/quotes';
import { decryptGoogleRefreshToken, encryptGoogleRefreshToken } from '@/lib/google-calendar/crypto';
import {
  exchangeGoogleCalendarCodeForTokens,
  isGoogleCalendarOAuthConfigured,
  refreshGoogleCalendarAccessToken,
} from '@/lib/google-calendar/oauth';
import type {
  GoogleCalendarEventResource,
  GoogleCalendarIntegrationSummary,
  GoogleCalendarListEntry,
  GoogleScheduleEvent,
} from '@/lib/google-calendar/types';
import type { AppDatabase } from '@/types/app-database';
import type { SupabaseClient, User } from '@supabase/supabase-js';

type AppSupabaseClient = SupabaseClient<AppDatabase>;

type GoogleCalendarConnectionRow =
  AppDatabase['public']['Tables']['google_calendar_connections']['Row'];

type GoogleCalendarSettingsRow =
  AppDatabase['public']['Tables']['google_calendar_settings']['Row'];

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
};

type TokenFetchResult =
  | {
      ok: true;
      accessToken: string;
      connection: GoogleCalendarConnectionRow;
      settings: GoogleCalendarSettingsRow;
    }
  | {
      ok: false;
      error: string;
      connection: GoogleCalendarConnectionRow | null;
      settings: GoogleCalendarSettingsRow;
    };

const DEFAULT_GOOGLE_CALENDAR_SETTINGS: Pick<
  GoogleCalendarSettingsRow,
  | 'display_calendar_id'
  | 'availability_calendar_id'
  | 'event_destination_calendar_id'
  | 'timezone'
> = {
  display_calendar_id: 'primary',
  availability_calendar_id: 'primary',
  event_destination_calendar_id: 'primary',
  timezone: 'Australia/Sydney',
};

function addDaysYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function getSafeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Google Calendar request failed.';
}

function isWritableCalendar(accessRole: string | undefined) {
  return accessRole === 'owner' || accessRole === 'writer';
}

function formatDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Could not format Google Calendar date.');
  }

  return `${year}-${month}-${day}`;
}

function normalizeGoogleEvent(event: GoogleCalendarEventResource): GoogleScheduleEvent | null {
  const startDate = event.start?.date ?? null;
  const endDate = event.end?.date ? addDaysYmd(event.end.date, -1) : null;
  const startDateTime = event.start?.dateTime ?? null;
  const endDateTime = event.end?.dateTime ?? null;

  if (!startDate && !startDateTime) {
    return null;
  }

  return {
    id: event.id,
    title: event.summary?.trim() || 'Busy',
    status: event.status ?? 'confirmed',
    location: event.location?.trim() || null,
    htmlLink: event.htmlLink ?? null,
    isAllDay: Boolean(startDate && !startDateTime),
    startDate,
    endDate,
    startDateTime,
    endDateTime,
  };
}

async function fetchGoogleApi<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`https://www.googleapis.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: { message?: string } }
    | null;

  if (!response.ok || !payload) {
    const errorPayload =
      payload && typeof payload === 'object' && 'error' in payload
        ? (payload as { error?: { message?: string } })
        : null;
    const message = errorPayload?.error?.message ?? 'Google Calendar request failed.';
    throw new Error(message);
  }

  return payload as T;
}

async function getStoredGoogleCalendarState(
  supabase: AppSupabaseClient,
  userId: string
): Promise<{
  connection: GoogleCalendarConnectionRow | null;
  settings: GoogleCalendarSettingsRow;
}> {
  const [connectionResult, settingsResult] = await Promise.all([
    supabase
      .from('google_calendar_connections')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('google_calendar_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const settings = settingsResult.data ?? {
    user_id: userId,
    ...DEFAULT_GOOGLE_CALENDAR_SETTINGS,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };

  return {
    connection: connectionResult.data ?? null,
    settings,
  };
}

async function recordGoogleConnectionStatus(
  supabase: AppSupabaseClient,
  userId: string,
  patch: AppDatabase['public']['Tables']['google_calendar_connections']['Update']
) {
  await supabase
    .from('google_calendar_connections')
    .update(patch)
    .eq('user_id', userId);
}

async function getGoogleCalendarAccessForUser(
  supabase: AppSupabaseClient,
  userId: string
): Promise<TokenFetchResult> {
  const { connection, settings } = await getStoredGoogleCalendarState(supabase, userId);

  if (!connection || !connection.is_active) {
    return {
      ok: false,
      error: 'Google Calendar is not connected.',
      connection,
      settings,
    };
  }

  try {
    const refreshToken = decryptGoogleRefreshToken(connection.encrypted_refresh_token);
    const tokenPayload = await refreshGoogleCalendarAccessToken(refreshToken);

    await recordGoogleConnectionStatus(supabase, userId, {
      last_sync_at: new Date().toISOString(),
      last_sync_error: null,
      granted_scopes: tokenPayload.scope
        ? tokenPayload.scope.split(/\s+/).filter(Boolean)
        : connection.granted_scopes,
      is_active: true,
    });

    return {
      ok: true,
      accessToken: tokenPayload.access_token,
      connection: {
        ...connection,
        last_sync_at: new Date().toISOString(),
        last_sync_error: null,
      },
      settings,
    };
  } catch (error) {
    const message = getSafeErrorMessage(error);

    await recordGoogleConnectionStatus(supabase, userId, {
      is_active: /invalid_grant/i.test(message) ? false : connection.is_active,
      last_sync_error: message,
    });

    return {
      ok: false,
      error: message,
      connection: {
        ...connection,
        is_active: /invalid_grant/i.test(message) ? false : connection.is_active,
        last_sync_error: message,
      },
      settings,
    };
  }
}

async function fetchGoogleUserInfo(accessToken: string) {
  return fetchGoogleApi<GoogleUserInfo>(accessToken, '/oauth2/v3/userinfo');
}

async function fetchGoogleCalendarList(accessToken: string) {
  const payload = await fetchGoogleApi<{ items?: GoogleCalendarListEntry[] }>(
    accessToken,
    '/calendar/v3/users/me/calendarList'
  );

  return (payload.items ?? []).sort((a, b) => {
    if (a.primary) return -1;
    if (b.primary) return 1;
    return a.summary.localeCompare(b.summary);
  });
}

export async function completeGoogleCalendarConnection(input: {
  supabase: AppSupabaseClient;
  user: User;
  code: string;
  redirectUri: string;
}) {
  if (!isGoogleCalendarOAuthConfigured()) {
    throw new Error('Google Calendar integration is not configured on the server.');
  }

  if (!input.user.email) {
    throw new Error('Your Coatly account needs an email address before Google Calendar can connect.');
  }

  const existingState = await getStoredGoogleCalendarState(input.supabase, input.user.id);
  const tokenPayload = await exchangeGoogleCalendarCodeForTokens({
    code: input.code,
    redirectUri: input.redirectUri,
  });
  const userInfo = await fetchGoogleUserInfo(tokenPayload.access_token);

  if (!userInfo.email || userInfo.email.toLowerCase() !== input.user.email.toLowerCase()) {
    throw new Error(
      `Google Calendar must connect to the signed-in Coatly email (${input.user.email}). Connected Google account: ${userInfo.email ?? 'unknown'}.`
    );
  }

  const calendars = await fetchGoogleCalendarList(tokenPayload.access_token);
  const primaryCalendar =
    calendars.find((calendar) => calendar.primary) ?? calendars[0] ?? null;
  const writableCalendar =
    calendars.find((calendar) => isWritableCalendar(calendar.accessRole)) ??
    primaryCalendar;

  const refreshToken =
    tokenPayload.refresh_token ??
    (existingState.connection
      ? decryptGoogleRefreshToken(existingState.connection.encrypted_refresh_token)
      : null);

  if (!refreshToken) {
    throw new Error(
      'Google did not return an offline refresh token. Revoke Coatly access in your Google account and try connecting again.'
    );
  }

  const grantedScopes = tokenPayload.scope?.split(/\s+/).filter(Boolean) ?? [];
  const timezone =
    primaryCalendar?.timeZone ??
    existingState.settings.timezone ??
    DEFAULT_GOOGLE_CALENDAR_SETTINGS.timezone;

  const settingsPayload: AppDatabase['public']['Tables']['google_calendar_settings']['Insert'] = {
    user_id: input.user.id,
    display_calendar_id:
      existingState.settings.display_calendar_id ||
      primaryCalendar?.id ||
      DEFAULT_GOOGLE_CALENDAR_SETTINGS.display_calendar_id,
    availability_calendar_id:
      existingState.settings.availability_calendar_id ||
      primaryCalendar?.id ||
      DEFAULT_GOOGLE_CALENDAR_SETTINGS.availability_calendar_id,
    event_destination_calendar_id:
      existingState.settings.event_destination_calendar_id ||
      writableCalendar?.id ||
      primaryCalendar?.id ||
      DEFAULT_GOOGLE_CALENDAR_SETTINGS.event_destination_calendar_id,
    timezone,
  };

  const { error: connectionError } = await input.supabase
    .from('google_calendar_connections')
    .upsert(
      {
        user_id: input.user.id,
        google_account_email: userInfo.email,
        google_account_subject: userInfo.sub,
        encrypted_refresh_token: encryptGoogleRefreshToken(refreshToken),
        granted_scopes: grantedScopes,
        is_active: true,
        last_sync_at: new Date().toISOString(),
        last_sync_error: null,
      },
      { onConflict: 'user_id' }
    );

  if (connectionError) {
    throw new Error(connectionError.message);
  }

  const { error: settingsError } = await input.supabase
    .from('google_calendar_settings')
    .upsert(settingsPayload, { onConflict: 'user_id' });

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  revalidatePath('/settings');
  revalidatePath('/schedule');
}

export async function disconnectGoogleCalendarForUser(
  supabase: AppSupabaseClient,
  userId: string
) {
  const [connectionResult, settingsResult] = await Promise.all([
    supabase.from('google_calendar_connections').delete().eq('user_id', userId),
    supabase.from('google_calendar_settings').delete().eq('user_id', userId),
  ]);

  const error = connectionResult.error?.message ?? settingsResult.error?.message ?? null;

  if (!error) {
    revalidatePath('/settings');
    revalidatePath('/schedule');
  }

  return { error };
}

export async function getGoogleCalendarIntegrationSummary(
  supabase: AppSupabaseClient,
  userId: string
): Promise<GoogleCalendarIntegrationSummary> {
  if (!isGoogleCalendarOAuthConfigured()) {
    return {
      configured: false,
      connected: false,
      isActive: false,
      accountEmail: null,
      calendars: [],
      displayCalendarId: DEFAULT_GOOGLE_CALENDAR_SETTINGS.display_calendar_id,
      availabilityCalendarId: DEFAULT_GOOGLE_CALENDAR_SETTINGS.availability_calendar_id,
      eventDestinationCalendarId: DEFAULT_GOOGLE_CALENDAR_SETTINGS.event_destination_calendar_id,
      timezone: DEFAULT_GOOGLE_CALENDAR_SETTINGS.timezone,
      lastSyncAt: null,
      lastSyncError: null,
      warning:
        'Google Calendar is not configured on the server yet. Add Google OAuth credentials to enable it.',
    };
  }

  const access = await getGoogleCalendarAccessForUser(supabase, userId);

  if (!access.ok) {
    return {
      configured: true,
      connected: Boolean(access.connection),
      isActive: access.connection?.is_active ?? false,
      accountEmail: access.connection?.google_account_email ?? null,
      calendars: [],
      displayCalendarId: access.settings.display_calendar_id,
      availabilityCalendarId: access.settings.availability_calendar_id,
      eventDestinationCalendarId: access.settings.event_destination_calendar_id,
      timezone: access.settings.timezone,
      lastSyncAt: access.connection?.last_sync_at ?? null,
      lastSyncError: access.connection?.last_sync_error ?? access.error,
      warning: access.connection ? access.error : null,
    };
  }

  try {
    const calendars = await fetchGoogleCalendarList(access.accessToken);

    return {
      configured: true,
      connected: true,
      isActive: true,
      accountEmail: access.connection.google_account_email,
      calendars,
      displayCalendarId: access.settings.display_calendar_id,
      availabilityCalendarId: access.settings.availability_calendar_id,
      eventDestinationCalendarId: access.settings.event_destination_calendar_id,
      timezone: access.settings.timezone,
      lastSyncAt: access.connection.last_sync_at,
      lastSyncError: null,
      warning: null,
    };
  } catch (error) {
    const message = getSafeErrorMessage(error);

    await recordGoogleConnectionStatus(supabase, userId, {
      last_sync_error: message,
    });

    return {
      configured: true,
      connected: true,
      isActive: access.connection.is_active,
      accountEmail: access.connection.google_account_email,
      calendars: [],
      displayCalendarId: access.settings.display_calendar_id,
      availabilityCalendarId: access.settings.availability_calendar_id,
      eventDestinationCalendarId: access.settings.event_destination_calendar_id,
      timezone: access.settings.timezone,
      lastSyncAt: access.connection.last_sync_at,
      lastSyncError: message,
      warning: message,
    };
  }
}

export async function updateGoogleCalendarSettingsForUser(input: {
  supabase: AppSupabaseClient;
  userId: string;
  displayCalendarId: string;
  availabilityCalendarId: string;
  eventDestinationCalendarId: string;
  timezone: string;
}) {
  const access = await getGoogleCalendarAccessForUser(input.supabase, input.userId);

  if (!access.ok) {
    return { error: access.error };
  }

  const calendars = await fetchGoogleCalendarList(access.accessToken);
  const allIds = new Set(calendars.map((calendar) => calendar.id));
  const writableIds = new Set(
    calendars.filter((calendar) => isWritableCalendar(calendar.accessRole)).map((calendar) => calendar.id)
  );

  if (
    !allIds.has(input.displayCalendarId) ||
    !allIds.has(input.availabilityCalendarId) ||
    !allIds.has(input.eventDestinationCalendarId)
  ) {
    return { error: 'Choose calendars from the connected Google account.' };
  }

  if (!writableIds.has(input.eventDestinationCalendarId)) {
    return { error: 'The destination calendar must allow event creation.' };
  }

  const { error } = await input.supabase
    .from('google_calendar_settings')
    .upsert(
      {
        user_id: input.userId,
        display_calendar_id: input.displayCalendarId,
        availability_calendar_id: input.availabilityCalendarId,
        event_destination_calendar_id: input.eventDestinationCalendarId,
        timezone: input.timezone,
      },
      { onConflict: 'user_id' }
    );

  if (!error) {
    revalidatePath('/settings');
    revalidatePath('/schedule');
  }

  return { error: error?.message ?? null };
}

export async function listGoogleScheduleEventsForUser(input: {
  supabase: AppSupabaseClient;
  userId: string;
  timeMin: string;
  timeMax: string;
}) {
  const access = await getGoogleCalendarAccessForUser(input.supabase, input.userId);

  if (!access.ok) {
    return {
      events: [] as GoogleScheduleEvent[],
      error: access.connection ? access.error : null,
      connected: Boolean(access.connection),
    };
  }

  try {
    const path = `/calendar/v3/calendars/${encodeURIComponent(
      access.settings.display_calendar_id
    )}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
      input.timeMin
    )}&timeMax=${encodeURIComponent(input.timeMax)}`;
    const payload = await fetchGoogleApi<{ items?: GoogleCalendarEventResource[] }>(
      access.accessToken,
      path
    );

    return {
      events: (payload.items ?? [])
        .map(normalizeGoogleEvent)
        .filter((event): event is GoogleScheduleEvent => Boolean(event))
        .filter((event) => event.status !== 'cancelled'),
      error: null,
      connected: true,
    };
  } catch (error) {
    return {
      events: [] as GoogleScheduleEvent[],
      error: getSafeErrorMessage(error),
      connected: true,
    };
  }
}

export function expandBusyIntervalsToDates(
  intervals: Array<{ start: string; end: string }>,
  timeZone: string
) {
  const blocked = new Set<string>();

  for (const interval of intervals) {
    const start = new Date(interval.start);
    const end = new Date(new Date(interval.end).getTime() - 1);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      continue;
    }

    let current = formatDateInTimeZone(start, timeZone);
    const finalDate = formatDateInTimeZone(end, timeZone);

    while (current <= finalDate) {
      blocked.add(current);
      current = addDaysYmd(current, 1);
    }
  }

  return [...blocked].sort();
}

export async function getGoogleBusyDatesForUser(input: {
  supabase: AppSupabaseClient;
  userId: string;
  timeMin: string;
  timeMax: string;
}) {
  const access = await getGoogleCalendarAccessForUser(input.supabase, input.userId);

  if (!access.ok) {
    return { blockedDates: [] as string[], error: null };
  }

  try {
    const payload = await fetchGoogleApi<{
      calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
    }>(access.accessToken, '/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: input.timeMin,
        timeMax: input.timeMax,
        timeZone: access.settings.timezone,
        items: [{ id: access.settings.availability_calendar_id }],
      }),
    });

    const busyIntervals =
      payload.calendars?.[access.settings.availability_calendar_id]?.busy ?? [];

    return {
      blockedDates: expandBusyIntervalsToDates(busyIntervals, access.settings.timezone),
      error: null,
    };
  } catch (error) {
    return { blockedDates: [] as string[], error: getSafeErrorMessage(error) };
  }
}

export async function syncBookedJobToGoogleCalendar(input: {
  supabase: AppSupabaseClient;
  userId: string;
  jobId: string;
  quoteId: string;
  quoteNumber: string;
  quoteTitle: string | null;
  customerId: string;
  startDate: string;
  endDate: string;
}) {
  const access = await getGoogleCalendarAccessForUser(input.supabase, input.userId);

  if (!access.ok) {
    return { synced: false, error: null };
  }

  const { data: customer, error: customerError } = await input.supabase
    .from('customers')
    .select('name, company_name, address_line1, address_line2, city, state, postcode')
    .eq('id', input.customerId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (customerError || !customer) {
    const error = customerError?.message ?? 'Customer details were not found.';
    await input.supabase
      .from('jobs')
      .update({
        google_sync_status: 'failed',
        google_sync_error: error,
      })
      .eq('id', input.jobId)
      .eq('user_id', input.userId);

    return { synced: false, error };
  }

  const customerLabel = customer.company_name?.trim() || customer.name.trim();
  const title = input.quoteTitle?.trim() || `Job for ${input.quoteNumber}`;
  const address = buildQuoteCustomerAddress(customer);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    null;

  try {
    const payload = await fetchGoogleApi<{ id: string }>(
      access.accessToken,
      `/calendar/v3/calendars/${encodeURIComponent(
        access.settings.event_destination_calendar_id
      )}/events?sendUpdates=none`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: `${customerLabel} - ${title}`,
          location: address ?? undefined,
          description: [
            `Customer: ${customer.name}`,
            `Company: ${customer.company_name ?? 'N/A'}`,
            `Quote: ${input.quoteNumber}`,
            address ? `Address: ${address}` : null,
            appUrl ? `Coatly quote: ${appUrl}/quotes/${input.quoteId}` : null,
          ]
            .filter(Boolean)
            .join('\n'),
          start: {
            date: input.startDate,
          },
          end: {
            date: addDaysYmd(input.endDate, 1),
          },
        }),
      }
    );

    await input.supabase
      .from('jobs')
      .update({
        google_calendar_event_id: payload.id,
        google_calendar_id: access.settings.event_destination_calendar_id,
        schedule_source: 'google_booking_sync',
        google_sync_status: 'synced',
        google_sync_error: null,
      })
      .eq('id', input.jobId)
      .eq('user_id', input.userId);

    return { synced: true, error: null };
  } catch (error) {
    const message = getSafeErrorMessage(error);

    await input.supabase
      .from('jobs')
      .update({
        schedule_source: 'google_booking_sync',
        google_sync_status: 'failed',
        google_sync_error: message,
      })
      .eq('id', input.jobId)
      .eq('user_id', input.userId);

    return { synced: false, error: message };
  }
}
