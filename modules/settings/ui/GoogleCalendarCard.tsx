'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { FormLabel, formControlClassName } from '@/components/forms/FormField';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { SectionLabel } from '@/components/shared/SectionLabel';
import type { GoogleCalendarIntegrationSummary } from '@/modules/schedule/infrastructure/google-calendar/types';
import type { GoogleCalendarSettingsInput } from '@/lib/supabase/validators';

type UpdateGoogleCalendarSettingsAction = (
  input: GoogleCalendarSettingsInput,
) => Promise<{ error: string | null; success: string | null }>;

type DisconnectGoogleCalendarAction = () => Promise<{
  error: string | null;
  success: string | null;
}>;

function selectClass() {
  return `${formControlClassName} disabled:opacity-50`;
}

export default function GoogleCalendarCard({
  integration,
  canConnectGoogleCalendar,
  errorMessage,
  successMessage,
  updateGoogleCalendarSettingsAction,
  disconnectGoogleCalendarAction,
}: {
  integration: GoogleCalendarIntegrationSummary | null;
  canConnectGoogleCalendar: boolean;
  errorMessage?: string | null;
  successMessage?: string | null;
  updateGoogleCalendarSettingsAction: UpdateGoogleCalendarSettingsAction;
  disconnectGoogleCalendarAction: DisconnectGoogleCalendarAction;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [displayCalendarId, setDisplayCalendarId] = useState(
    integration?.displayCalendarId ?? 'primary'
  );
  const [availabilityCalendarId, setAvailabilityCalendarId] = useState(
    integration?.availabilityCalendarId ?? 'primary'
  );
  const [eventDestinationCalendarId, setEventDestinationCalendarId] = useState(
    integration?.eventDestinationCalendarId ?? 'primary'
  );
  const [timezone, setTimezone] = useState(integration?.timezone ?? 'Australia/Sydney');
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const writableCalendars = useMemo(
    () =>
      (integration?.calendars ?? []).filter(
        (calendar) => calendar.accessRole === 'owner' || calendar.accessRole === 'writer'
      ),
    [integration?.calendars]
  );

  function handleSave() {
    setLocalError(null);
    setLocalSuccess(null);

    startTransition(() => {
      void (async () => {
        const result = await updateGoogleCalendarSettingsAction({
          display_calendar_id: displayCalendarId,
          availability_calendar_id: availabilityCalendarId,
          event_destination_calendar_id: eventDestinationCalendarId,
          timezone,
        });

        if (result.error) {
          setLocalError(result.error);
          return;
        }

        setLocalSuccess(result.success);
        router.refresh();
      })();
    });
  }

  function handleDisconnect() {
    setLocalError(null);
    setLocalSuccess(null);

    startTransition(() => {
      void (async () => {
        const result = await disconnectGoogleCalendarAction();

        if (result.error) {
          setLocalError(result.error);
          return;
        }

        setLocalSuccess(result.success);
        router.refresh();
      })();
    });
  }

  if (!canConnectGoogleCalendar || !integration) {
    return (
      <section className="rounded-2xl border border-outline bg-surface-container-lowest p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-on-surface">Calendar</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              This account will use Coatly&apos;s internal calendar for booking dates and schedule
              checks.
            </p>
          </div>
          <span className="inline-flex min-h-11 items-center rounded-xl border border-outline px-4 text-sm font-medium text-on-surface-variant">
            Internal calendar
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-outline bg-surface-container-lowest p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-on-surface">Google Calendar</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Show your real schedule from Google Calendar and automatically create calendar events
            when a client books dates in Coatly.
          </p>
        </div>

        {integration.configured ? (
          integration.connected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={isPending}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
            >
              {isPending ? 'Disconnecting...' : 'Disconnect'}
            </button>
          ) : (
            <a
              href="/api/integrations/google-calendar/connect?next=/settings"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Connect Google Calendar
            </a>
          )
        ) : (
          <span className="inline-flex min-h-11 items-center rounded-xl border border-outline px-4 text-sm font-medium text-on-surface-variant">
            Server setup required
          </span>
        )}
      </div>

      {(errorMessage || integration.warning || localError) && (
        <ErrorAlert className="mt-5">
          {localError ?? errorMessage ?? integration.warning}
        </ErrorAlert>
      )}

      {(successMessage || localSuccess) && (
        <div className="mt-5 rounded-xl border border-primary/30 bg-success-container/40 px-4 py-3 text-sm text-primary/90">
          {localSuccess ?? successMessage}
        </div>
      )}

      {!integration.configured ? (
        <div className="mt-5 rounded-xl border border-dashed border-outline bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
          Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALENDAR_TOKEN_SECRET`
          on the server, then register the callback URL before connecting.
        </div>
      ) : integration.connected ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-outline bg-surface-container-low px-4 py-3">
              <SectionLabel>Connected account</SectionLabel>
              <p className="mt-1 text-sm font-medium text-on-surface">
                {integration.accountEmail ?? 'Unknown account'}
              </p>
            </div>
            <div className="rounded-xl border border-outline bg-surface-container-low px-4 py-3">
              <SectionLabel>Last sync</SectionLabel>
              <p className="mt-1 text-sm font-medium text-on-surface">
                {integration.lastSyncAt
                  ? new Date(integration.lastSyncAt).toLocaleString('en-AU')
                  : 'Not synced yet'}
              </p>
            </div>
          </div>

          {integration.calendars.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
              Calendar metadata could not be loaded right now. Reconnect if this keeps happening.
            </div>
          ) : (
            <div className="grid gap-4">
              <div>
                <FormLabel htmlFor="google-display-calendar">
                  Schedule display calendar
                </FormLabel>
                <select
                  id="google-display-calendar"
                  value={displayCalendarId}
                  onChange={(event) => setDisplayCalendarId(event.target.value)}
                  disabled={isPending}
                  className={selectClass()}
                >
                  {integration.calendars.map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.summary}
                      {calendar.primary ? ' (Primary)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FormLabel htmlFor="google-availability-calendar">
                  Booking availability calendar
                </FormLabel>
                <select
                  id="google-availability-calendar"
                  value={availabilityCalendarId}
                  onChange={(event) => setAvailabilityCalendarId(event.target.value)}
                  disabled={isPending}
                  className={selectClass()}
                >
                  {integration.calendars.map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.summary}
                      {calendar.primary ? ' (Primary)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FormLabel htmlFor="google-destination-calendar">
                  Booking destination calendar
                </FormLabel>
                <select
                  id="google-destination-calendar"
                  value={eventDestinationCalendarId}
                  onChange={(event) => setEventDestinationCalendarId(event.target.value)}
                  disabled={isPending}
                  className={selectClass()}
                >
                  {writableCalendars.map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.summary}
                      {calendar.primary ? ' (Primary)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FormLabel htmlFor="google-calendar-timezone">Timezone</FormLabel>
                <input
                  id="google-calendar-timezone"
                  type="text"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  disabled={isPending}
                  className={selectClass()}
                  placeholder="Australia/Sydney"
                />
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
              >
                {isPending ? 'Saving...' : 'Save Google Calendar settings'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-outline bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
          Connect the same Google account as your signed-in Coatly email to show schedule data and
          keep bookings synced automatically.
        </div>
      )}
    </section>
  );
}
