'use client';

import { useCallback, useState, useTransition } from 'react';
import {
  buildBookingRange,
  getNonWorkingDateReason,
  isNswNonWorkingDate,
} from '@/modules/schedule/domain/nsw-public-holidays';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { SectionLabel } from '@/components/ui/SectionLabel';

export type PublicDateAvailabilityResult = {
  blockedDates: string[];
  workingDays: number;
  error: string | null;
  availabilityStatus?: 'ready' | 'degraded' | 'unavailable';
  availabilityMessage?: string | null;
};

export type GetAvailableDatesAction = (
  token: string
) => Promise<PublicDateAvailabilityResult>;

export type BookJobFromPublicQuoteAction = (
  token: string,
  startDate: string,
  options?: { includeNonWorkingDates?: boolean }
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
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function CalendarSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading calendar"
      className="animate-pulse space-y-3"
    >
      <div className="flex items-center justify-between px-1">
        <div className="bg-outline h-8 w-8 rounded-xl" />
        <div className="bg-outline h-5 w-32 rounded-md" />
        <div className="bg-outline h-8 w-8 rounded-xl" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-outline/60 h-6 rounded" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface-container-low min-h-11 rounded-xl"
          />
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
    () => new Set(initialBlockedDates)
  );
  const [resolvedWorkingDays, setResolvedWorkingDays] =
    useState(initialWorkingDays);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(initialLoadError);
  const [availabilityStatus, setAvailabilityStatus] = useState<
    'ready' | 'degraded' | 'unavailable'
  >(initialAvailabilityStatus ?? (initialLoadError ? 'unavailable' : 'ready'));
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(
    initialAvailabilityMessage
  );
  const [isBooking, startBookingTransition] = useTransition();
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookedResult, setBookedResult] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);

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
      buildBookingRange(
        selectedStart,
        resolvedWorkingDays,
        allowNonWorkingDates
      ).scheduledDates
    );
  }, [selectedStart, resolvedWorkingDays, allowNonWorkingDates]);

  const rangeSet = highlightRange();

  function rangeHasBlockedDate(startDate: string) {
    const bookingRange = buildBookingRange(
      startDate,
      resolvedWorkingDays,
      allowNonWorkingDates
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
        allowNonWorkingDates
      ).endDate;
      setBookedResult({ startDate: selectedStart, endDate });
    });
  }

  // ── Success state ──
  if (bookedResult) {
    const isSingleDay = bookedResult.startDate === bookedResult.endDate;
    return (
      <div className="space-y-4">
        <div className="border-success/30 bg-success-container flex items-start gap-3 rounded-2xl border px-4 py-5">
          <div className="bg-success/15 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <svg
              className="text-on-success-container h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
          </div>
          <div>
            <p className="text-on-success-container font-semibold">
              Booking Confirmed!
            </p>
            <p className="text-on-success-container mt-1 text-sm">
              {customerName
                ? `Thank you, ${customerName.split(' ')[0]}!`
                : 'Thank you!'}{' '}
              Your job has been booked.
            </p>
            <div className="border-success/20 bg-surface-container-lowest mt-3 rounded-xl border px-4 py-3 text-sm">
              <p className="text-on-surface font-medium">
                {isSingleDay ? (
                  formatDisplayDate(bookedResult.startDate)
                ) : (
                  <>
                    {formatDisplayDate(bookedResult.startDate)} –{' '}
                    {formatDisplayDate(bookedResult.endDate)}
                  </>
                )}
              </p>
              <p className="text-on-surface-variant mt-1">
                {resolvedWorkingDays} working day
                {resolvedWorkingDays !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
        <p className="text-on-surface-variant text-center text-xs">
          The painter will be in touch to confirm details.
        </p>
      </div>
    );
  }

  const selectedEndDate = selectedStart
    ? buildBookingRange(
        selectedStart,
        resolvedWorkingDays,
        allowNonWorkingDates
      ).endDate
    : null;
  const isAvailabilityUnavailable =
    availabilityStatus !== 'ready' || Boolean(loadError);
  const availabilityErrorMessage =
    availabilityMessage ??
    loadError ??
    'We cannot confirm calendar availability right now.';

  // ── Date picker UI ──
  return (
    <div className="space-y-5">
      <div className="border-primary/20 bg-primary-container text-on-primary-container rounded-2xl border px-4 py-3">
        <p className="text-on-primary-container text-sm font-medium">
          Choose a start date for your{' '}
          <span className="font-bold">
            {resolvedWorkingDays} day{resolvedWorkingDays !== 1 ? 's' : ''}
          </span>{' '}
          painting job.
        </p>
        <p className="text-on-surface-variant mt-1 text-xs">
          Weekends and NSW public holidays are skipped by default.
        </p>
      </div>

      <label className="border-outline-variant bg-surface-container-lowest focus-within:ring-primary/20 flex min-h-11 items-start gap-3 rounded-xl border px-4 py-3 shadow-sm focus-within:ring-2">
        <input
          type="checkbox"
          checked={allowNonWorkingDates}
          onChange={(event) => handleNonWorkingToggle(event.target.checked)}
          className="border-outline-variant text-primary focus-visible:ring-primary/30 mt-1 h-5 w-5 rounded"
        />
        <span>
          <span className="text-on-surface block text-sm font-semibold">
            I can include weekends and NSW public holidays
          </span>
          <span className="text-on-surface-variant mt-0.5 block text-xs">
            Turn this on if your painter has agreed these dates can be part of
            the booking.
          </span>
        </span>
      </label>

      {/* Calendar */}
      <div className="border-outline bg-surface-container-lowest rounded-2xl border p-4 shadow-sm">
        {isLoadingDates ? (
          <CalendarSkeleton />
        ) : isAvailabilityUnavailable ? (
          <div className="space-y-4">
            <ErrorAlert className="rounded-2xl">
              <p className="text-on-error-container text-sm font-semibold">
                Online booking is paused
              </p>
              <p className="text-on-error-container mt-1 text-sm">
                {availabilityErrorMessage} Please contact{' '}
                {contractorName ?? 'the painter'} to confirm a suitable start
                date.
              </p>
            </ErrorAlert>
            {(contractorPhone || contractorEmail) && (
              <div className="grid gap-2 sm:grid-cols-2">
                {contractorPhone && (
                  <a
                    href={`tel:${contractorPhone}`}
                    className="border-outline-variant bg-surface-container-lowest text-on-surface focus-visible:ring-primary/30 inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Call contractor
                  </a>
                )}
                {contractorEmail && (
                  <a
                    href={`mailto:${contractorEmail}`}
                    className="border-outline-variant bg-surface-container-lowest text-on-surface focus-visible:ring-primary/30 inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Email contractor
                  </a>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => void loadAvailableDates()}
              className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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
                className="border-outline-variant text-on-surface hover:bg-surface-container-low focus-visible:ring-primary/30 flex min-h-11 min-w-11 items-center justify-center rounded-xl border transition-colors focus-visible:ring-2 focus-visible:outline-none active:scale-95"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
              <p className="text-on-surface text-sm font-bold">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </p>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next month"
                className="border-outline-variant text-on-surface hover:bg-surface-container-low focus-visible:ring-primary/30 flex min-h-11 min-w-11 items-center justify-center rounded-xl border transition-colors focus-visible:ring-2 focus-visible:outline-none active:scale-95"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="mb-1 grid grid-cols-7 gap-1">
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="text-on-surface-variant py-1 text-center text-[10px] font-bold tracking-widest uppercase"
                >
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
                const isNonWorkingDisabled =
                  isNonWorking && !allowNonWorkingDates;
                const hasBlockedRange =
                  !isBlocked && !isPast && rangeHasBlockedDate(dateStr);
                const isToday = dateStr === today;
                const isStart = dateStr === selectedStart;
                const isInRange = rangeSet.has(dateStr) && !isStart;
                const isDisabled =
                  isPast ||
                  isBlocked ||
                  isNonWorkingDisabled ||
                  hasBlockedRange;

                let cellClass =
                  'relative flex min-h-11 items-center justify-center rounded-xl text-sm font-medium transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset ';

                if (isPast) {
                  cellClass +=
                    'cursor-not-allowed text-on-surface-variant/40 bg-surface-container-low/60';
                } else if (isBlocked) {
                  cellClass +=
                    'cursor-not-allowed bg-error/20 text-on-error-container';
                } else if (isNonWorkingDisabled) {
                  cellClass +=
                    'cursor-not-allowed bg-surface-container-low text-on-surface-variant/60';
                } else if (hasBlockedRange) {
                  cellClass +=
                    'cursor-not-allowed bg-error/10 text-on-error-container/70';
                } else if (isStart) {
                  cellClass +=
                    'cursor-pointer bg-primary text-on-primary font-bold shadow-sm active:scale-95';
                } else if (isInRange) {
                  cellClass +=
                    'cursor-pointer bg-primary/20 text-primary font-semibold';
                } else {
                  cellClass +=
                    'cursor-pointer hover:bg-surface-container-low text-on-surface active:scale-95';
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
                      <span className="bg-error absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" />
                    )}
                    {isNonWorkingDisabled && !isBlocked && !hasBlockedRange && (
                      <span className="bg-on-surface-variant/50 absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="border-outline/60 text-on-surface-variant mt-4 flex flex-wrap gap-4 border-t pt-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="bg-primary/20 border-primary/30 h-3 w-3 rounded-sm border" />
                Selected range
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-error/20 h-3 w-3 rounded-sm" />
                Unavailable
              </span>
              {!allowNonWorkingDates && (
                <span className="flex items-center gap-1.5">
                  <span className="bg-surface-container-low border-outline h-3 w-3 rounded-sm border" />
                  Weekend / NSW public holiday
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Booking summary + button */}
      {selectedStart && selectedEndDate && (
        <div className="border-outline bg-surface-container-lowest space-y-3 rounded-2xl border p-4 shadow-sm">
          <div>
            <SectionLabel>Your Booking</SectionLabel>
            <p className="text-on-surface mt-1.5 text-base font-semibold">
              {resolvedWorkingDays === 1 || selectedStart === selectedEndDate
                ? formatDisplayDate(selectedStart)
                : `${formatDisplayDate(selectedStart)} – ${formatDisplayDate(selectedEndDate)}`}
            </p>
            <p className="text-on-surface-variant mt-0.5 text-sm">
              {resolvedWorkingDays} working day
              {resolvedWorkingDays !== 1 ? 's' : ''}
              {allowNonWorkingDates
                ? ', including weekends or NSW public holidays if selected'
                : ', excluding weekends and NSW public holidays'}
            </p>
          </div>

          {bookError && <ErrorAlert>{bookError}</ErrorAlert>}

          <button
            type="button"
            disabled={isBooking || isAvailabilityUnavailable}
            onClick={handleBook}
            className="bg-primary text-on-primary hover:bg-primary/90 focus-visible:ring-primary/30 disabled:bg-outline inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-bold shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed"
          >
            {isBooking ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Booking...
              </>
            ) : (
              <>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
                Book {resolvedWorkingDays} day
                {resolvedWorkingDays !== 1 ? 's' : ''} starting{' '}
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
