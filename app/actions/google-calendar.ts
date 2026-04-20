'use server';

import { redirect } from 'next/navigation';
import {
  disconnectGoogleCalendarForUser,
  updateGoogleCalendarSettingsForUser,
} from '@/lib/google-calendar/service';
import {
  googleCalendarSettingsSchema,
  type GoogleCalendarSettingsInput,
} from '@/lib/supabase/validators';
import { createServerClient } from '@/lib/supabase/server';

export async function updateGoogleCalendarSettingsAction(
  input: GoogleCalendarSettingsInput
): Promise<{ error: string | null; success: string | null }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const parsed = googleCalendarSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Calendar settings are invalid.',
      success: null,
    };
  }

  const result = await updateGoogleCalendarSettingsForUser({
    supabase,
    userId: user.id,
    displayCalendarId: parsed.data.display_calendar_id,
    availabilityCalendarId: parsed.data.availability_calendar_id,
    eventDestinationCalendarId: parsed.data.event_destination_calendar_id,
    timezone: parsed.data.timezone,
  });

  if (result.error) {
    return { error: result.error, success: null };
  }

  return { error: null, success: 'Google Calendar settings saved.' };
}

export async function disconnectGoogleCalendarAction(): Promise<{
  error: string | null;
  success: string | null;
}> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const result = await disconnectGoogleCalendarForUser(supabase, user.id);

  if (result.error) {
    return { error: result.error, success: null };
  }

  return { error: null, success: 'Google Calendar disconnected.' };
}
