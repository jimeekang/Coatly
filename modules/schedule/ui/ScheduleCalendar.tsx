'use client';

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';
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
  createScheduleEvent,
  deleteScheduleEvent,
  updateScheduleEvent,
  type ScheduleEvent,
  type ScheduleEventInput,
} from '@/modules/schedule/application/actions';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useToast } from '@/components/ui/toast';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import {
  formControlClassName,
  formTextareaClassName,
} from '@/components/forms/FormField';
import { JOB_STATUS_TONE } from '@/lib/constants/status-colors';
import { cn } from '@/lib/utils';
import type { JobStatus } from '@/modules/jobs/domain/jobs';

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

type JobStatusLabels = Record<JobStatus, string>;

// Job actions live in the jobs module. They are injected as props so this
// schedule UI never imports another module's runtime code (DDD boundary).
type UpdateJobScheduleAction = (
  id: string,
  input: { startDate: string; endDate: string }
) => Promise<{ error: string | null }>;

type AddJobScheduleDayAction = (
  id: string,
  input: { date: string }
) => Promise<{ error: string | null }>;

type DeleteJobScheduleDayAction = (
  id: string,
  input: { date: string }
) => Promise<{ error: string | null }>;

type UpdateJobScheduleDayAction = (
  id: string,
  input: { fromDate: string; toDate: string }
) => Promise<{ error: string | null }>;

function isViewMode(value: string | undefined): value is ViewMode {
  return value === 'calendar' || value === 'list';
}

function isSourceFilter(value: string | undefined): value is SourceFilter {
  return (
    value === 'all' ||
    value === 'jobs' ||
    value === 'schedule' ||
    value === 'google'
  );
}

function isStatusFilter(value: string | undefined): value is StatusFilter {
  return (
    value === 'all' ||
    value === 'scheduled' ||
    value === 'in_progress' ||
    value === 'completed' ||
    value === 'cancelled'
  );
}

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

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TABLET_AGENDA_VIEW_QUERY = '(max-width: 1023px)';

function subscribeToTabletAgendaViewport(
  onStoreChange: () => void
): () => void {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => {};
  }

  const mediaQuery = window.matchMedia(TABLET_AGENDA_VIEW_QUERY);
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onStoreChange);
    return () => mediaQuery.removeEventListener('change', onStoreChange);
  }

  mediaQuery.addListener(onStoreChange);
  return () => mediaQuery.removeListener(onStoreChange);
}

function getTabletAgendaViewportSnapshot(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }

  return window.matchMedia(TABLET_AGENDA_VIEW_QUERY).matches;
}

function getServerScheduleViewportSnapshot(): boolean {
  return false;
}

function useTabletAgendaViewport(): boolean {
  return useSyncExternalStore(
    subscribeToTabletAgendaViewport,
    getTabletAgendaViewportSnapshot,
    getServerScheduleViewportSnapshot
  );
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(dateValue: string, days: number): string {
  const [year, month, day] = dateValue.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

function parseYmdUtc(date: string): Date {
  const [year, month, day] = date.split('-').map(Number) as [
    number,
    number,
    number,
  ];
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
  return [
    ...new Set(dates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))),
  ].sort();
}

function formatDate(date: string): string {
  return DATE_SHORT_FORMATTER.format(parseYmdUtc(date));
}

function formatDateRange(start: string, end: string): string {
  return start === end
    ? formatDate(start)
    : `${formatDate(start)} - ${formatDate(end)}`;
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

function describeScheduleDates(dates: string[]): {
  dateLabel: string;
  countLabel: string;
} {
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

function isNextNavigationSignal(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('digest' in error)) {
    return false;
  }

  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND'))
  );
}

function getActionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

function getSourceFilterLabel(source: SourceFilter): string {
  if (source === 'all') return 'All sources';
  if (source === 'jobs') return 'Jobs';
  if (source === 'schedule') return 'My events';
  return 'Google Calendar';
}

function getStatusFilterLabel(
  status: StatusFilter,
  jobStatusLabels: JobStatusLabels
): string {
  return status === 'all' ? 'All job status' : jobStatusLabels[status];
}

