import type { Metadata } from 'next';
import { getJobs } from '@/app/actions/jobs';
import { getScheduleEvents } from '@/app/actions/schedule';
import { listGoogleScheduleEventsForUser } from '@/lib/google-calendar/service';
import { createServerClient } from '@/lib/supabase/server';
import {
  ScheduleCalendar,
  type CalendarJob,
  type CalendarGoogleEvent,
} from '@/components/schedule/ScheduleCalendar';

export const metadata: Metadata = { title: 'Schedule' };

type ScheduleSearchParams = {
  view?: string;
  source?: string;
  status?: string;
  search?: string;
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams?: Promise<ScheduleSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const dateFrom = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    .toISOString()
    .slice(0, 10);
  const dateTo = new Date(now.getFullYear(), now.getMonth() + 5, 0)
    .toISOString()
    .slice(0, 10);
  const timeMin = new Date(dateFrom + 'T00:00:00').toISOString();
  const timeMax = new Date(dateTo + 'T23:59:59').toISOString();

  const [googleSchedule, { data: allJobs }, { data: nativeEvents }] = await Promise.all([
    listGoogleScheduleEventsForUser({ supabase, userId: user.id, timeMin, timeMax }),
    getJobs(),
    getScheduleEvents(dateFrom, dateTo),
  ]);
  const calendarJobs: CalendarJob[] = allJobs.map((job) => ({
    id: job.id,
    title: job.title,
    customerName: job.customer.company_name ?? job.customer.name,
    status: job.status,
    startDate: job.start_date,
    endDate: job.end_date,
    scheduleDates: job.schedule_dates,
    scheduledDate: job.scheduled_date,
    notes: job.notes,
    address: job.customer.address,
    quoteNumber: job.quote?.quote_number ?? null,
  }));

  const calendarGoogleEvents: CalendarGoogleEvent[] = googleSchedule.events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    startDate: ev.startDate,
    endDate: ev.endDate,
    startDateTime: ev.startDateTime,
    endDateTime: ev.endDateTime,
    isAllDay: ev.isAllDay,
    location: ev.location,
    htmlLink: ev.htmlLink,
  }));

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <div>
        <h1 className="text-2xl font-bold text-pm-body sm:text-[28px]">Schedule & Jobs</h1>
        <p className="mt-1 text-sm text-pm-secondary">
          Switch between calendar planning and the job list without leaving the schedule.
        </p>
      </div>

      <ScheduleCalendar
        jobs={calendarJobs}
        googleEvents={calendarGoogleEvents}
        nativeEvents={nativeEvents}
        googleConnected={googleSchedule.connected}
        googleError={Boolean(googleSchedule.error)}
        today={today}
        initialView={params.view}
        initialSource={params.source}
        initialStatus={params.status}
        initialSearch={params.search}
      />
    </div>
  );
}
