/**
 * Demo page for testing ScheduleCalendar → job navigation.
 * Access at /demo/schedule — no auth required.
 */
import { ScheduleCalendar, type CalendarJob, type CalendarGoogleEvent } from '@/components/schedule/ScheduleCalendar';

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

const DEMO_JOBS: CalendarJob[] = [
  {
    id: 'demo-job-1',
    title: 'Interior repaint — lounge & hallway',
    customerName: 'Bright & Co Constructions',
    status: 'scheduled',
    startDate: today,
    endDate: tomorrow,
    scheduleDates: [today, tomorrow],
    scheduledDate: today,
    notes: 'Dulux White on White. Two coats required.',
    address: '12 Collins St, Melbourne VIC 3000',
    quoteNumber: 'Q-0042',
  },
  {
    id: 'demo-job-2',
    title: 'Exterior weatherboard — full house',
    customerName: 'Sandra Nguyen',
    status: 'in_progress',
    startDate: yesterday,
    endDate: today,
    scheduleDates: [yesterday, today],
    scheduledDate: yesterday,
    notes: null,
    address: '88 Burke Rd, Camberwell VIC 3124',
    quoteNumber: null,
  },
  {
    id: 'demo-job-3',
    title: 'Fence & gate touch-up',
    customerName: 'Thornton Homes',
    status: 'completed',
    startDate: nextWeek,
    endDate: nextWeek,
    scheduleDates: [nextWeek],
    scheduledDate: nextWeek,
    notes: null,
    address: '5 Park Lane, Richmond VIC 3121',
    quoteNumber: 'Q-0039',
  },
];

const DEMO_GOOGLE_EVENTS: CalendarGoogleEvent[] = [
  {
    id: 'gcal-1',
    title: 'Paint supplier — pick up order',
    startDate: today,
    endDate: today,
    startDateTime: null,
    endDateTime: null,
    isAllDay: true,
    location: 'Haymes Paint, 210 Main Rd',
    htmlLink: null,
  },
  {
    id: 'gcal-2',
    title: 'Quote walkthrough with client',
    startDate: null,
    endDate: null,
    startDateTime: `${nextWeek}T10:30:00`,
    endDateTime: `${nextWeek}T11:00:00`,
    isAllDay: false,
    location: '88 Burke Rd, Camberwell',
    htmlLink: null,
  },
];

export default function DemoSchedulePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs font-semibold text-amber-700">DEMO MODE — no auth required</p>
        <p className="mt-0.5 text-xs text-amber-600">
          Click a job card to navigate to <code>/jobs?jobId=demo-job-1</code> etc.
        </p>
      </div>

      <ScheduleCalendar
        jobs={DEMO_JOBS}
        googleEvents={DEMO_GOOGLE_EVENTS}
        nativeEvents={[]}
        googleConnected
        googleError={false}
        today={today}
      />
    </div>
  );
}