function googleEventRange(
  ev: CalendarGoogleEvent
): { start: string; end: string } | null {
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
  jobStatusLabels: JobStatusLabels
): UnifiedEvent[] {
  const jobEvents = jobs.map((job): UnifiedEvent => {
    const dates = sortUniqueDates(
      job.scheduleDates.length > 0
        ? job.scheduleDates
        : [
            ...getDateRange(
              job.startDate ?? job.scheduledDate,
              job.endDate ?? job.startDate ?? job.scheduledDate
            ),
          ]
    );
    const start = dates[0] ?? job.startDate ?? job.scheduledDate;
    const end = dates[dates.length - 1] ?? job.endDate ?? start;
    return {
      kind: 'job',
      job,
      id: `job-${job.id}`,
      title: job.customerName,
      subtitle: [job.title, job.quoteNumber, job.address]
        .filter(Boolean)
        .join(' '),
      start,
      end,
      searchable: [
        job.customerName,
        job.title,
        job.quoteNumber,
        job.address,
        job.notes,
        jobStatusLabels[job.status],
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
        searchable: [event.title, event.location, 'google calendar']
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      },
    ];
  });

  const scheduleEvents = nativeEvents.map(
    (event): UnifiedEvent => ({
      kind: 'native',
      event,
      id: `schedule-${event.id}`,
      title: event.title,
      subtitle: event.location ?? event.notes ?? 'My Schedule',
      start: event.date,
      end: event.date,
      searchable: [event.title, event.location, event.notes, 'my schedule']
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    })
  );

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
              : getDateRange(ev.start, ev.end)
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
    editing ? eventToForm(editing) : emptyForm(defaultDate)
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

    startTransition(async () => {
      try {
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
      } catch (actionError) {
        if (isNextNavigationSignal(actionError)) throw actionError;
        const message = getActionErrorMessage(
          actionError,
          'Event could not be saved. Please try again.'
        );
        setError(message);
        toast.error(message);
      }
    });
  }

  function handleDelete() {
    if (!editing) return;
    startDeleteTransition(async () => {
      try {
        const result = await deleteScheduleEvent(editing.id);
        if (result.error) {
          setError(result.error);
          toast.error(result.error);
          return;
        }
        toast.success('Event deleted.');
        router.refresh();
        onClose();
      } catch (actionError) {
        if (isNextNavigationSignal(actionError)) throw actionError;
        const message = getActionErrorMessage(
          actionError,
          'Event could not be deleted. Please try again.'
        );
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit Event' : 'Add Event'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
            placeholder="e.g. Site inspection"
            className={formControlClassName}
          />
        </Field>
        <Field label="Date">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))}
            className={formControlClassName}
          />
        </Field>
        <label className="text-on-surface flex min-h-11 items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.isAllDay}
            onChange={(e) =>
              setForm((c) => ({ ...c, isAllDay: e.target.checked }))
            }
            className="border-outline accent-primary h-5 w-5 rounded"
          />
          All day
        </label>
        {!form.isAllDay && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time">
              <input
                type="time"
                value={form.startTime}
                onChange={(e) =>
                  setForm((c) => ({ ...c, startTime: e.target.value }))
                }
                className={formControlClassName}
              />
            </Field>
            <Field label="End time">
              <input
                type="time"
                value={form.endTime}
                onChange={(e) =>
                  setForm((c) => ({ ...c, endTime: e.target.value }))
                }
                className={formControlClassName}
              />
            </Field>
          </div>
        )}
        <Field label="Location">
          <input
            type="text"
            value={form.location}
            onChange={(e) =>
              setForm((c) => ({ ...c, location: e.target.value }))
            }
            placeholder="Optional"
            className={formControlClassName}
          />
        </Field>
        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
            rows={3}
            placeholder="Optional"
            className={formTextareaClassName}
          />
        </Field>
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <div className="flex items-center gap-3 pt-1">
          {editing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="focus-visible:ring-error/20 border-error/30 text-error hover:bg-error-container flex h-11 w-11 items-center justify-center rounded-xl border transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
              aria-label="Delete event"
              title="Delete event"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="border-outline-variant focus-visible:ring-primary/20 text-on-surface hover:bg-surface-container-low flex h-11 flex-1 items-center justify-center rounded-xl border text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="focus-visible:ring-primary/20 bg-primary text-on-primary flex h-11 flex-1 items-center justify-center rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
          >
            {isPending ? 'Saving...' : editing ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function JobScheduleModal({
  job,
  onClose,
  updateJobSchedule,
  addJobScheduleDay,
  deleteJobScheduleDay,
}: {
  job: CalendarJob;
  onClose: () => void;
  updateJobSchedule: UpdateJobScheduleAction;
  addJobScheduleDay: AddJobScheduleDayAction;
  deleteJobScheduleDay: DeleteJobScheduleDayAction;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [isManagingDays, startManageDaysTransition] = useTransition();
  const initialStart = job.startDate ?? job.scheduledDate;
  const initialEnd = job.endDate ?? initialStart;
  const initialDates = sortUniqueDates(
    job.scheduleDates.length > 0
      ? job.scheduleDates
      : getDateRange(initialStart, initialEnd)
  );
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [scheduledDates, setScheduledDates] = useState<string[]>(initialDates);
  const [addDate, setAddDate] = useState(
    addDays(initialDates[initialDates.length - 1] ?? initialEnd, 1)
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
    startTransition(async () => {
      try {
        const result = await updateJobSchedule(job.id, { startDate, endDate });
        if (result.error) {
          setError(result.error);
          toast.error(result.error);
          return;
        }
        toast.success(
          `Saved ${getInclusiveDayCount(startDate, endDate)}-day range for ${job.customerName}.`
        );
        router.refresh();
        onClose();
      } catch (actionError) {
        if (isNextNavigationSignal(actionError)) throw actionError;
        const message = getActionErrorMessage(
          actionError,
          'Job schedule could not be saved. Please try again.'
        );
        setError(message);
        toast.error(message);
      }
    });
  }

  function handleAddDay() {
    if (!addDate) {
      setError('Choose a date to add.');
      return;
    }

    setError(null);
    setActiveDate(addDate);
    startManageDaysTransition(async () => {
      try {
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
      } catch (actionError) {
        if (isNextNavigationSignal(actionError)) throw actionError;
        const message = getActionErrorMessage(
          actionError,
          'Job day could not be added. Please try again.'
        );
        setError(message);
        toast.error(message);
        setActiveDate(null);
      }
    });
  }

  function handleDeleteDay(date: string) {
    setError(null);
    setActiveDate(date);
    startManageDaysTransition(async () => {
      try {
        const result = await deleteJobScheduleDay(job.id, { date });
        if (result.error) {
          setError(result.error);
          toast.error(result.error);
          setActiveDate(null);
          return;
        }

        const nextDates = scheduledDates.filter(
          (scheduledDate) => scheduledDate !== date
        );
        setScheduledDates(nextDates);
        syncRangeFromDates(nextDates);
        if (addDate === date) {
          setAddDate(addDays(nextDates[nextDates.length - 1] ?? initialEnd, 1));
        }
        setActiveDate(null);
        toast.success(`Removed ${formatDate(date)} from ${job.customerName}.`);
        router.refresh();
      } catch (actionError) {
        if (isNextNavigationSignal(actionError)) throw actionError;
        const message = getActionErrorMessage(
          actionError,
          'Job day could not be deleted. Please try again.'
        );
        setError(message);
        toast.error(message);
        setActiveDate(null);
      }
    });
  }

  return (
    <Modal open onClose={onClose} title="Edit Job Schedule" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="border-outline-variant bg-surface-container-low/40 rounded-2xl border p-4">
          <p className="text-on-surface text-sm font-semibold">
            {job.customerName}
          </p>
          <p className="text-on-surface-variant mt-1 text-xs">{job.title}</p>
        </div>
        <div className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4">
          <div className="flex flex-col gap-1">
            <p className="text-on-surface text-sm font-semibold">
              Scheduled days
            </p>
            <p className="text-on-surface-variant text-xs">
              Drag on the calendar to move one day, or manage the exact dates
              here.
            </p>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {scheduledDates.map((date) => (
              <div
                key={date}
                className="border-outline-variant bg-surface-container-low/30 flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-on-surface text-sm font-medium">
                    {formatDate(date)}
                  </p>
                  <p className="text-on-surface-variant text-xs">{date}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteDay(date)}
                  disabled={isManagingDays}
                  className="focus-visible:ring-error/20 border-error/30 text-error hover:bg-error-container inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {activeDate === date ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4">
          <div className="flex flex-col gap-1">
            <p className="text-on-surface text-sm font-semibold">Add a day</p>
            <p className="text-on-surface-variant text-xs">
              Pick one extra date to add to this job.
            </p>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="date"
              aria-label="Date to add"
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
              className={cn(formControlClassName, 'flex-1')}
            />
            <button
              type="button"
              onClick={handleAddDay}
              disabled={isManagingDays}
              className="focus-visible:ring-primary/20 bg-primary text-on-primary inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {activeDate === addDate ? 'Adding...' : 'Add day'}
            </button>
          </div>
        </div>
        <div className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-4">
          <div className="flex flex-col gap-1">
            <p className="text-on-surface text-sm font-semibold">
              Reset as date range
            </p>
            <p className="text-on-surface-variant text-xs">
              Save a continuous range if you want to rebuild the schedule from
              start to end.
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
                className={formControlClassName}
              />
            </Field>
            <Field label="End date">
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={formControlClassName}
              />
            </Field>
          </div>
          <p className="text-on-surface-variant mt-3 text-xs">
            {getInclusiveDayCount(startDate, endDate)} day range
          </p>
        </div>
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="border-outline-variant focus-visible:ring-primary/20 text-on-surface hover:bg-surface-container-low flex h-11 flex-1 items-center justify-center rounded-xl border text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="focus-visible:ring-primary/20 bg-primary text-on-primary flex h-11 flex-1 items-center justify-center rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save range'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-on-surface flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function JobEventCard({
  job,
  dragDate,
  onEditSchedule,
  jobStatusLabels,
}: {
  job: CalendarJob;
  dragDate?: string | null;
  onEditSchedule: (job: CalendarJob) => void;
  jobStatusLabels: JobStatusLabels;
}) {
  const scheduleDates = sortUniqueDates(
    job.scheduleDates.length > 0
      ? job.scheduleDates
      : getDateRange(
          job.startDate ?? job.scheduledDate,
          job.endDate ?? job.startDate ?? job.scheduledDate
        )
  );
  const dragPayload = dragDate
    ? ({ kind: 'job', id: job.id, date: dragDate } satisfies DragPayload)
    : null;
  const scheduleSummary = describeScheduleDates(scheduleDates);

  return (
    <div
      draggable={Boolean(dragPayload)}
      onDragStart={(e) => {
        if (!dragPayload) return;
        e.dataTransfer.setData('application/json', JSON.stringify(dragPayload));
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`border-outline-variant bg-surface-container-lowest flex flex-col gap-2 rounded-2xl border p-3 shadow-sm transition-shadow hover:shadow-md sm:gap-3 sm:p-4 ${
        dragPayload ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {job.quoteNumber && (
            <p className="text-on-surface-variant text-[10px] font-semibold uppercase">
              {job.quoteNumber}
            </p>
          )}
          <p className="text-on-surface truncate text-sm font-semibold">
            {job.customerName}
          </p>
          {job.title && (
            <p className="text-on-surface-variant line-clamp-1 text-xs">
              {job.title}
            </p>
          )}
          {job.address && (
            <p className="text-on-surface-variant line-clamp-1 text-xs">
              {job.address}
            </p>
          )}
        </div>
        <StatusBadge
          tone={JOB_STATUS_TONE[job.status]}
          label={jobStatusLabels[job.status]}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="bg-surface-container-low text-on-surface-variant max-w-full truncate rounded-full px-2.5 py-1 text-[11px] font-medium sm:text-xs">
          {scheduleSummary.dateLabel}
        </span>
        <span className="bg-surface-container-low text-on-surface-variant rounded-full px-2.5 py-1 text-[11px] font-medium sm:text-xs">
          {scheduleSummary.countLabel}
        </span>
      </div>
      {job.notes && (
        <p className="text-on-surface-variant line-clamp-2 text-xs">
          {job.notes}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => onEditSchedule(job)}
          className="border-outline-variant focus-visible:ring-primary/20 text-on-surface hover:bg-surface-container-low flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit dates
        </button>
        <Link
          href={`/jobs/${job.id}`}
          className="focus-visible:ring-primary/20 border-primary/15 text-primary hover:bg-primary/5 flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          View job
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        {dragPayload && (
          <span className="bg-surface-container-low text-on-surface-variant inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-medium sm:ml-auto sm:bg-transparent sm:px-0 sm:py-0">
            <GripHorizontal className="h-4 w-4" aria-label="Drag to move" />
            Drag day
          </span>
        )}
      </div>
    </div>
  );
}

function GoogleEventCard({ event }: { event: CalendarGoogleEvent }) {
  return (
    <div className="border-secondary/20 bg-secondary-container/30 flex flex-col gap-2 rounded-2xl border p-3 shadow-sm sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-secondary text-[10px] font-semibold uppercase">
            Google Calendar
          </p>
          <p className="text-on-surface truncate text-sm font-semibold">
            {event.title}
          </p>
          {event.location && (
            <p className="text-on-surface-variant line-clamp-1 text-xs">
              {event.location}
            </p>
          )}
          {!event.isAllDay && event.startDateTime && (
            <p className="text-on-surface-variant text-xs">
              {formatIsoTime(event.startDateTime)}
              {event.endDateTime
                ? ` - ${formatIsoTime(event.endDateTime)}`
                : ''}
            </p>
          )}
        </div>
        <span className="border-secondary/20 bg-secondary-container text-secondary inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase">
          {event.isAllDay ? 'All Day' : 'Timed'}
        </span>
      </div>
      {event.htmlLink && (
        <a
          href={event.htmlLink}
          target="_blank"
          rel="noreferrer"
          className="text-secondary focus-visible:ring-primary/20 flex min-h-11 items-center gap-1.5 rounded-xl text-xs font-medium hover:underline focus-visible:ring-2 focus-visible:outline-none"
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
      className="border-tertiary/20 bg-tertiary/10 focus-visible:ring-primary/20 flex min-h-11 w-full flex-col gap-2 rounded-2xl border p-3 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99] sm:p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-tertiary text-[10px] font-semibold uppercase">
            Event
          </p>
          <p className="text-on-surface truncate text-sm font-semibold">
            {event.title}
          </p>
          {event.location && (
            <p className="text-on-surface-variant line-clamp-1 text-xs">
              {event.location}
            </p>
          )}
          {!event.isAllDay && event.startTime && (
            <p className="text-on-surface-variant text-xs">
              {formatTime(event.startTime)}
              {event.endTime ? ` - ${formatTime(event.endTime)}` : ''}
            </p>
          )}
          {event.notes && (
            <p className="text-on-surface-variant mt-1 line-clamp-2 text-xs">
              {event.notes}
            </p>
          )}
        </div>
        <span className="border-tertiary/20 bg-tertiary/10 text-tertiary inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase">
          {event.isAllDay ? 'All Day' : 'Timed'}
        </span>
      </div>
      <span className="text-tertiary flex items-center gap-1.5 text-[10px] font-medium">
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
  jobStatusLabels: JobStatusLabels;
  updateJobSchedule: UpdateJobScheduleAction;
  addJobScheduleDay: AddJobScheduleDayAction;
  deleteJobScheduleDay: DeleteJobScheduleDayAction;
  updateJobScheduleDay: UpdateJobScheduleDayAction;
  today?: string;
  initialView?: string;
  initialSource?: string;
  initialStatus?: string;
  initialSearch?: string;
};

export function ScheduleCalendar({
  jobs,
  googleEvents,
  nativeEvents,
  googleConnected,
  googleError,
  jobStatusLabels,
  updateJobSchedule,
  addJobScheduleDay,
  deleteJobScheduleDay,
  updateJobScheduleDay,
  today,
  initialView,
  initialSource,
  initialStatus,
  initialSearch,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const resolvedToday = today ?? new Date().toISOString().slice(0, 10);
  const [year, setYear] = useState(() => Number(resolvedToday.slice(0, 4)));
  const [month, setMonth] = useState(
    () => Number(resolvedToday.slice(5, 7)) - 1
  );
  const [selected, setSelected] = useState<string | null>(resolvedToday);
  const initialViewMode = isViewMode(initialView) ? initialView : null;
  const isTabletAgendaViewport = useTabletAgendaViewport();
  const [view, setView] = useState<ViewMode>(
    () => initialViewMode ?? 'calendar'
  );
  const [hasSelectedView, setHasSelectedView] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(() =>
    isSourceFilter(initialSource) ? initialSource : 'all'
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    isStatusFilter(initialStatus) ? initialStatus : 'all'
  );
  const [searchQuery, setSearchQuery] = useState(initialSearch ?? '');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [editingJob, setEditingJob] = useState<CalendarJob | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);
  const [isMoving, startMoveTransition] = useTransition();

  const unifiedEvents = useMemo(
    () => buildUnifiedEvents(jobs, googleEvents, nativeEvents, jobStatusLabels),
    [jobs, googleEvents, nativeEvents, jobStatusLabels]
  );

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return unifiedEvents.filter((event) => {
      if (sourceFilter === 'jobs' && event.kind !== 'job') return false;
      if (sourceFilter === 'schedule' && event.kind !== 'native') return false;
      if (sourceFilter === 'google' && event.kind !== 'google') return false;
      if (
        statusFilter !== 'all' &&
        (event.kind !== 'job' || event.job.status !== statusFilter)
      ) {
        return false;
      }
      if (query && !event.searchable.includes(query)) return false;
      return true;
    });
  }, [searchQuery, sourceFilter, statusFilter, unifiedEvents]);

  const eventMap = useMemo(
    () => buildEventMap(filteredEvents),
    [filteredEvents]
  );

  const calendarDays = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const slots: (string | null)[] = [];
    for (let i = 0; i < firstDow; i++) slots.push(null);
    for (let d = 1; d <= daysInMonth; d++) slots.push(ymd(year, month, d));
    while (slots.length % 7 !== 0) slots.push(null);
    return slots;
  }, [year, month]);

  const monthLabel = MONTH_YEAR_FORMATTER.format(
    new Date(Date.UTC(year, month, 1))
  );

  const selectedEvents = selected ? (eventMap.get(selected) ?? []) : [];
  const selectedLabel = selected
    ? DATE_LONG_FORMATTER.format(parseYmdUtc(selected))
    : null;
  const activeFilterCount =
    Number(sourceFilter !== 'all') +
    Number(statusFilter !== 'all') +
    Number(searchQuery.trim().length > 0);

  useEffect(() => {
    if (initialViewMode || hasSelectedView) return;
    setView(isTabletAgendaViewport ? 'list' : 'calendar');
  }, [hasSelectedView, initialViewMode, isTabletAgendaViewport]);

  function selectView(nextView: ViewMode) {
    setHasSelectedView(true);
    setView(nextView);
  }

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

  function goToToday() {
    setYear(Number(resolvedToday.slice(0, 4)));
    setMonth(Number(resolvedToday.slice(5, 7)) - 1);
    setSelected(resolvedToday);
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

    startMoveTransition(async () => {
      try {
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
      } catch (actionError) {
        if (isNextNavigationSignal(actionError)) throw actionError;
        const message = getActionErrorMessage(
          actionError,
          'Schedule could not be moved. Please try again.'
        );
        setDragError(message);
        toast.error(message);
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
      <div className="border-outline-variant bg-surface-container-lowest flex min-w-0 flex-col gap-3 rounded-2xl border p-2.5 shadow-sm sm:p-3">
        <div className="flex flex-col gap-3">
          <div className="relative flex-1">
            <Search className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs, quotes, addresses..."
              className={cn(formControlClassName, 'pr-10 pl-9')}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="focus-visible:ring-primary/20 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface absolute top-1/2 right-0 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <SegmentButton
              active={view === 'calendar'}
              onClick={() => selectView('calendar')}
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </SegmentButton>
            <SegmentButton
              active={view === 'list'}
              onClick={() => selectView('list')}
            >
              <List className="h-4 w-4" />
              List
            </SegmentButton>
          </div>
        </div>

        <div className="border-outline-variant bg-surface-container-low/30 rounded-2xl border p-2.5 sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SectionLabel>Now showing</SectionLabel>
              <p className="text-on-surface mt-1 text-sm font-semibold">
                {filteredEvents.length} result
                {filteredEvents.length === 1 ? '' : 's'}
              </p>
            </div>
            {activeFilterCount > 0 && (
              <span className="border-primary/20 bg-primary/10 text-primary rounded-full border px-2.5 py-1 text-xs font-semibold">
                {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <SummaryChip>
              {view === 'calendar' ? 'Calendar view' : 'List view'}
            </SummaryChip>
            <SummaryChip>{getSourceFilterLabel(sourceFilter)}</SummaryChip>
            <SummaryChip>
              {getStatusFilterLabel(statusFilter, jobStatusLabels)}
            </SummaryChip>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <SectionLabel className="px-1">Show</SectionLabel>
            <div className="flex min-w-0 flex-wrap gap-1.5 sm:gap-2">
              {(['all', 'jobs', 'schedule', 'google'] as SourceFilter[]).map(
                (source) => (
                  <FilterButton
                    key={source}
                    active={sourceFilter === source}
                    onClick={() => setSourceFilter(source)}
                  >
                    {source === 'all'
                      ? 'All'
                      : source === 'jobs'
                        ? 'Jobs'
                        : source === 'schedule'
                          ? 'Event'
                          : 'Google'}
                  </FilterButton>
                )
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <SectionLabel className="px-1">Job status</SectionLabel>
            <div className="flex min-w-0 flex-wrap gap-1.5 sm:gap-2">
              {(
                [
                  'all',
                  'scheduled',
                  'in_progress',
                  'completed',
                  'cancelled',
                ] as StatusFilter[]
              ).map((status) => (
                <FilterButton
                  key={status}
                  active={statusFilter === status}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? 'All jobs' : jobStatusLabels[status]}
                </FilterButton>
              ))}
            </div>
          </div>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-2.5 shadow-sm sm:p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SectionLabel>Calendar month</SectionLabel>
              <h2 className="text-on-surface mt-1 text-lg font-bold">
                {monthLabel}
              </h2>
            </div>
            <button
              onClick={goToToday}
              className="border-outline-variant focus-visible:ring-primary/20 text-on-surface hover:bg-surface-container-low flex h-11 shrink-0 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Today
            </button>
          </div>
          <div className="mt-3 grid grid-cols-[44px,minmax(0,1fr),44px] gap-2 sm:flex sm:items-center sm:justify-between">
            <button
              onClick={prevMonth}
              aria-label="Previous month"
              className="focus-visible:ring-primary/20 hover:bg-surface-container-low flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <ChevronLeft className="text-on-surface-variant h-5 w-5" />
            </button>
            <button
              onClick={() => openAddEvent()}
              className="focus-visible:ring-primary/20 bg-primary text-on-primary flex h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none sm:min-w-[140px] sm:px-4"
            >
              + New Event
            </button>
            <button
              onClick={nextMonth}
              aria-label="Next month"
              className="focus-visible:ring-primary/20 hover:bg-surface-container-low flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <ChevronRight className="text-on-surface-variant h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="border-outline-variant bg-surface-container-lowest flex flex-col gap-3 rounded-2xl border p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div>
            <SectionLabel>Job list</SectionLabel>
            <p className="text-on-surface-variant mt-1 text-sm">
              Search past work, check status, and jump into each job without
              leaving schedule.
            </p>
          </div>
          <button
            onClick={() => openAddEvent()}
            className="focus-visible:ring-primary/20 bg-primary text-on-primary flex h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
          >
            + New Event
          </button>
        </div>
      )}

      {googleError && (
        <div className="border-warning/30 bg-warning-container rounded-xl border px-4 py-3">
          <p className="text-on-warning-container text-sm">
            Google Calendar could not be loaded. Showing Coatly jobs and events
            only.
          </p>
        </div>
      )}
      {dragError && <ErrorAlert>{dragError}</ErrorAlert>}
      {isMoving && (
        <div className="border-outline bg-surface-container-low rounded-xl border px-4 py-3">
          <p className="text-on-surface-variant text-sm">
            Updating schedule...
          </p>
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
              <div className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-3 shadow-sm sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <SectionLabel>Selected day</SectionLabel>
                    <h3 className="text-on-surface mt-1 text-base font-bold">
                      {selectedLabel}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="border-outline bg-surface-container-low text-on-surface-variant rounded-full border px-2.5 py-1 text-xs font-semibold">
                      {selectedEvents.length} item
                      {selectedEvents.length === 1 ? '' : 's'}
                    </span>
                    <button
                      onClick={() => openAddEvent(selected)}
                      className="border-outline-variant focus-visible:ring-primary/20 text-on-surface-variant hover:bg-surface-container-low inline-flex h-11 items-center gap-1.5 rounded-xl border px-4 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
              <EventStack
                events={selectedEvents}
                emptyText="No matching jobs or events on this day."
                onEditEvent={openEditEvent}
                onEditJob={setEditingJob}
                jobStatusLabels={jobStatusLabels}
              />
            </section>
          )}
        </>
      ) : (
        <section className="flex flex-col gap-3">
          <p className="text-on-surface-variant text-sm">
            {filteredEvents.length} result
            {filteredEvents.length === 1 ? '' : 's'}
            {sourceFilter === 'jobs' ? ' in jobs' : ''}
          </p>
          {filteredEvents.length === 0 ? (
            <EmptyState onAdd={() => openAddEvent()} />
          ) : (
            <ul className="flex flex-col gap-3">
              {filteredEvents.map((event) => (
                <li key={event.id}>
                  <div className="text-on-surface-variant mb-2 text-xs font-medium">
                    {formatDateRange(event.start, event.end)}
                  </div>
                  {event.kind === 'job' ? (
                    <JobEventCard
                      job={event.job}
                      onEditSchedule={setEditingJob}
                      jobStatusLabels={jobStatusLabels}
                    />
                  ) : event.kind === 'google' ? (
                    <GoogleEventCard event={event.event} />
                  ) : (
                    <NativeEventCard
                      event={event.event}
                      onEdit={openEditEvent}
                    />
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
      {editingJob && (
        <JobScheduleModal
          job={editingJob}
          onClose={() => setEditingJob(null)}
          updateJobSchedule={updateJobSchedule}
          addJobScheduleDay={addJobScheduleDay}
          deleteJobScheduleDay={deleteJobScheduleDay}
        />
      )}
    </div>
  );
}

async function moveNativeEvent(
  id: string,
  date: string,
  nativeEvents: ScheduleEvent[]
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
  nativeEvents: ScheduleEvent[]
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
      scheduled: 'border-primary/30 bg-primary/10 text-primary',
      in_progress: 'border-warning/30 bg-warning-container text-warning',
      completed: 'border-success/30 bg-success-container text-success',
      cancelled: 'border-error/30 bg-error-container text-error',
    } satisfies Record<JobStatus, string>;

    return color[event.job.status];
  }

  if (event.kind === 'native') {
    return 'border-tertiary/20 bg-tertiary/10 text-tertiary';
  }

  return 'border-secondary/20 bg-secondary-container/30 text-secondary';
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
      className={`focus-visible:ring-primary/20 flex min-h-11 w-full min-w-0 cursor-grab items-center rounded-xl border px-2 text-left text-xs leading-tight font-semibold shadow-sm focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing ${getChipClassName(
        event
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
    <div className="flex min-w-0 flex-col gap-2">
      <div className="min-w-0 pb-1">
        <div
          aria-label="Schedule calendar month"
          className="border-outline-variant bg-surface-container-lowest w-full min-w-0 overflow-hidden rounded-2xl border shadow-sm"
        >
          <div className="border-outline bg-surface-container-low grid grid-cols-7 border-b">
            {DAY_HEADERS.map((d) => (
              <div
                key={d}
                className="text-on-surface-variant py-2 text-center text-[10px] font-semibold uppercase sm:text-[11px]"
              >
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
                    className="border-outline/40 bg-surface-container-low/20 min-h-[96px] border-r border-b last:border-r-0 xl:min-h-[64px]"
                  />
                );
              }

              const dayEvents = eventMap.get(dateStr) ?? [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selected;
              const visibleEvents = dayEvents.slice(0, 3);
              const hiddenCount = Math.max(
                0,
                dayEvents.length - visibleEvents.length
              );
              const dayNum = parseInt(dateStr.slice(8), 10);

              return (
                <div
                  key={dateStr}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDrop(dateStr, e.dataTransfer.getData('application/json'));
                  }}
                  className={`group border-outline/40 relative min-h-[190px] border-r border-b last:border-r-0 xl:min-h-[118px] ${
                    isSelected
                      ? 'bg-primary/5 ring-primary/30 ring-1 ring-inset'
                      : 'hover:bg-surface-container-low/50'
                  }`}
                >
                  <button
                    onClick={() => onSelect(dateStr)}
                    aria-label={`Select ${DATE_LONG_FORMATTER.format(parseYmdUtc(dateStr))}`}
                    className="focus-visible:ring-primary/20 flex min-h-11 w-full items-center justify-center rounded-xl px-0.5 pt-1 focus-visible:ring-2 focus-visible:outline-none xl:px-1 xl:pt-1.5"
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold xl:h-7 xl:w-7 ${
                        isToday
                          ? 'bg-primary text-on-primary'
                          : isSelected
                            ? 'text-primary'
                            : 'text-on-surface'
                      }`}
                    >
                      {dayNum}
                    </span>
                  </button>
                  <div className="flex flex-col gap-1 px-1 pt-1 pb-12 xl:pb-8">
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
                        className="border-outline-variant focus-visible:ring-primary/20 bg-surface-container-lowest text-on-surface-variant min-h-11 rounded-xl border px-2 text-left text-xs leading-tight font-semibold focus-visible:ring-2 focus-visible:outline-none"
                      >
                        +{hiddenCount} more
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => onAdd(dateStr)}
                    className="focus-visible:ring-primary/20 bg-surface-container-lowest text-on-surface-variant ring-outline-variant hover:text-primary absolute right-1 bottom-1 flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ring-1 transition-colors focus-visible:ring-2 focus-visible:outline-none xl:hidden xl:group-hover:flex"
                    aria-label="Add schedule on this day"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventStack({
  events,
  emptyText,
  onEditEvent,
  onEditJob,
  jobStatusLabels,
}: {
  events: DayEvent[];
  emptyText: string;
  onEditEvent: (event: ScheduleEvent) => void;
  onEditJob: (job: CalendarJob) => void;
  jobStatusLabels: JobStatusLabels;
}) {
  if (events.length === 0) {
    return (
      <div className="border-outline bg-surface-container-lowest rounded-2xl border border-dashed px-6 py-8 text-center">
        <p className="text-on-surface-variant text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {events.map((e, i) =>
        e.kind === 'job' ? (
          <li key={`j-${e.job.id}-${i}`}>
            <JobEventCard
              job={e.job}
              dragDate={e.date}
              onEditSchedule={onEditJob}
              jobStatusLabels={jobStatusLabels}
            />
          </li>
        ) : e.kind === 'google' ? (
          <li key={`g-${e.event.id}-${i}`}>
            <GoogleEventCard event={e.event} />
          </li>
        ) : (
          <li key={`n-${e.event.id}-${i}`}>
            <NativeEventCard event={e.event} onEdit={onEditEvent} />
          </li>
        )
      )}
    </ul>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border-outline bg-surface-container-lowest rounded-2xl border border-dashed px-6 py-8 text-center">
      <p className="text-on-surface-variant text-sm">
        No matching jobs or events.
      </p>
      <button
        onClick={onAdd}
        className="focus-visible:ring-primary/20 text-primary hover:bg-primary/5 mt-3 inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
      >
        Add an event
      </button>
    </div>
  );
}

function SummaryChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-outline bg-surface-container-lowest text-on-surface-variant rounded-full border px-2 py-0.5 text-[11px] font-medium sm:px-2.5 sm:py-1 sm:text-xs">
      {children}
    </span>
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
      aria-pressed={active}
      className={`focus-visible:ring-primary/20 flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:gap-2 sm:px-3 sm:text-sm ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
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
      className={`focus-visible:ring-primary/20 min-h-11 min-w-0 rounded-xl border px-3 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
      }`}
    >
      {children}
    </button>
  );
}

function Legend({ googleConnected }: { googleConnected: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 px-1">
      <LegendDot color="bg-primary" label="Scheduled" />
      <LegendDot color="bg-warning" label="In Progress" />
      <LegendDot color="bg-success" label="Completed" />
      <LegendDot color="bg-error" label="Cancelled" />
      <LegendDot color="bg-tertiary" label="Event" />
      {googleConnected && (
        <LegendDot color="bg-secondary" label="Google Calendar" />
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-on-surface-variant text-xs">{label}</span>
    </div>
  );
}
