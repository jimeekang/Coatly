'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GripHorizontal,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  addJobScheduleDay,
  deleteJobScheduleDay,
  updateJobSchedule,
  updateJobScheduleDay,
} from '@/app/actions/jobs';
import {
  createScheduleEvent,
  deleteScheduleEvent,
  updateScheduleEvent,
  type ScheduleEvent,
  type ScheduleEventInput,
} from '@/app/actions/schedule';
import { useToast } from '@/components/ui/toast';
import { JOB_STATUS_LABELS, type JobStatus } from '@/lib/jobs';

export type CalendarJob = {
  id: string;
  title: string;
  customerName: string;
  status: JobStatus;
  startDate: string | null;
  endDate: string | null;
  scheduleDates: string[];
  scheduledDate: string;
  notes: string | null;
  address: string | null;
  quoteNumber: string | null;
};

export type CalendarGoogleEvent = {
  id: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  startDateTime: string | null;
  endDateTime: string | null;
  isAllDay: boolean;
  location: string | null;
  htmlLink: string | null;
};

type DayEvent =
  | { kind: 'job'; job: CalendarJob; date: string }
  | { kind: 'google'; event: CalendarGoogleEvent }
  | { kind: 'native'; event: ScheduleEvent };

type UnifiedEvent =
  | ({
      kind: 'job';
      job: CalendarJob;
    } & UnifiedEventBase)
  | ({
      kind: 'google';
      event: CalendarGoogleEvent;
    } & UnifiedEventBase)
  | ({
      kind: 'native';
      event: ScheduleEvent;
    } & UnifiedEventBase);

type UnifiedEventBase = {
  id: string;
  title: string;
  subtitle: string;
  start: string;
  end: string;
  searchable: string;
};

type DragPayload =
  | { kind: 'job'; id: string; date: string }
  | { kind: 'native'; id: string };

type ViewMode = 'calendar' | 'list';
type SourceFilter = 'all' | 'jobs' | 'schedule' | 'google';
type StatusFilter = 'all' | JobStatus;

const DATE_SHORT_FORMATTER = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
});

const DATE_LONG_FORMATTER = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'UTC',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'UTC',
  month: 'long',
  year: 'numeric',
});

const SYDNEY_TIME_FORMATTER = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Sydney',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const STATUS_BADGE: Record<JobStatus, string> = {
  scheduled: 'border-pm-teal/20 bg-pm-teal/10 text-pm-teal',
  in_progress: 'border-amber-200 bg-amber-50 text-amber-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
};

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(dateValue: string, days: number): string {
  const [year, month, day] = dateValue.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function parseYmdUtc(date: string): Date {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day));
}

function getInclusiveDayCount(start: string, end: string): number {
  const startMs = new Date(`${start}T00:00:00Z`).getTime();
  const endMs = new Date(`${end}T00:00:00Z`).getTime();
  return Math.max(1, Math.floor((endMs - startMs) / 86_400_000) + 1);
}

function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  let cur = start;
  while (cur <= end) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}

function sortUniqueDates(dates: string[]): string[] {
  return [...new Set(dates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))].sort();
}

function formatDate(date: string): string {
  return DATE_SHORT_FORMATTER.format(parseYmdUtc(date));
}

function formatDateRange(start: string, end: string): string {
  return start === end ? formatDate(start) : `${formatDate(start)} - ${formatDate(end)}`;
}

function isContinuousDateRange(dates: string[]): boolean {
  const sorted = sortUniqueDates(dates);
  if (sorted.length <= 1) return true;

  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] !== addDays(sorted[index - 1], 1)) {
      return false;
    }
  }

  return true;
}

