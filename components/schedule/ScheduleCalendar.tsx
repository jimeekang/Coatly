'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { JOB_STATUS_LABELS, type JobStatus } from '@/lib/jobs';
import {
  createScheduleEvent,
  updateScheduleEvent,
  deleteScheduleEvent,
  type ScheduleEvent,
  type ScheduleEventInput,
} from '@/app/actions/schedule';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalendarJob = {
  id: string;
  title: string;
  customerName: string;
  status: JobStatus;
  startDate: string | null;
  endDate: string | null;
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
  | { kind: 'job'; job: CalendarJob }
  | { kind: 'google'; event: CalendarGoogleEvent }
  | { kind: 'native'; event: ScheduleEvent };

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<JobStatus, string> = {
  scheduled: 'bg-primary',
  in_progress: 'bg-warning',
  completed: 'bg-success',
  cancelled: 'bg-error',
};

const STATUS_BADGE: Record<JobStatus, string> = {
  scheduled: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-success-container text-success border-success/20',
  in_progress: 'bg-warning-container text-on-warning-container border-warning/20',
  cancelled: 'bg-error-container text-error border-error/20',
};

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function buildEventMap(
  jobs: CalendarJob[],
  googleEvents: CalendarGoogleEvent[],
  nativeEvents: ScheduleEvent[],
): Map<string, DayEvent[]> {
  const map = new Map<string, DayEvent[]>();
  const add = (date: string, ev: DayEvent) => {
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(ev);
  };

  for (const job of jobs) {
    const start = job.startDate ?? job.scheduledDate;
    if (!start) continue;
    const end = job.endDate ?? start;
    for (const date of getDateRange(start, end)) {
      add(date, { kind: 'job', job });
    }
  }

  for (const ev of googleEvents) {
    if (ev.isAllDay && ev.startDate) {
      const start = ev.startDate;
      let end = ev.endDate ?? start;
      const endDate = new Date(end + 'T00:00:00');
      endDate.setDate(endDate.getDate() - 1);
      end = endDate.toISOString().slice(0, 10);
      if (end < start) end = start;
      for (const date of getDateRange(start, end)) {
        add(date, { kind: 'google', event: ev });
      }
    } else if (ev.startDateTime) {
      add(ev.startDateTime.slice(0, 10), { kind: 'google', event: ev });
    }
  }

  for (const ev of nativeEvents) {
    add(ev.date, { kind: 'native', event: ev });
  }

  return map;
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0);
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatIsoTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── Event Form Modal ─────────────────────────────────────────────────────────

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
    date: defaultDate ?? new Date().toISOString().slice(0, 10),
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

type EventModalProps = {
  editing: ScheduleEvent | null;
  defaultDate: string;
  onClose: () => void;
};

function EventModal({ editing, defaultDate, onClose }: EventModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [form, setForm] = useState<EventFormState>(
    editing ? eventToForm(editing) : emptyForm(defaultDate),
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.date) { setError('Date is required'); return; }
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
        if (result.error) { setError(result.error); return; }
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
        if (result.error) { setError(result.error); return; }
        router.refresh();
        onClose();
      })();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-pm-body">
            {editing ? 'Edit Event' : 'Add Event'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-pm-secondary transition-colors hover:bg-pm-surface"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-pm-body">
            Title
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
              placeholder="e.g. Site inspection"
              className="h-11 rounded-xl border border-pm-border bg-white px-3 text-sm font-normal text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-pm-body">
            Date
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))}
              className="h-11 rounded-xl border border-pm-border bg-white px-3 text-sm font-normal text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
            />
          </label>

          <label className="flex items-center gap-3 text-sm font-medium text-pm-body">
            <input
              type="checkbox"
              checked={form.isAllDay}
              onChange={(e) => setForm((c) => ({ ...c, isAllDay: e.target.checked }))}
              className="h-4 w-4 rounded border-pm-border text-pm-teal accent-pm-teal"
            />
            All day
          </label>

          {!form.isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-pm-body">
                Start time
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((c) => ({ ...c, startTime: e.target.value }))}
                  className="h-11 rounded-xl border border-pm-border bg-white px-3 text-sm font-normal text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-pm-body">
                End time
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((c) => ({ ...c, endTime: e.target.value }))}
                  className="h-11 rounded-xl border border-pm-border bg-white px-3 text-sm font-normal text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
                />
              </label>
            </div>
          )}

          <label className="flex flex-col gap-1.5 text-sm font-medium text-pm-body">
            Location
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))}
              placeholder="Optional"
              className="h-11 rounded-xl border border-pm-border bg-white px-3 text-sm font-normal text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-pm-body">
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
              rows={2}
              placeholder="Optional"
              className="rounded-xl border border-pm-border bg-white px-3 py-2.5 text-sm font-normal text-pm-body outline-none transition focus:border-pm-teal focus:ring-2 focus:ring-pm-teal/10"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            {editing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex h-11 items-center justify-center rounded-xl border border-rose-200 px-4 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
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
              {isPending ? 'Saving…' : editing ? 'Save' : 'Add Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Event Detail Cards ───────────────────────────────────────────────────────

function JobEventCard({ job }: { job: CalendarJob }) {
  return (
    <Link
      href={`/jobs?jobId=${job.id}`}
      className="flex flex-col gap-2 rounded-2xl border border-pm-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {job.quoteNumber && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pm-secondary">
              {job.quoteNumber}
            </p>
          )}
          <p className="text-sm font-semibold text-pm-body">{job.customerName}</p>
          {job.title && (
            <p className="text-xs text-pm-secondary line-clamp-1">{job.title}</p>
          )}
          {job.address && (
            <p className="text-xs text-pm-secondary line-clamp-1">{job.address}</p>
          )}
        </div>
        <span
          className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_BADGE[job.status]}`}
        >
          {JOB_STATUS_LABELS[job.status]}
        </span>
      </div>
      {job.notes && (
        <p className="text-xs text-pm-secondary line-clamp-2">{job.notes}</p>
      )}
      <p className="text-[10px] font-medium text-pm-teal">View job →</p>
    </Link>
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
          {event.location && (
            <p className="text-xs text-pm-secondary line-clamp-1">{event.location}</p>
          )}
          {!event.isAllDay && event.startDateTime && (
            <p className="text-xs text-pm-secondary">
              {formatIsoTime(event.startDateTime)}
              {event.endDateTime ? ` – ${formatIsoTime(event.endDateTime)}` : ''}
            </p>
          )}
        </div>
        <span className="shrink-0 inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-600">
          {event.isAllDay ? 'All Day' : 'Timed'}
        </span>
      </div>
      {event.htmlLink && (
        <a
          href={event.htmlLink}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Open in Google Calendar →
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
  return (
    <button
      onClick={() => onEdit(event)}
      className="flex w-full flex-col gap-2 rounded-2xl border border-violet-100 bg-violet-50/40 p-4 shadow-sm text-left transition-shadow hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-500">
            My Event
          </p>
          <p className="text-sm font-semibold text-pm-body">{event.title}</p>
          {event.location && (
            <p className="text-xs text-pm-secondary line-clamp-1">{event.location}</p>
          )}
          {!event.isAllDay && event.startTime && (
            <p className="text-xs text-pm-secondary">
              {formatTime(event.startTime)}
              {event.endTime ? ` – ${formatTime(event.endTime)}` : ''}
            </p>
          )}
          {event.notes && (
            <p className="text-xs text-pm-secondary line-clamp-2 mt-1">{event.notes}</p>
          )}
        </div>
        <span className="shrink-0 inline-flex items-center rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-600">
          {event.isAllDay ? 'All Day' : 'Timed'}
        </span>
      </div>
      <p className="text-[10px] font-medium text-violet-500">Tap to edit →</p>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Props = {
  jobs: CalendarJob[];
  googleEvents: CalendarGoogleEvent[];
  nativeEvents: ScheduleEvent[];
  googleConnected: boolean;
  googleError: boolean;
};

export function ScheduleCalendar({
  jobs,
  googleEvents,
  nativeEvents,
  googleConnected,
  googleError,
}: Props) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selected, setSelected] = useState<string | null>(todayStr);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);

  const eventMap = useMemo(
    () => buildEventMap(jobs, googleEvents, nativeEvents),
    [jobs, googleEvents, nativeEvents],
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

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  });

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelected(null);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelected(null);
  }

  const selectedEvents = selected ? (eventMap.get(selected) ?? []) : [];
  const selectedLabel = selected
    ? new Date(selected + 'T00:00:00').toLocaleDateString('en-AU', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : null;

  function openAddEvent() {
    setEditingEvent(null);
    setModalOpen(true);
  }

  function openEditEvent(ev: ScheduleEvent) {
    setEditingEvent(ev);
    setModalOpen(true);
  }

  const showNativeFeature = !googleConnected;

  return (
    <div className="flex flex-col gap-6">
      {/* Month navigation + Add button */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="flex min-h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-pm-surface"
        >
          <svg className="h-5 w-5 text-pm-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <h2 className="text-lg font-bold text-pm-body">{monthLabel}</h2>

        <div className="flex items-center gap-2">
          {showNativeFeature && (
            <button
              onClick={openAddEvent}
              className="flex min-h-11 items-center gap-1.5 rounded-full bg-pm-teal px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add
            </button>
          )}
          <button
            onClick={nextMonth}
            aria-label="Next month"
            className="flex min-h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-pm-surface"
          >
            <svg className="h-5 w-5 text-pm-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-2xl border border-pm-border bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-pm-border bg-pm-surface">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-pm-secondary"
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
                  className="min-h-[56px] border-b border-r border-pm-border/40 bg-pm-surface/20 last:border-r-0"
                />
              );
            }

            const dayEvents = eventMap.get(dateStr) ?? [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selected;
            const jobEvts = dayEvents.filter((e): e is { kind: 'job'; job: CalendarJob } => e.kind === 'job');
            const gEvts = dayEvents.filter((e): e is { kind: 'google'; event: CalendarGoogleEvent } => e.kind === 'google');
            const nEvts = dayEvents.filter((e): e is { kind: 'native'; event: ScheduleEvent } => e.kind === 'native');
            const dayNum = parseInt(dateStr.slice(8), 10);

            return (
              <button
                key={dateStr}
                onClick={() => setSelected(isSelected ? null : dateStr)}
                className={`flex min-h-[56px] flex-col items-center gap-1 border-b border-r border-pm-border/40 px-1 py-1.5 transition-colors last:border-r-0 ${
                  isSelected
                    ? 'bg-pm-teal/5 ring-1 ring-inset ring-pm-teal/30'
                    : 'hover:bg-pm-surface/50'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isToday
                      ? 'bg-pm-teal text-white'
                      : isSelected
                      ? 'text-pm-teal'
                      : 'text-pm-body'
                  }`}
                >
                  {dayNum}
                </span>

                {dayEvents.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-0.5">
                    {jobEvts.slice(0, 2).map((e, idx) => (
                      <span key={idx} className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[e.job.status]}`} />
                    ))}
                    {gEvts.slice(0, 1).map((_, idx) => (
                      <span key={`g${idx}`} className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                    ))}
                    {nEvts.slice(0, 2).map((_, idx) => (
                      <span key={`n${idx}`} className="h-1.5 w-1.5 rounded-full bg-secondary" />
                    ))}
                    {dayEvents.length > 5 && (
                      <span className="text-[8px] leading-tight text-pm-secondary">
                        +{dayEvents.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 px-1">
        <LegendDot color="bg-primary" label="Scheduled" />
        <LegendDot color="bg-warning" label="In Progress" />
        <LegendDot color="bg-success" label="Completed" />
        {googleConnected && <LegendDot color="bg-tertiary" label="Google Calendar" />}
        {showNativeFeature && <LegendDot color="bg-secondary" label="My Events" />}
      </div>

      {/* Google error notice */}
      {googleError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            Google Calendar couldn&apos;t be loaded. Showing Coatly jobs only.
          </p>
        </div>
      )}

      {/* Selected day panel */}
      {selected && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-pm-body">{selectedLabel}</h3>
            {showNativeFeature && (
              <button
                onClick={openAddEvent}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-pm-border px-3 text-xs font-semibold text-pm-secondary transition-colors hover:bg-pm-surface"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add event
              </button>
            )}
          </div>

          {selectedEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-pm-border bg-white px-6 py-8 text-center">
              <p className="text-sm text-pm-secondary">No events on this day.</p>
              {showNativeFeature && (
                <button
                  onClick={openAddEvent}
                  className="mt-3 text-sm font-medium text-pm-teal hover:underline"
                >
                  + Add an event
                </button>
              )}
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {selectedEvents.map((e, i) =>
                e.kind === 'job' ? (
                  <li key={`j-${e.job.id}-${i}`}>
                    <JobEventCard job={e.job} />
                  </li>
                ) : e.kind === 'google' ? (
                  <li key={`g-${e.event.id}-${i}`}>
                    <GoogleEventCard event={e.event} />
                  </li>
                ) : (
                  <li key={`n-${e.event.id}-${i}`}>
                    <NativeEventCard event={e.event} onEdit={openEditEvent} />
                  </li>
                ),
              )}
            </ul>
          )}
        </section>
      )}

      {/* Event modal */}
      {modalOpen && (
        <EventModal
          editing={editingEvent}
          defaultDate={selected ?? new Date().toISOString().slice(0, 10)}
          onClose={() => setModalOpen(false)}
        />
      )}
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
