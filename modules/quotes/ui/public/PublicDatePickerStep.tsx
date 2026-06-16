'use client';

import { useCallback, useState, useTransition } from 'react';
import {
  buildBookingRange,
  getNonWorkingDateReason,
  isNswNonWorkingDate,
} from '@/lib/calendar/nsw-public-holidays';

export type PublicDateAvailabilityResult = {
  blockedDates: string[];
  workingDays: number;
  error: string | null;
  availabilityStatus?: 'ready' | 'degraded' | 'unavailable';
  availabilityMessage?: string | null;
};

export type GetAvailableDatesAction = (
  token: string,
) => Promise<PublicDateAvailabilityResult>;

export type BookJobFromPublicQuoteAction = (
  token: string,
  startDate: string,
  options?: { includeNonWorkingDates?: boolean },
) => Promise<{ error: string | null; jobId: string | null }>;

export interface PublicDatePickerStepProps {
  token: string;
  workingDays: number;
  customerName: string;
  initialBlockedDates?: string[];
  initialWorkingDays?: number;
  initialLoadError?: string | null;
  initialAvailabilityStatus?: 'ready' | 'degraded' | 'unavailable';
  initialAvailabilityMessage?: string | null;
  contractorName?: string | null;
  contractorPhone?: string | null;
  contractorEmail?: string | null;
  getAvailableDatesAction: GetAvailableDatesAction;
  bookJobFromPublicQuoteAction: BookJobFromPublicQuoteAction;
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function CalendarSkeleton() {
  return (
    <div role="status" aria-label="Loading calendar" className="space-y-3 animate-pulse">
      <div className="flex items-center justify-between px-1">
        <div className="h-8 w-8 rounded-xl bg-outline" />
        <div className="h-5 w-32 rounded-md bg-outline" />
        <div className="h-8 w-8 rounded-xl bg-outline" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-6 rounded bg-outline/60" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-11 rounded-xl bg-surface-container-low" />
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
  initialAvailabilityStatus,
  initialAvailabilityMessage = null,
  contractorName = null,
  contractorPhone = null,
  contractorEmail = null,
  getAvailableDatesAction,
  bookJobFromPublicQuoteAction,
}: PublicDatePickerStepProps) {
  const today = formatDateYMD(new Date());

  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [allowNonWorkingDates, setAllowNonWorkingDates] = useState(false);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(
    () => new Set(initialBlockedDates),
  );
  const [resolvedWorkingDays, setResolvedWorkingDays] = useState(initialWorkingDays);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(initialLoadError);
  const [availabilityStatus, setAvailabilityStatus] = useState<'ready' | 'degraded' | 'unavailable'>(
    initialAvailabilityStatus ?? (initialLoadError ? 'unavailable' : 'ready'),
  );
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(
    initialAvailabilityMessage,
  );
  const [isBooking, startBookingTransition] = useTransition();
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookedResult, setBookedResult] = useState<{ startDate: string; endDate: string } | null>(null);

  const loadAvailableDates = useCallback(async () => {
    setIsLoadingDates(true);
    setLoadError(null);
    const result = await getAvailableDatesAction(token);
    if (result.error) {
      setLoadError(result.error);
      setAvailabilityStatus('unavailable');
      setAvailabilityMessage(null);
      setSelectedStart(null);
    } else {
      setBlockedDates(new Set(result.blockedDates));
      setResolvedWorkingDays(result.workingDays ?? workingDays);
      setAvailabilityStatus('ready');
      setAvailabilityMessage(null);
    }
    setIsLoadingDates(false);
  }, [getAvailableDatesAction, token, workingDays]);

  // Compute highlight range from selected start
  const highlightRange = useCallback((): Set<string> => {
    if (!selectedStart) return new Set();
    return new Set(
      buildBookingRange(selectedStart, resolvedWorkingDays, allowNonWorkingDates)
        .scheduledDates,
    );
  }, [selectedStart, resolvedWorkingDays, allowNonWorkingDates]);

  const rangeSet = highlightRange();