function describeScheduleDates(dates: string[]): { dateLabel: string; countLabel: string } {
  const sorted = sortUniqueDates(dates);
  const count = sorted.length;
  const countLabel = `${count} scheduled day${count === 1 ? '' : 's'}`;

  if (count === 0) {
    return { dateLabel: 'No scheduled dates', countLabel: '0 scheduled days' };
  }

  if (isContinuousDateRange(sorted)) {
    return {
      dateLabel: formatDateRange(sorted[0], sorted[sorted.length - 1]),
      countLabel: `${count} day${count === 1 ? '' : 's'}`,
    };
  }

  const preview = sorted.slice(0, 3).map(formatDate).join(', ');
  const hiddenCount = Math.max(0, count - 3);

  return {
    dateLabel: hiddenCount > 0 ? `${preview} +${hiddenCount} more` : preview,
    countLabel,
  };
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const hour = h % 12 || 12;
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function formatIsoTime(iso: string): string {
  const hasTimeZone = /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(iso);
  if (!hasTimeZone) {
    const match = iso.match(/T(\d{2}):(\d{2})/);
    if (match) {
      return formatTime(`${match[1]}:${match[2]}`);
    }
  }

  return SYDNEY_TIME_FORMATTER.format(new Date(iso));
}

function googleEventRange(ev: CalendarGoogleEvent): { start: string; end: string } | null {
  if (ev.isAllDay && ev.startDate) {
    let end = ev.endDate ?? ev.startDate;
    end = addDays(end, -1);
    if (end < ev.startDate) end = ev.startDate;
    return { start: ev.startDate, end };
  }

  if (ev.startDateTime) {
    const start = ev.startDateTime.slice(0, 10);
    return { start, end: ev.endDateTime?.slice(0, 10) ?? start };
  }

  return null;
}

function buildUnifiedEvents(
  jobs: CalendarJob[],
  googleEvents: CalendarGoogleEvent[],
  nativeEvents: ScheduleEvent[],
): UnifiedEvent[] {
  const jobEvents = jobs.map((job): UnifiedEvent => {
    const dates = sortUniqueDates(job.scheduleDates.length > 0 ? job.scheduleDates : [
      ...getDateRange(job.startDate ?? job.scheduledDate, job.endDate ?? job.startDate ?? job.scheduledDate),
    ]);
    const start = dates[0] ?? job.startDate ?? job.scheduledDate;
    const end = dates[dates.length - 1] ?? job.endDate ?? start;
    return {
      kind: 'job',
      job,
      id: `job-${job.id}`,
      title: job.customerName,
      subtitle: [job.title, job.quoteNumber, job.address].filter(Boolean).join(' '),
      start,
      end,
      searchable: [
        job.customerName,
        job.title,
        job.quoteNumber,
        job.address,
        job.notes,
        JOB_STATUS_LABELS[job.status],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    };
  });

  const calendarEvents = googleEvents.flatMap((event): UnifiedEvent[] => {
    const range = googleEventRange(event);
    if (!range) return [];
    return [
      {
        kind: 'google',
        event,
        id: `google-${event.id}`,
        title: event.title,
        subtitle: event.location ?? 'Google Calendar',
        start: range.start,
        end: range.end,
        searchable: [event.title, event.location, 'google calendar'].filter(Boolean).join(' ').toLowerCase(),
      },
    ];
  });

  const scheduleEvents = nativeEvents.map((event): UnifiedEvent => ({
    kind: 'native',
    event,
    id: `schedule-${event.id}`,
    title: event.title,
    subtitle: event.location ?? event.notes ?? 'My Schedule',
    start: event.date,
    end: event.date,
    searchable: [event.title, event.location, event.notes, 'my schedule'].filter(Boolean).join(' ').toLowerCase(),
  }));

  return [...jobEvents, ...scheduleEvents, ...calendarEvents].sort((a, b) => {
    if (a.start !== b.start) return a.start.localeCompare(b.start);
    return a.title.localeCompare(b.title);
  });
}

function buildEventMap(events: UnifiedEvent[]): Map<string, DayEvent[]> {
  const map = new Map<string, DayEvent[]>();
  const add = (date: string, ev: DayEvent) => {
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(ev);
  };

  for (const ev of events) {
    const dates =
      ev.kind === 'job'
        ? sortUniqueDates(
            ev.job.scheduleDates.length > 0
              ? ev.job.scheduleDates
              : getDateRange(ev.start, ev.end),
          )
        : getDateRange(ev.start, ev.end);

    for (const date of dates) {
      if (ev.kind === 'job') add(date, { kind: 'job', job: ev.job, date });
      if (ev.kind === 'google') add(date, { kind: 'google', event: ev.event });
      if (ev.kind === 'native') add(date, { kind: 'native', event: ev.event });
    }
  }

  return map;
}

type EventFormState = {
  title: string;
  date: string;
  isAllDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
};

function emptyForm(defaultDate?: string): EventFormState {
  return {
    title: '',
    date: defaultDate ?? '',
    isAllDay: true,
    startTime: '',
    endTime: '',
    location: '',
    notes: '',
  };
}

function eventToForm(ev: ScheduleEvent): EventFormState {
  return {
    title: ev.title,
    date: ev.date,
    isAllDay: ev.isAllDay,
    startTime: ev.startTime ?? '',
    endTime: ev.endTime ?? '',
    location: ev.location ?? '',
    notes: ev.notes ?? '',
  };
}

function EventModal({
  editing,
  defaultDate,
  onClose,
}: {
  editing: ScheduleEvent | null;
  defaultDate: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [form, setForm] = useState<EventFormState>(
    editing ? eventToForm(editing) : emptyForm(defaultDate),
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!form.date) {
      setError('Date is required');
      return;
    }
    setError(null);

    const input: ScheduleEventInput = {
      title: form.title,
      date: form.date,
      isAllDay: form.isAllDay,
      startTime: form.isAllDay ? null : form.startTime || null,
      endTime: form.isAllDay ? null : form.endTime || null,
      location: form.location || null,
      notes: form.notes || null,
    };

    startTransition(() => {
      void (async () => {
        const result = editing
          ? await updateScheduleEvent(editing.id, input)
          : await createScheduleEvent(input);
        if (result.error) {
          setError(result.error);
          toast.error(result.error);
          return;
        }
        toast.success(editing ? 'Event updated.' : 'Event added.');
        router.refresh();
        onClose();
      })();
    });
  }

  function handleDelete() {
    if (!editing) return;
    startDeleteTransition(() => {
      void (async () => {
        const result = await deleteScheduleEvent(editing.id);
        if (result.error) {
          setError(result.error);
          toast.error(result.error);
          return;
        }
        toast.success('Event deleted.');
        router.refresh();
        onClose();
      })();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
        <ModalHeader title={editing ? 'Edit Event' : 'Add Event'} onClose={onClose} />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Title">
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
              placeholder="e.g. Site inspection"
              className="h-11 rounded-xl border border-pm-border bg-white px-3 text-sm text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
              autoFocus
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))}
              className="h-11 rounded-xl border border-pm-border bg-white px-3 text-sm text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
            />
          </Field>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-pm-body">
            <input
              type="checkbox"
              checked={form.isAllDay}
              onChange={(e) => setForm((c) => ({ ...c, isAllDay: e.target.checked }))}
              className="h-5 w-5 rounded border-pm-border accent-pm-teal"
            />
            All day
          </label>
          {!form.isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start time">
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((c) => ({ ...c, startTime: e.target.value }))}
                  className="h-11 rounded-xl border border-pm-border bg-white px-3 text-sm text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
                />
              </Field>
              <Field label="End time">
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((c) => ({ ...c, endTime: e.target.value }))}
                  className="h-11 rounded-xl border border-pm-border bg-white px-3 text-sm text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
                />
              </Field>
            </div>
          )}
          <Field label="Location">
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))}
              placeholder="Optional"
              className="h-11 rounded-xl border border-pm-border bg-white px-3 text-sm text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
              rows={3}
              placeholder="Optional"
              className="rounded-xl border border-pm-border bg-white px-3 py-2.5 text-sm text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
            />
          </Field>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="flex items-center gap-3 pt-1">
            {editing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
                aria-label="Delete event"
                title="Delete event"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 flex-1 items-center justify-center rounded-xl border border-pm-border text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex h-11 flex-1 items-center justify-center rounded-xl bg-pm-teal text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : editing ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JobScheduleModal({
  job,
  onClose,
}: {
  job: CalendarJob;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [isManagingDays, startManageDaysTransition] = useTransition();
  const initialStart = job.startDate ?? job.scheduledDate;
  const initialEnd = job.endDate ?? initialStart;
  const initialDates = sortUniqueDates(
    job.scheduleDates.length > 0 ? job.scheduleDates : getDateRange(initialStart, initialEnd),
  );
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [scheduledDates, setScheduledDates] = useState<string[]>(initialDates);
  const [addDate, setAddDate] = useState(
    addDays(initialDates[initialDates.length - 1] ?? initialEnd, 1),
  );
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function syncRangeFromDates(nextDates: string[]) {
    const sortedDates = sortUniqueDates(nextDates);
    const nextStart = sortedDates[0] ?? initialStart;
    const nextEnd = sortedDates[sortedDates.length - 1] ?? nextStart;
    setStartDate(nextStart);
    setEndDate(nextEnd);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(() => {
      void (async () => {
        const result = await updateJobSchedule(job.id, { startDate, endDate });
        if (result.error) {
          setError(result.error);
          toast.error(result.error);
          return;
        }
        toast.success(`Saved ${getInclusiveDayCount(startDate, endDate)}-day range for ${job.customerName}.`);
        router.refresh();
        onClose();
      })();
    });
  }

  function handleAddDay() {
    if (!addDate) {
      setError('Choose a date to add.');
      return;
    }

    setError(null);
    setActiveDate(addDate);
    startManageDaysTransition(() => {
      void (async () => {
        const result = await addJobScheduleDay(job.id, { date: addDate });
        if (result.error) {
          setError(result.error);
          toast.error(result.error);
          setActiveDate(null);
          return;
        }

        const nextDates = sortUniqueDates([...scheduledDates, addDate]);
        setScheduledDates(nextDates);
        syncRangeFromDates(nextDates);
        setAddDate(addDays(nextDates[nextDates.length - 1] ?? addDate, 1));
        setActiveDate(null);
        toast.success(`Added ${formatDate(addDate)} to ${job.customerName}.`);
        router.refresh();
      })();
    });
  }

  function handleDeleteDay(date: string) {
    setError(null);
    setActiveDate(date);
    startManageDaysTransition(() => {
      void (async () => {
        const result = await deleteJobScheduleDay(job.id, { date });
        if (result.error) {
          setError(result.error);
          toast.error(result.error);
          setActiveDate(null);
          return;
        }

        const nextDates = scheduledDates.filter((scheduledDate) => scheduledDate !== date);
        setScheduledDates(nextDates);
        syncRangeFromDates(nextDates);
        if (addDate === date) {
          setAddDate(addDays(nextDates[nextDates.length - 1] ?? initialEnd, 1));
        }
        setActiveDate(null);
        toast.success(`Removed ${formatDate(date)} from ${job.customerName}.`);
        router.refresh();
      })();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
        <ModalHeader title="Edit Job Schedule" onClose={onClose} />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="rounded-xl border border-pm-border bg-pm-surface/40 p-4">
            <p className="text-sm font-semibold text-pm-body">{job.customerName}</p>
            <p className="mt-1 text-xs text-pm-secondary">{job.title}</p>
          </div>
          <div className="rounded-xl border border-pm-border bg-white p-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-pm-body">Scheduled days</p>
              <p className="text-xs text-pm-secondary">
                Drag on the calendar to move one day, or manage the exact dates here.
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {scheduledDates.map((date) => (
                <div
                  key={date}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-pm-border bg-pm-surface/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-pm-body">{formatDate(date)}</p>
                    <p className="text-xs text-pm-secondary">{date}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDay(date)}
                    disabled={isManagingDays}
                    className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {activeDate === date ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-pm-border bg-white p-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-pm-body">Add a day</p>
              <p className="text-xs text-pm-secondary">
                Pick one extra date to add to this job.
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                className="h-11 flex-1 rounded-xl border border-pm-border bg-white px-3 text-sm text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
              />
              <button
                type="button"
                onClick={handleAddDay}
                disabled={isManagingDays}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-pm-teal px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {activeDate === addDate ? 'Adding...' : 'Add day'}
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-pm-border bg-white p-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-pm-body">Reset as date range</p>
              <p className="text-xs text-pm-secondary">
                Save a continuous range if you want to rebuild the schedule from start to end.
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Start date">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    setStartDate(nextStart);
                    if (endDate < nextStart) setEndDate(nextStart);
                  }}
                  className="h-11 rounded-xl border border-pm-border bg-white px-3 text-sm text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
                />
              </Field>
              <Field label="End date">
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11 rounded-xl border border-pm-border bg-white px-3 text-sm text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
                />
              </Field>
            </div>
            <p className="mt-3 text-xs text-pm-secondary">
              {getInclusiveDayCount(startDate, endDate)} day range
            </p>
          </div>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 flex-1 items-center justify-center rounded-xl border border-pm-border text-sm font-medium text-pm-body transition-colors hover:bg-pm-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex h-11 flex-1 items-center justify-center rounded-xl bg-pm-teal text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save range'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h2 className="text-lg font-bold text-pm-body">{title}</h2>
      <button
        onClick={onClose}
        className="flex h-10 w-10 items-center justify-center rounded-full text-pm-secondary transition-colors hover:bg-pm-surface"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-pm-body">
      {label}
      {children}
    </label>
  );
}

function JobEventCard({
  job,
  dragDate,
  onEditSchedule,
}: {
  job: CalendarJob;
  dragDate?: string | null;
  onEditSchedule: (job: CalendarJob) => void;
}) {
  const scheduleDates = sortUniqueDates(
    job.scheduleDates.length > 0
      ? job.scheduleDates
      : getDateRange(job.startDate ?? job.scheduledDate, job.endDate ?? job.startDate ?? job.scheduledDate),
  );
  const dragPayload = dragDate ? ({ kind: 'job', id: job.id, date: dragDate } satisfies DragPayload) : null;
  const scheduleSummary = describeScheduleDates(scheduleDates);

  return (
    <div
      draggable={Boolean(dragPayload)}
      onDragStart={(e) => {
        if (!dragPayload) return;
        e.dataTransfer.setData('application/json', JSON.stringify(dragPayload));
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`flex flex-col gap-3 rounded-2xl border border-pm-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
        dragPayload ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {job.quoteNumber && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pm-secondary">
              {job.quoteNumber}
            </p>
          )}
          <p className="text-sm font-semibold text-pm-body">{job.customerName}</p>
          {job.title && <p className="line-clamp-1 text-xs text-pm-secondary">{job.title}</p>}
          {job.address && <p className="line-clamp-1 text-xs text-pm-secondary">{job.address}</p>}
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_BADGE[job.status]}`}
        >
          {JOB_STATUS_LABELS[job.status]}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-pm-secondary">
        <span>{scheduleSummary.dateLabel}</span>
        <span>{scheduleSummary.countLabel}</span>
      </div>
      {job.notes && <p className="line-clamp-2 text-xs text-pm-secondary">{job.notes}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onEditSchedule(job)}
          className="flex h-10 items-center gap-1.5 rounded-xl border border-pm-border px-3 text-xs font-semibold text-pm-body transition-colors hover:bg-pm-surface"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit dates
        </button>
        <Link
          href={`/jobs?jobId=${job.id}`}
          className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-pm-teal transition-colors hover:bg-pm-teal/5"
        >
          View job
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        {dragPayload && <GripHorizontal className="ml-auto h-4 w-4 text-pm-secondary" aria-label="Drag to move" />}
      </div>
    </div>
  );
}

function GoogleEventCard({ event }: { event: CalendarGoogleEvent }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-500">
            Google Calendar
          </p>
          <p className="text-sm font-semibold text-pm-body">{event.title}</p>
          {event.location && <p className="line-clamp-1 text-xs text-pm-secondary">{event.location}</p>}
          {!event.isAllDay && event.startDateTime && (
            <p className="text-xs text-pm-secondary">
              {formatIsoTime(event.startDateTime)}
              {event.endDateTime ? ` - ${formatIsoTime(event.endDateTime)}` : ''}
            </p>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-600">
          {event.isAllDay ? 'All Day' : 'Timed'}
        </span>
      </div>
      {event.htmlLink && (
        <a
          href={event.htmlLink}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
        >
          Open in Google Calendar
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function NativeEventCard({
  event,
  onEdit,
}: {
  event: ScheduleEvent;
  onEdit: (ev: ScheduleEvent) => void;
}) {
  const payload: DragPayload = { kind: 'native', id: event.id };

  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify(payload));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onEdit(event)}
      className="flex w-full flex-col gap-2 rounded-2xl border border-violet-100 bg-violet-50/40 p-4 text-left shadow-sm transition-shadow hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-500">
            Event
          </p>
          <p className="text-sm font-semibold text-pm-body">{event.title}</p>
          {event.location && <p className="line-clamp-1 text-xs text-pm-secondary">{event.location}</p>}
          {!event.isAllDay && event.startTime && (
            <p className="text-xs text-pm-secondary">
              {formatTime(event.startTime)}
              {event.endTime ? ` - ${formatTime(event.endTime)}` : ''}
            </p>
          )}
          {event.notes && <p className="mt-1 line-clamp-2 text-xs text-pm-secondary">{event.notes}</p>}
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-600">
          {event.isAllDay ? 'All Day' : 'Timed'}
        </span>
      </div>
      <span className="flex items-center gap-1.5 text-[10px] font-medium text-violet-500">
        Tap to edit
        <GripHorizontal className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

type Props = {
  jobs: CalendarJob[];
  googleEvents: CalendarGoogleEvent[];
  nativeEvents: ScheduleEvent[];
  googleConnected: boolean;
  googleError: boolean;
  today?: string;
};

export function ScheduleCalendar({
  jobs,
  googleEvents,
  nativeEvents,
  googleConnected,
  googleError,
  today,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const resolvedToday = today ?? new Date().toISOString().slice(0, 10);
  const [year, setYear] = useState(() => Number(resolvedToday.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(resolvedToday.slice(5, 7)) - 1);
  const [selected, setSelected] = useState<string | null>(resolvedToday);
  const [view, setView] = useState<ViewMode>('calendar');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [editingJob, setEditingJob] = useState<CalendarJob | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);
  const [isMoving, startMoveTransition] = useTransition();

  const unifiedEvents = useMemo(
    () => buildUnifiedEvents(jobs, googleEvents, nativeEvents),
    [jobs, googleEvents, nativeEvents],
  );

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return unifiedEvents.filter((event) => {
      if (sourceFilter === 'jobs' && event.kind !== 'job') return false;
      if (sourceFilter === 'schedule' && event.kind !== 'native') return false;
      if (sourceFilter === 'google' && event.kind !== 'google') return false;
      if (statusFilter !== 'all' && (event.kind !== 'job' || event.job.status !== statusFilter)) {
        return false;
      }
      if (query && !event.searchable.includes(query)) return false;
      return true;
    });
  }, [searchQuery, sourceFilter, statusFilter, unifiedEvents]);

  const eventMap = useMemo(() => buildEventMap(filteredEvents), [filteredEvents]);

  const calendarDays = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const slots: (string | null)[] = [];
    for (let i = 0; i < firstDow; i++) slots.push(null);
    for (let d = 1; d <= daysInMonth; d++) slots.push(ymd(year, month, d));
    while (slots.length % 7 !== 0) slots.push(null);
    return slots;
  }, [year, month]);

  const monthLabel = MONTH_YEAR_FORMATTER.format(new Date(Date.UTC(year, month, 1)));

  const selectedEvents = selected ? (eventMap.get(selected) ?? []) : [];
  const selectedLabel = selected
    ? DATE_LONG_FORMATTER.format(parseYmdUtc(selected))
    : null;

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
    setSelected(null);
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelected(null);
  }

  function openAddEvent(date = selected ?? resolvedToday) {
    setEditingEvent(null);
    setSelected(date);
    setModalOpen(true);
  }

  function openEditEvent(ev: ScheduleEvent) {
    setEditingEvent(ev);
    setModalOpen(true);
  }

  function handleDrop(date: string, data: string) {
    setDragError(null);
    let payload: DragPayload;
    try {
      payload = JSON.parse(data) as DragPayload;
    } catch {
      return;
    }

    if (payload.kind === 'job' && payload.date === date) {
      toast.info('That scheduled day is already on this date.');
      return;
    }

    if (payload.kind === 'native') {
      const event = nativeEvents.find((item) => item.id === payload.id);
      if (event?.date === date) {
        toast.info('That event is already on this date.');
        return;
      }
    }

    startMoveTransition(() => {
      void (async () => {
        const result =
          payload.kind === 'job'
            ? await updateJobScheduleDay(payload.id, {
                fromDate: payload.date,
                toDate: date,
              })
            : await moveNativeEvent(payload.id, date, nativeEvents);

        if (result.error) {
          setDragError(result.error);
          toast.error(result.error);
          return;
        }
        setSelected(date);
        toast.success(getMoveSuccessMessage(payload, date, jobs, nativeEvents));
        router.refresh();
      })();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-pm-border bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pm-secondary" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs, customers, addresses..."
              className="h-11 w-full rounded-xl border border-pm-border bg-white pl-9 pr-3 text-sm text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <SegmentButton active={view === 'calendar'} onClick={() => setView('calendar')}>
              <CalendarDays className="h-4 w-4" />
              Calendar
            </SegmentButton>
            <SegmentButton active={view === 'list'} onClick={() => setView('list')}>
              <List className="h-4 w-4" />
              List
            </SegmentButton>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['all', 'jobs', 'schedule', 'google'] as SourceFilter[]).map((source) => (
              <FilterButton
                key={source}
                active={sourceFilter === source}
                onClick={() => setSourceFilter(source)}
              >
                {source === 'all' ? 'All' : source === 'jobs' ? 'Jobs' : source === 'schedule' ? 'Event' : 'Google'}
              </FilterButton>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['all', 'scheduled', 'in_progress', 'completed', 'cancelled'] as StatusFilter[]).map((status) => (
              <FilterButton
                key={status}
                active={statusFilter === status}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'All jobs' : JOB_STATUS_LABELS[status]}
              </FilterButton>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-pm-surface"
        >
          <ChevronLeft className="h-5 w-5 text-pm-secondary" />
        </button>
        <h2 className="text-lg font-bold text-pm-body">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAddEvent()}
            className="flex h-11 items-center gap-1.5 rounded-full bg-pm-teal px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
          <button
            onClick={nextMonth}
            aria-label="Next month"
            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-pm-surface"
          >
            <ChevronRight className="h-5 w-5 text-pm-secondary" />
          </button>
        </div>
      </div>

      {googleError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            Google Calendar could not be loaded. Showing Coatly jobs and events only.
          </p>
        </div>
      )}
      {dragError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm text-rose-700">{dragError}</p>
        </div>
      )}
      {isMoving && (
        <div className="rounded-xl border border-pm-border bg-pm-surface px-4 py-3">
          <p className="text-sm text-pm-secondary">Updating schedule...</p>
        </div>
      )}

      {view === 'calendar' ? (
        <>
          <CalendarGrid
            calendarDays={calendarDays}
            eventMap={eventMap}
            todayStr={resolvedToday}
            selected={selected}
            onSelect={(date) => setSelected(selected === date ? null : date)}
            onAdd={openAddEvent}
            onDrop={handleDrop}
          />
          <Legend googleConnected={googleConnected} />
          {selected && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-pm-body">{selectedLabel}</h3>
                <button
                  onClick={() => openAddEvent(selected)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-pm-border px-3 text-xs font-semibold text-pm-secondary transition-colors hover:bg-pm-surface"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <EventStack
                events={selectedEvents}
                emptyText="No matching jobs or events on this day."
                onEditEvent={openEditEvent}
                onEditJob={setEditingJob}
              />
            </section>
          )}
        </>
      ) : (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-pm-secondary">
            {filteredEvents.length} result{filteredEvents.length === 1 ? '' : 's'}
          </p>
          {filteredEvents.length === 0 ? (
            <EmptyState onAdd={() => openAddEvent()} />
          ) : (
            <ul className="flex flex-col gap-3">
              {filteredEvents.map((event) => (
                <li key={event.id}>
                  <div className="mb-2 text-xs font-medium text-pm-secondary">
                    {formatDateRange(event.start, event.end)}
                  </div>
                  {event.kind === 'job' ? (
                    <JobEventCard job={event.job} onEditSchedule={setEditingJob} />
                  ) : event.kind === 'google' ? (
                    <GoogleEventCard event={event.event} />
                  ) : (
                    <NativeEventCard event={event.event} onEdit={openEditEvent} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {modalOpen && (
        <EventModal
          editing={editingEvent}
          defaultDate={selected ?? resolvedToday}
          onClose={() => setModalOpen(false)}
        />
      )}
      {editingJob && <JobScheduleModal job={editingJob} onClose={() => setEditingJob(null)} />}
    </div>
  );
}

async function moveNativeEvent(
  id: string,
  date: string,
  nativeEvents: ScheduleEvent[],
): Promise<{ error: string | null }> {
  const event = nativeEvents.find((item) => item.id === id);
  if (!event) return { error: 'Event not found.' };
  return updateScheduleEvent(id, {
    title: event.title,
    date,
    isAllDay: event.isAllDay,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    notes: event.notes,
  });
}

function getMoveSuccessMessage(
  payload: DragPayload,
  date: string,
  jobs: CalendarJob[],
  nativeEvents: ScheduleEvent[],
): string {
  if (payload.kind === 'job') {
    const job = jobs.find((item) => item.id === payload.id);
    return job
      ? `Moved ${job.customerName} to ${formatDate(date)}.`
      : `Moved job day to ${formatDate(date)}.`;
  }

  const event = nativeEvents.find((item) => item.id === payload.id);
  return event
    ? `Moved ${event.title} to ${formatDate(date)}.`
    : `Moved event to ${formatDate(date)}.`;
}

function getDragPayload(event: DayEvent): DragPayload | null {
  if (event.kind === 'job') {
    return { kind: 'job', id: event.job.id, date: event.date };
  }

  if (event.kind === 'native') {
    return { kind: 'native', id: event.event.id };
  }

  return null;
}

function getChipLabel(event: DayEvent): string {
  if (event.kind === 'job') return event.job.customerName;
  if (event.kind === 'native') return event.event.title;
  return event.event.title;
}

function getChipClassName(event: DayEvent): string {
  if (event.kind === 'job') {
    const color = {
      scheduled: 'border-pm-teal/30 bg-pm-teal/10 text-pm-teal',
      in_progress: 'border-amber-200 bg-amber-50 text-amber-700',
      completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
    } satisfies Record<JobStatus, string>;

    return color[event.job.status];
  }

  if (event.kind === 'native') {
    return 'border-violet-200 bg-violet-50 text-violet-700';
  }

  return 'border-blue-200 bg-blue-50 text-blue-700';
}

function CalendarEventChip({
  event,
  onSelect,
}: {
  event: DayEvent;
  onSelect: () => void;
}) {
  const payload = getDragPayload(event);
  const draggable = Boolean(payload);

  return (
    <button
      type="button"
      draggable={draggable}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDragStart={(e) => {
        if (!payload) return;
        e.stopPropagation();
        e.dataTransfer.setData('application/json', JSON.stringify(payload));
        e.dataTransfer.effectAllowed = 'move';
      }}
      title={getChipLabel(event)}
      className={`flex h-5 w-full min-w-0 cursor-grab items-center rounded border px-1 text-left text-[10px] font-semibold leading-none shadow-sm active:cursor-grabbing ${getChipClassName(
        event,
      )} ${draggable ? '' : 'cursor-default'}`}
    >
      <span className="truncate">{getChipLabel(event)}</span>
    </button>
  );
}

function CalendarGrid({
  calendarDays,
  eventMap,
  todayStr,
  selected,
  onSelect,
  onAdd,
  onDrop,
}: {
  calendarDays: (string | null)[];
  eventMap: Map<string, DayEvent[]>;
  todayStr: string;
  selected: string | null;
  onSelect: (date: string) => void;
  onAdd: (date: string) => void;
  onDrop: (date: string, data: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-pm-border bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-pm-border bg-pm-surface">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase text-pm-secondary">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {calendarDays.map((dateStr, i) => {
          if (!dateStr) {
            return (
              <div
                key={`pad-${i}`}
                className="min-h-[64px] border-b border-r border-pm-border/40 bg-pm-surface/20 last:border-r-0"
              />
            );
          }

          const dayEvents = eventMap.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selected;
          const visibleEvents = dayEvents.slice(0, 3);
          const hiddenCount = Math.max(0, dayEvents.length - visibleEvents.length);
          const dayNum = parseInt(dateStr.slice(8), 10);

          return (
            <div
              key={dateStr}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(dateStr, e.dataTransfer.getData('application/json'));
              }}
              className={`group relative min-h-[104px] border-b border-r border-pm-border/40 last:border-r-0 sm:min-h-[118px] ${
                isSelected ? 'bg-pm-teal/5 ring-1 ring-inset ring-pm-teal/30' : 'hover:bg-pm-surface/50'
              }`}
            >
              <button
                onClick={() => onSelect(dateStr)}
                className="flex h-8 w-full items-center justify-center px-1 pt-1.5"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday ? 'bg-pm-teal text-white' : isSelected ? 'text-pm-teal' : 'text-pm-body'
                  }`}
                >
                  {dayNum}
                </span>
              </button>
              <div className="flex flex-col gap-1 px-1 pb-8 pt-1">
                {visibleEvents.map((event, index) => (
                  <CalendarEventChip
                    key={`${event.kind}-${getChipLabel(event)}-${index}`}
                    event={event}
                    onSelect={() => onSelect(dateStr)}
                  />
                ))}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelect(dateStr)}
                    className="h-5 rounded border border-pm-border bg-white px-1 text-left text-[10px] font-semibold leading-none text-pm-secondary"
                  >
                    +{hiddenCount} more
                  </button>
                )}
              </div>
              <button
                onClick={() => onAdd(dateStr)}
                className="absolute bottom-1 right-1 hidden h-7 w-7 items-center justify-center rounded-full bg-white text-pm-secondary shadow-sm ring-1 ring-pm-border transition-colors hover:text-pm-teal group-hover:flex"
                aria-label="Add schedule on this day"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventStack({
  events,
  emptyText,
  onEditEvent,
  onEditJob,
}: {
  events: DayEvent[];
  emptyText: string;
  onEditEvent: (event: ScheduleEvent) => void;
  onEditJob: (job: CalendarJob) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-pm-border bg-white px-6 py-8 text-center">
        <p className="text-sm text-pm-secondary">{emptyText}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {events.map((e, i) =>
        e.kind === 'job' ? (
          <li key={`j-${e.job.id}-${i}`}>
            <JobEventCard job={e.job} dragDate={e.date} onEditSchedule={onEditJob} />
          </li>
        ) : e.kind === 'google' ? (
          <li key={`g-${e.event.id}-${i}`}>
            <GoogleEventCard event={e.event} />
          </li>
        ) : (
          <li key={`n-${e.event.id}-${i}`}>
            <NativeEventCard event={e.event} onEdit={onEditEvent} />
          </li>
        ),
      )}
    </ul>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-pm-border bg-white px-6 py-8 text-center">
      <p className="text-sm text-pm-secondary">No matching jobs or events.</p>
      <button onClick={onAdd} className="mt-3 text-sm font-medium text-pm-teal hover:underline">
        Add an event
      </button>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors ${
        active
          ? 'border-pm-teal bg-pm-teal/10 text-pm-teal'
          : 'border-pm-border bg-white text-pm-secondary hover:bg-pm-surface'
      }`}
    >
      {children}
    </button>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors ${
        active
          ? 'border-pm-teal bg-pm-teal/10 text-pm-teal'
          : 'border-pm-border bg-white text-pm-secondary hover:bg-pm-surface'
      }`}
    >
      {children}
    </button>
  );
}

function Legend({ googleConnected }: { googleConnected: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 px-1">
      <LegendDot color="bg-pm-teal" label="Scheduled" />
      <LegendDot color="bg-amber-400" label="In Progress" />
      <LegendDot color="bg-emerald-500" label="Completed" />
      <LegendDot color="bg-rose-400" label="Cancelled" />
      <LegendDot color="bg-violet-500" label="Event" />
      {googleConnected && <LegendDot color="bg-blue-500" label="Google Calendar" />}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-xs text-pm-secondary">{label}</span>
    </div>
  );
}
