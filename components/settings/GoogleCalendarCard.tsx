'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import {
  disconnectGoogleCalendarAction,
  updateGoogleCalendarSettingsAction,
} from '@/app/actions/google-calendar';
import type { GoogleCalendarIntegrationSummary } from '@/lib/google-calendar/types';

const inputBase =
  'w-full rounded-xl border border-pm-border bg-white px-4 text-sm text-pm-body transition-colors focus:border-pm-teal-mid focus:outline-none focus:ring-2 focus:ring-pm-teal-pale/30 disabled:opacity-50';

function selectClass() {
  return `${inputBase} h-12`;
}

export default function GoogleCalendarCard({
  integration,
  errorMessage,
  successMessage,
}: {
  integration: GoogleCalendarIntegrationSummary;
  errorMessage?: string | null;
  successMessage?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [displayCalendarId, setDisplayCalendarId] = useState(integration.displayCalendarId);
  const [availabilityCalendarId, setAvailabilityCalendarId] = useState(
    integration.availabilityCalendarId
  );
  const [eventDestinationCalendarId, setEventDestinationCalendarId] = useState(
    integration.eventDestinationCalendarId
  );
  const [timezone, setTimezone] = useState(integration.timezone);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const writableCalendars = useMemo(
    () =>
      integration.calendars.filter(
        (calendar) => calendar.accessRole === 'owner' || calendar.accessRole === 'writer'
      ),
    [integration.calendars]
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

  return (
    <section className="rounded-2xl border border-pm-border bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-pm-body">Google Calendar</h3>
          <p className="mt-1 text-sm text-pm-secondary">
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
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-pm-border px-4 py-2.5 text-sm font-semibold text-pm-body transition-colors hover:bg-pm-surface disabled:opacity-60"
            >
              {isPending ? 'Disconnecting...' : 'Disconnect'}
            </button>
          ) : (
            <a
              href="/api/integrations/google-calendar/connect?next=/settings"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-pm-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover"
            >
              Connect Google Calendar
            </a>
          )
        ) : (
          <span className="inline-flex min-h-11 items-center rounded-xl border border-pm-border px-4 text-sm font-medium text-pm-secondary">
            Server setup required
          </span>
        )}
      </div>

      {(errorMessage || integration.warning || localError) && (
        <div className="mt-5 rounded-xl border border-pm-coral/30 bg-pm-coral-light/40 px-4 py-3 text-sm text-pm-coral-dark">
          {localError ?? errorMessage ?? integration.warning}
        </div>
      )}

      {(successMessage || localSuccess) && (
        <div className="mt-5 rounded-xl border border-pm-teal/30 bg-pm-teal-light/40 px-4 py-3 text-sm text-pm-teal-hover">
          {localSuccess ?? successMessage}
        </div>
      )}

      {!integration.configured ? (
        <div className="mt-5 rounded-xl border border-dashed border-pm-border bg-pm-surface px-4 py-4 text-sm text-pm-secondary">
          Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALENDAR_TOKEN_SECRET`
          on the server, then register the callback URL before connecting.
        </div>
      ) : integration.connected ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-pm-border bg-pm-surface px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pm-secondary">
                Connected account
              </p>
              <p className="mt-1 text-sm font-medium text-pm-body">
                {integration.accountEmail ?? 'Unknown account'}
              </p>
            </div>
            <div className="rounded-xl border border-pm-border bg-pm-surface px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pm-secondary">
                Last sync
              </p>
              <p className="mt-1 text-sm font-medium text-pm-body">
                {integration.lastSyncAt
                  ? new Date(integration.lastSyncAt).toLocaleString('en-AU')
                  : 'Not synced yet'}
              </p>
            </div>
          </div>

          {integration.calendars.length === 0 ? (
            <div className="rounded-xl border border-dashed border-pm-border bg-pm-surface px-4 py-4 text-sm text-pm-secondary">
              Calendar metadata could not be loaded right now. Reconnect if this keeps happening.
            </div>
          ) : (
            <div className="grid gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-pm-body">
                  Schedule display calendar
                </label>
                <select
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
                <label className="mb-1.5 block text-sm font-medium text-pm-body">
                  Booking availability calendar
                </label>
                <select
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
                <label className="mb-1.5 block text-sm font-medium text-pm-body">
                  Booking destination calendar
                </label>
                <select
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
                <label className="mb-1.5 block text-sm font-medium text-pm-body">Timezone</label>
                <input
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
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-pm-teal px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-pm-teal-hover disabled:opacity-60"
              >
                {isPending ? 'Saving...' : 'Save Google Calendar settings'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-pm-border bg-pm-surface px-4 py-4 text-sm text-pm-secondary">
          Connect the same Google account as your signed-in Coatly email to show schedule data and
          keep bookings synced automatically.
        </div>
      )}
    </section>
  );
}
