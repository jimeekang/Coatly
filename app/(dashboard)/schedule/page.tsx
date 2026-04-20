import type { Metadata } from 'next';
import { getJobs } from '@/app/actions/jobs';
import { listGoogleScheduleEventsForUser } from '@/lib/google-calendar/service';
import type { GoogleScheduleEvent } from '@/lib/google-calendar/types';
import { JOB_STATUS_LABELS, type JobListItem, type JobStatus } from '@/lib/jobs';
import { createServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Schedule' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateRange(
  startDate: string | null,
  endDate: string | null,
  durationDays: number | null,
): string {
  if (!startDate) return 'Date TBD';
  const start = new Date(startDate + 'T00:00:00');
  const format = (d: Date) =>
    d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
  if (!endDate || startDate === endDate) return format(start);
  const end = new Date(endDate + 'T00:00:00');
  const days = durationDays ?? 1;
  return `${format(start)} – ${format(end)} (${days} day${days > 1 ? 's' : ''})`;
}

function getTodayYMD(): string {
  return new Date().toISOString().slice(0, 10);
}

function getMonthBounds(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

const STATUS_STYLES: Record<JobStatus, string> = {
  scheduled: 'bg-pm-teal/10 text-pm-teal border-pm-teal/20',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

function formatGoogleEventDate(event: GoogleScheduleEvent): string {
  if (event.isAllDay && event.startDate) {
    const start = new Date(`${event.startDate}T00:00:00`);
    const format = (date: Date) =>
      date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });

    if (!event.endDate || event.endDate === event.startDate) {
      return format(start);
    }

    const end = new Date(`${event.endDate}T00:00:00`);
    const days =
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${format(start)} – ${format(end)} (${days} day${days > 1 ? 's' : ''})`;
  }

  if (event.startDateTime) {
    const start = new Date(event.startDateTime);
    const end = event.endDateTime ? new Date(event.endDateTime) : null;

    if (!end) {
      return start.toLocaleString('en-AU', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    if (start.toDateString() === end.toDateString()) {
      return `${start.toLocaleDateString('en-AU', {
        month: 'short',
        day: 'numeric',
      })} · ${start.toLocaleTimeString('en-AU', {
        hour: 'numeric',
        minute: '2-digit',
      })} – ${end.toLocaleTimeString('en-AU', {
        hour: 'numeric',
        minute: '2-digit',
      })}`;
    }

    return `${start.toLocaleString('en-AU', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })} – ${end.toLocaleString('en-AU', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }

  return 'Date TBD';
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: JobListItem }) {
  const customerLabel = job.customer.company_name || job.customer.name;
  const dateDisplay = formatDateRange(
    job.start_date ?? job.scheduled_date,
    job.end_date,
    job.duration_days,
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-pm-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {job.quote && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pm-secondary">
              {job.quote.quote_number}
            </p>
          )}
          <h3 className="mt-0.5 text-base font-semibold text-pm-body leading-snug">
            {customerLabel}
          </h3>
          {job.customer.address && (
            <p className="mt-0.5 text-xs text-pm-secondary line-clamp-1">
              {job.customer.address}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${STATUS_STYLES[job.status]}`}
        >
          {JOB_STATUS_LABELS[job.status]}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-pm-surface px-4 py-3">
        <svg
          className="h-4 w-4 shrink-0 text-pm-teal"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
        <span className="text-sm font-medium text-pm-body">{dateDisplay}</span>
      </div>

      {job.notes && (
        <p className="text-sm text-pm-secondary line-clamp-2">{job.notes}</p>
      )}
    </div>
  );
}

function GoogleEventCard({ event }: { event: GoogleScheduleEvent }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-pm-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pm-secondary">
            Google Calendar
          </p>
          <h3 className="mt-0.5 text-base font-semibold leading-snug text-pm-body">
            {event.title}
          </h3>
          {event.location && (
            <p className="mt-0.5 text-xs text-pm-secondary line-clamp-1">{event.location}</p>
          )}
        </div>
        <span className="inline-flex rounded-full border border-pm-teal/20 bg-pm-teal/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-pm-teal">
          {event.isAllDay ? 'All Day' : 'Timed'}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-pm-surface px-4 py-3">
        <svg
          className="h-4 w-4 shrink-0 text-pm-teal"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
        <span className="text-sm font-medium text-pm-body">{formatGoogleEventDate(event)}</span>
      </div>

      {event.htmlLink && (
        <a
          href={event.htmlLink}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-pm-teal hover:underline"
        >
          Open in Google Calendar
        </a>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SchedulePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMaxDate = new Date(now);
  timeMaxDate.setDate(timeMaxDate.getDate() + 120);
  const timeMax = timeMaxDate.toISOString();
  const googleSchedule = await listGoogleScheduleEventsForUser({
    supabase,
    userId: user.id,
    timeMin,
    timeMax,
  });
  const { data: allJobs, error } = await getJobs();
  const today = getTodayYMD();
  const { start: monthStart, end: monthEnd } = getMonthBounds();

  const upcomingJobs = allJobs.filter(
    (job) =>
      (job.status === 'scheduled' || job.status === 'in_progress') &&
      (job.start_date ?? job.scheduled_date) >= today,
  );

  const thisMonthJobs = allJobs.filter((job) => {
    const date = job.start_date ?? job.scheduled_date;
    return date >= monthStart && date <= monthEnd;
  });

  const scheduledThisMonth = thisMonthJobs.filter((j) => j.status === 'scheduled').length;
  const completedThisMonth = thisMonthJobs.filter((j) => j.status === 'completed').length;
  const googleThisMonth = googleSchedule.events.filter((event) => {
    const date = event.startDate ?? event.startDateTime?.slice(0, 10);
    return Boolean(date && date >= monthStart && date <= monthEnd);
  }).length;
  const googleUpcoming = googleSchedule.events.filter((event) => {
    const date = event.startDate ?? event.startDateTime?.slice(0, 10);
    return Boolean(date && date >= today);
  });

  const monthLabel = new Date().toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold text-pm-body">Schedule</h1>
        <p className="mt-1 text-sm text-pm-secondary">
          Upcoming booked jobs and painting dates.
        </p>
      </div>

      {googleSchedule.error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            Google Calendar could not be loaded right now. Showing Coatly jobs instead.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-pm-coral/30 bg-pm-coral-light/40 px-4 py-3">
          <p className="text-sm text-pm-coral-dark">{error}</p>
        </div>
      )}

      {googleSchedule.connected && !googleSchedule.error ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-pm-border bg-white p-5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-pm-secondary">
                Google events — {monthLabel}
              </p>
              <p className="mt-2 text-3xl font-bold text-pm-teal">{googleThisMonth}</p>
              <p className="mt-1 text-sm text-pm-secondary">
                event{googleThisMonth !== 1 ? 's' : ''} this month
              </p>
            </div>
            <div className="rounded-2xl border border-pm-border bg-white p-5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-pm-secondary">
                Upcoming
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{googleUpcoming.length}</p>
              <p className="mt-1 text-sm text-pm-secondary">
                future calendar event{googleUpcoming.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-pm-body">Google Calendar</h2>
              {googleUpcoming.length > 0 && (
                <span className="rounded-full bg-pm-teal/10 px-3 py-1 text-xs font-bold text-pm-teal">
                  {googleUpcoming.length}
                </span>
              )}
            </div>

            {googleUpcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-pm-border bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-base font-semibold text-pm-body">No upcoming Google events.</p>
                <p className="mt-2 text-sm text-pm-secondary">
                  When clients book dates in Coatly, new all-day calendar events will appear here.
                </p>
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {googleUpcoming.map((event) => (
                  <li key={event.id}>
                    <GoogleEventCard event={event} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <>
          {/* Month summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-pm-border bg-white p-5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-pm-secondary">
                Upcoming — {monthLabel}
              </p>
              <p className="mt-2 text-3xl font-bold text-pm-teal">{scheduledThisMonth}</p>
              <p className="mt-1 text-sm text-pm-secondary">
                job{scheduledThisMonth !== 1 ? 's' : ''} scheduled
              </p>
            </div>
            <div className="rounded-2xl border border-pm-border bg-white p-5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-pm-secondary">
                Completed — {monthLabel}
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{completedThisMonth}</p>
              <p className="mt-1 text-sm text-pm-secondary">
                job{completedThisMonth !== 1 ? 's' : ''} done
              </p>
            </div>
          </div>

          {/* Upcoming jobs list */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-pm-body">Upcoming Jobs</h2>
              {upcomingJobs.length > 0 && (
                <span className="rounded-full bg-pm-teal/10 px-3 py-1 text-xs font-bold text-pm-teal">
                  {upcomingJobs.length}
                </span>
              )}
            </div>

            {upcomingJobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-pm-border bg-white px-6 py-12 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pm-surface">
                  <svg
                    className="h-6 w-6 text-pm-secondary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                    />
                  </svg>
                </div>
                <p className="text-base font-semibold text-pm-body">No upcoming jobs.</p>
                <p className="mt-2 text-sm text-pm-secondary">
                  Share your quote link with clients to let them book dates.
                </p>
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {upcomingJobs.map((job) => (
                  <li key={job.id}>
                    <JobCard job={job} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
