'use client';

import { useCallback, useState, useTransition } from 'react';
import { bookJobFromPublicQuote, getAvailableDatesForToken } from '@/app/actions/jobs';

interface PublicDatePickerStepProps {
  token: string;
  workingDays: number;
  customerName: string;
  initialBlockedDates?: string[];
  initialWorkingDays?: number;
  initialLoadError?: string | null;
}

function formatDateYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00`);
}

function formatDisplayDate(ymd: string): string {
  return parseLocalDate(ymd).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function CalendarSkeleton() {
  return (
    <div role="status" aria-label="Loading calendar" className="space-y-3 animate-pulse">
      <div className="flex items-center justify-between px-1">
        <div className="h-8 w-8 rounded-xl bg-pm-border" />
        <div className="h-5 w-32 rounded-md bg-pm-border" />
        <div className="h-8 w-8 rounded-xl bg-pm-border" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-6 rounded bg-pm-border/60" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-11 rounded-xl bg-pm-surface" />
        ))}
      </div>
    </div>
  );
}

export function PublicDatePickerStep({
  token,
  workingDays,
  customerName,
  initialBlockedDates = [],
  initialWorkingDays = workingDays,
  initialLoadError = null,
}: PublicDatePickerStepProps) {
  const today = formatDateYMD(new Date());

  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(
    () => new Set(initialBlockedDates),
  );
  const [resolvedWorkingDays, setResolvedWorkingDays] = useState(initialWorkingDays);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(initialLoadError);
  const [isBooking, startBookingTransition] = useTransition();
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookedResult, setBookedResult] = useState<{ startDate: string; endDate: string } | null>(null);

  const loadAvailableDates = useCallback(async () => {
    setIsLoadingDates(true);
    setLoadError(null);
    const result = await getAvailableDatesForToken(token);
    if (result.error) {
      setLoadError(result.error);
    } else {
      setBlockedDates(new Set(result.blockedDates));
      setResolvedWorkingDays(result.workingDays ?? workingDays);
    }
    setIsLoadingDates(false);
  }, [token, workingDays]);

  // Compute highlight range from selected start
  const highlightRange = useCallback((): Set<string> => {
    if (!selectedStart) return new Set();
    const set = new Set<string>();
    const start = parseLocalDate(selectedStart);
    for (let i = 0; i < resolvedWorkingDays; i++) {
      set.add(formatDateYMD(addDays(start, i)));
    }
    return set;
  }, [selectedStart, resolvedWorkingDays]);

  const rangeSet = highlightRange();

  // Calendar grid computation
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleDayClick(dateStr: string) {
    if (dateStr < today) return;
    if (blockedDates.has(dateStr)) return;
    setSelectedStart(dateStr);
    setBookError(null);
  }

  function handleBook() {
    if (!selectedStart) return;
    setBookError(null);

    startBookingTransition(async () => {
      const result = await bookJobFromPublicQuote(token, selectedStart);
      if (result.error) {
        setBookError(result.error);
        return;
      }
      // Compute end date for success display
      const endDate = formatDateYMD(addDays(parseLocalDate(selectedStart), resolvedWorkingDays - 1));
      setBookedResult({ startDate: selectedStart, endDate });
    });
  }

  // ── Success state ──
  if (bookedResult) {
    const isSingleDay = bookedResult.startDate === bookedResult.endDate;
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-pm-teal/30 bg-pm-teal/5 px-4 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pm-teal/15">
            <svg className="h-6 w-6 text-pm-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-pm-teal">Booking Confirmed!</p>
            <p className="mt-1 text-sm text-pm-secondary">
              {customerName ? `Thank you, ${customerName.split(' ')[0]}!` : 'Thank you!'}{' '}
              Your job has been booked.
            </p>
            <div className="mt-3 rounded-lg border border-pm-teal/20 bg-white px-4 py-3 text-sm">
              <p className="font-medium text-pm-body">
                {isSingleDay ? (
                  formatDisplayDate(bookedResult.startDate)
                ) : (
                  <>
                    {formatDisplayDate(bookedResult.startDate)}
                    {' '}–{' '}
                    {formatDisplayDate(bookedResult.endDate)}
                  </>
                )}
              </p>
              <p className="mt-1 text-pm-secondary">
                {resolvedWorkingDays} working day{resolvedWorkingDays !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-pm-secondary">
          The painter will be in touch to confirm details.
        </p>
      </div>
    );
  }

  const selectedEndDate = selectedStart
    ? formatDateYMD(addDays(parseLocalDate(selectedStart), resolvedWorkingDays - 1))
    : null;

  // ── Date picker UI ──
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-pm-teal/20 bg-pm-teal/5 px-4 py-3">
        <p className="text-sm font-medium text-pm-teal">
          Choose a start date for your{' '}
          <span className="font-bold">{resolvedWorkingDays} day{resolvedWorkingDays !== 1 ? 's' : ''}</span>{' '}
          painting job.
        </p>
        <p className="mt-1 text-xs text-pm-secondary">
          Tap a date to select it. The full job duration will be highlighted automatically.
        </p>
      </div>

      {/* Calendar */}
      <div className="rounded-2xl border border-pm-border bg-white p-4 shadow-sm">
        {isLoadingDates ? (
          <CalendarSkeleton />
        ) : loadError ? (
          <div className="space-y-3">
            <p className="text-sm text-pm-coral-dark">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadAvailableDates()}
              className="text-sm font-medium text-pm-teal hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* Month navigation */}
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Previous month"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-pm-border text-pm-body transition-colors hover:bg-pm-surface active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <p className="text-sm font-bold text-pm-body">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </p>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next month"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-pm-border text-pm-body transition-colors hover:bg-pm-surface active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="mb-1 grid grid-cols-7 gap-1">
              {DAY_LABELS.map((d) => (
                <div key={d} className="py-1 text-center text-[10px] font-bold uppercase tracking-widest text-pm-secondary">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {/* Leading empty cells */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isPast = dateStr < today;
                const isBlocked = blockedDates.has(dateStr);
                const isToday = dateStr === today;
                const isStart = dateStr === selectedStart;
                const isInRange = rangeSet.has(dateStr) && !isStart;
                const isDisabled = isPast || isBlocked;

                let cellClass =
                  'relative flex min-h-11 items-center justify-center rounded-xl text-sm font-medium transition-all select-none ';

                if (isPast) {
                  cellClass += 'cursor-not-allowed text-pm-secondary/40 bg-pm-surface/60';
                } else if (isBlocked) {
                  cellClass += 'cursor-not-allowed bg-pm-coral/20 text-pm-coral-dark';
                } else if (isStart) {
                  cellClass += 'cursor-pointer bg-pm-teal text-white font-bold shadow-sm active:scale-95';
                } else if (isInRange) {
                  cellClass += 'cursor-pointer bg-pm-teal/20 text-pm-teal font-semibold';
                } else {
                  cellClass += 'cursor-pointer hover:bg-pm-surface text-pm-body active:scale-95';
                }

                if (isToday && !isStart && !isInRange) {
                  cellClass += ' ring-2 ring-pm-teal/40 ring-inset';
                }

                return (
                  <button
                    key={dateStr}
                    type="button"
                    data-testid={`date-${dateStr}`}
                    data-selected={isStart ? 'true' : undefined}
                    data-in-range={isInRange ? 'true' : undefined}
                    disabled={isDisabled}
                    onClick={() => handleDayClick(dateStr)}
                    aria-label={`${day} ${MONTH_NAMES[viewMonth]}${isBlocked ? ' (unavailable)' : ''}`}
                    aria-pressed={isStart}
                    className={cellClass}
                  >
                    {day}
                    {isBlocked && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-pm-coral" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 border-t border-pm-border/60 pt-3 text-xs text-pm-secondary">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-pm-teal/20 border border-pm-teal/30" />
                Selected range
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-pm-coral/20" />
                Unavailable
              </span>
            </div>
          </>
        )}
      </div>

      {/* Booking summary + button */}
      {selectedStart && selectedEndDate && (
        <div className="space-y-3 rounded-2xl border border-pm-border bg-white p-4 shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-pm-secondary">
              Your Booking
            </p>
            <p className="mt-1.5 text-base font-semibold text-pm-body">
              {resolvedWorkingDays === 1 || selectedStart === selectedEndDate
                ? formatDisplayDate(selectedStart)
                : `${formatDisplayDate(selectedStart)} – ${formatDisplayDate(selectedEndDate)}`}
            </p>
            <p className="mt-0.5 text-sm text-pm-secondary">
              {resolvedWorkingDays} working day{resolvedWorkingDays !== 1 ? 's' : ''}
            </p>
          </div>

          {bookError && (
            <div className="flex items-center gap-2 rounded-xl border border-pm-coral/30 bg-pm-coral-light/50 px-4 py-3">
              <svg className="h-4 w-4 shrink-0 text-pm-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-pm-coral-dark">{bookError}</p>
            </div>
          )}

          <button
            type="button"
            disabled={isBooking}
            onClick={handleBook}
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-pm-teal px-6 py-4 text-base font-bold text-white shadow-sm transition-all hover:bg-pm-teal-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-pm-border"
          >
            {isBooking ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Booking...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                Book {resolvedWorkingDays} day{resolvedWorkingDays !== 1 ? 's' : ''} starting{' '}
                {parseLocalDate(selectedStart).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                })}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