  function rangeHasBlockedDate(startDate: string) {
    const bookingRange = buildBookingRange(
      startDate,
      resolvedWorkingDays,
      allowNonWorkingDates,
    );

    for (const date of bookingRange.spanDates) {
      if (blockedDates.has(date)) {
        return true;
      }
    }

    return false;
  }

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
    if (availabilityStatus !== 'ready' || loadError) return;
    if (dateStr < today) return;
    if (!allowNonWorkingDates && isNswNonWorkingDate(dateStr)) return;
    if (blockedDates.has(dateStr) || rangeHasBlockedDate(dateStr)) return;
    setSelectedStart(dateStr);
    setBookError(null);
  }

  function handleNonWorkingToggle(checked: boolean) {
    setAllowNonWorkingDates(checked);
    setBookError(null);

    if (
      selectedStart &&
      !checked &&
      (isNswNonWorkingDate(selectedStart) || rangeHasBlockedDate(selectedStart))
    ) {
      setSelectedStart(null);
    }
  }

  function handleBook() {
    if (!selectedStart || availabilityStatus !== 'ready' || loadError) return;
    setBookError(null);

    startBookingTransition(async () => {
      const result = await bookJobFromPublicQuoteAction(token, selectedStart, {
        includeNonWorkingDates: allowNonWorkingDates,
      });
      if (result.error) {
        setBookError(result.error);
        return;
      }
      // Compute end date for success display
      const endDate = buildBookingRange(
        selectedStart,
        resolvedWorkingDays,
        allowNonWorkingDates,
      ).endDate;
      setBookedResult({ startDate: selectedStart, endDate });
    });
  }

  // ── Success state ──
  if (bookedResult) {
    const isSingleDay = bookedResult.startDate === bookedResult.endDate;
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-primary">Booking Confirmed!</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {customerName ? `Thank you, ${customerName.split(' ')[0]}!` : 'Thank you!'}{' '}
              Your job has been booked.
            </p>
            <div className="mt-3 rounded-lg border border-primary/20 bg-white px-4 py-3 text-sm">
              <p className="font-medium text-on-surface">
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
              <p className="mt-1 text-on-surface-variant">
                {resolvedWorkingDays} working day{resolvedWorkingDays !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-on-surface-variant">
          The painter will be in touch to confirm details.
        </p>
      </div>
    );
  }

  const selectedEndDate = selectedStart
    ? buildBookingRange(selectedStart, resolvedWorkingDays, allowNonWorkingDates).endDate
    : null;
  const isAvailabilityUnavailable = availabilityStatus !== 'ready' || Boolean(loadError);
  const availabilityErrorMessage =
    availabilityMessage ??
    loadError ??
    'We cannot confirm calendar availability right now.';

  // ── Date picker UI ──
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <p className="text-sm font-medium text-primary">
          Choose a start date for your{' '}
          <span className="font-bold">{resolvedWorkingDays} day{resolvedWorkingDays !== 1 ? 's' : ''}</span>{' '}
          painting job.
        </p>
        <p className="mt-1 text-xs text-on-surface-variant">
          Weekends and NSW public holidays are skipped by default.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-outline bg-white px-4 py-3 shadow-sm">
        <input
          type="checkbox"
          checked={allowNonWorkingDates}
          onChange={(event) => handleNonWorkingToggle(event.target.checked)}
          className="mt-1 h-5 w-5 rounded border-outline text-primary focus:ring-primary-fixed"
        />
        <span>
          <span className="block text-sm font-semibold text-on-surface">
            I can include weekends and NSW public holidays
          </span>
          <span className="mt-0.5 block text-xs text-on-surface-variant">
            Turn this on if your painter has agreed these dates can be part of the booking.
          </span>
        </span>
      </label>

      {/* Calendar */}
      <div className="rounded-2xl border border-outline bg-white p-4 shadow-sm">
        {isLoadingDates ? (
          <CalendarSkeleton />
        ) : isAvailabilityUnavailable ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-error/30 bg-error-container/50 px-4 py-3">
              <p className="text-sm font-semibold text-on-error-container">
                Online booking is paused
              </p>
              <p className="mt-1 text-sm text-on-error-container">
                {availabilityErrorMessage} Please contact{' '}
                {contractorName ?? 'the painter'} to confirm a suitable start date.
              </p>
            </div>
            {(contractorPhone || contractorEmail) && (
              <div className="grid gap-2 sm:grid-cols-2">
                {contractorPhone && (
                  <a
                    href={`tel:${contractorPhone}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline bg-white px-4 py-3 text-sm font-semibold text-on-surface shadow-sm"
                  >
                    Call contractor
                  </a>
                )}
                {contractorEmail && (
                  <a
                    href={`mailto:${contractorEmail}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline bg-white px-4 py-3 text-sm font-semibold text-on-surface shadow-sm"
                  >
                    Email contractor
                  </a>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => void loadAvailableDates()}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary/90"
            >
              Check availability again
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
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-outline text-on-surface transition-colors hover:bg-surface-container-low active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <p className="text-sm font-bold text-on-surface">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </p>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next month"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-outline text-on-surface transition-colors hover:bg-surface-container-low active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="mb-1 grid grid-cols-7 gap-1">
              {DAY_LABELS.map((d) => (
                <div key={d} className="py-1 text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
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
                const nonWorkingReason = getNonWorkingDateReason(dateStr);
                const isNonWorking = nonWorkingReason != null;
                const isNonWorkingDisabled = isNonWorking && !allowNonWorkingDates;
                const hasBlockedRange = !isBlocked && !isPast && rangeHasBlockedDate(dateStr);
                const isToday = dateStr === today;
                const isStart = dateStr === selectedStart;
                const isInRange = rangeSet.has(dateStr) && !isStart;
                const isDisabled = isPast || isBlocked || isNonWorkingDisabled || hasBlockedRange;

                let cellClass =
                  'relative flex min-h-11 items-center justify-center rounded-xl text-sm font-medium transition-all select-none ';

                if (isPast) {
                  cellClass += 'cursor-not-allowed text-on-surface-variant/40 bg-surface-container-low/60';
                } else if (isBlocked) {
                  cellClass += 'cursor-not-allowed bg-error/20 text-on-error-container';
                } else if (isNonWorkingDisabled) {
                  cellClass += 'cursor-not-allowed bg-surface-container-low text-on-surface-variant/60';
                } else if (hasBlockedRange) {
                  cellClass += 'cursor-not-allowed bg-error/10 text-on-error-container/70';
                } else if (isStart) {
                  cellClass += 'cursor-pointer bg-primary text-on-primary font-bold shadow-sm active:scale-95';
                } else if (isInRange) {
                  cellClass += 'cursor-pointer bg-primary/20 text-primary font-semibold';
                } else {
                  cellClass += 'cursor-pointer hover:bg-surface-container-low text-on-surface active:scale-95';
                }

                if (isToday && !isStart && !isInRange) {
                  cellClass += ' ring-2 ring-primary/40 ring-inset';
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
                    aria-label={`${day} ${MONTH_NAMES[viewMonth]}${
                      isNonWorkingDisabled
                        ? nonWorkingReason === 'nsw_public_holiday'
                          ? ' (NSW public holiday)'
                          : ' (weekend)'
                        : isDisabled
                          ? ' (unavailable)'
                          : ''
                    }`}
                    aria-pressed={isStart}
                    className={cellClass}
                  >
                    {day}
                    {(isBlocked || hasBlockedRange) && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-error" />
                    )}
                    {isNonWorkingDisabled && !isBlocked && !hasBlockedRange && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-on-surface-variant/50" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 border-t border-outline/60 pt-3 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-primary/20 border border-primary/30" />
                Selected range
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-error/20" />
                Unavailable
              </span>
              {!allowNonWorkingDates && (
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-surface-container-low border border-outline" />
                  Weekend / NSW public holiday
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Booking summary + button */}
      {selectedStart && selectedEndDate && (
        <div className="space-y-3 rounded-2xl border border-outline bg-white p-4 shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Your Booking
            </p>
            <p className="mt-1.5 text-base font-semibold text-on-surface">
              {resolvedWorkingDays === 1 || selectedStart === selectedEndDate
                ? formatDisplayDate(selectedStart)
                : `${formatDisplayDate(selectedStart)} – ${formatDisplayDate(selectedEndDate)}`}
            </p>
            <p className="mt-0.5 text-sm text-on-surface-variant">
              {resolvedWorkingDays} working day{resolvedWorkingDays !== 1 ? 's' : ''}
              {allowNonWorkingDates ? ', including weekends or NSW public holidays if selected' : ', excluding weekends and NSW public holidays'}
            </p>
          </div>

          {bookError && (
            <div className="flex items-center gap-2 rounded-xl border border-error/30 bg-error-container/50 px-4 py-3">
              <svg className="h-4 w-4 shrink-0 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-on-error-container">{bookError}</p>
            </div>
          )}

          <button
            type="button"
            disabled={isBooking || isAvailabilityUnavailable}
            onClick={handleBook}
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold text-on-primary shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-outline"
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
