export type BookingRange = {
  scheduledDates: string[];
  endDate: string;
  spanDates: string[];
};

function formatDateYMD(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateYMD(value: string): Date {
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateValue(year: number, month: number, day: number): string {
  return formatDateYMD(new Date(Date.UTC(year, month - 1, day)));
}

function substituteIfWeekend(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();

  if (weekday === 6) return formatDateYMD(addDays(date, 2));
  if (weekday === 0) return formatDateYMD(addDays(date, 1));
  return formatDateYMD(date);
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return formatDateYMD(addDays(first, offset + (nth - 1) * 7));
}

function calculateEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
}

export function getNswPublicHolidays(year: number): Set<string> {
  const easterSunday = calculateEasterSunday(year);
  const christmasDay = new Date(Date.UTC(year, 11, 25));
  const boxingDay = new Date(Date.UTC(year, 11, 26));
  const christmasWeekday = christmasDay.getUTCDay();
  const boxingWeekday = boxingDay.getUTCDay();
  const christmasSubstitute =
    christmasWeekday === 6 || christmasWeekday === 0
      ? dateValue(year, 12, 27)
      : dateValue(year, 12, 25);
  const boxingSubstitute =
    boxingWeekday === 6 || boxingWeekday === 0
      ? dateValue(year, 12, 28)
      : dateValue(year, 12, 26);
  const holidays = new Set<string>([
    dateValue(year, 1, 1),
    substituteIfWeekend(year, 1, 1),
    substituteIfWeekend(year, 1, 26),
    formatDateYMD(addDays(easterSunday, -2)),
    formatDateYMD(addDays(easterSunday, -1)),
    formatDateYMD(easterSunday),
    formatDateYMD(addDays(easterSunday, 1)),
    dateValue(year, 4, 25),
    nthWeekdayOfMonth(year, 6, 1, 2),
    nthWeekdayOfMonth(year, 10, 1, 1),
    dateValue(year, 12, 25),
    dateValue(year, 12, 26),
    christmasSubstitute,
    boxingSubstitute,
  ]);

  return holidays;
}

export function isWeekendDate(dateValueYMD: string): boolean {
  const day = parseDateYMD(dateValueYMD).getUTCDay();
  return day === 0 || day === 6;
}

export function isNswPublicHoliday(dateValueYMD: string): boolean {
  const year = parseDateYMD(dateValueYMD).getUTCFullYear();
  return getNswPublicHolidays(year).has(dateValueYMD);
}

export function getNonWorkingDateReason(dateValueYMD: string): 'weekend' | 'nsw_public_holiday' | null {
  if (isNswPublicHoliday(dateValueYMD)) return 'nsw_public_holiday';
  if (isWeekendDate(dateValueYMD)) return 'weekend';
  return null;
}

export function isNswNonWorkingDate(dateValueYMD: string): boolean {
  return getNonWorkingDateReason(dateValueYMD) != null;
}

export function buildBookingRange(
  startDate: string,
  durationDays: number,
  includeNonWorkingDates: boolean,
): BookingRange {
  const normalizedDuration = Math.min(30, Math.max(1, Math.round(durationDays)));
  const scheduledDates: string[] = [];
  let cursor = parseDateYMD(startDate);

  while (scheduledDates.length < normalizedDuration) {
    const current = formatDateYMD(cursor);
    if (includeNonWorkingDates || !isNswNonWorkingDate(current)) {
      scheduledDates.push(current);
    }
    cursor = addDays(cursor, 1);
  }

  const endDate = scheduledDates[scheduledDates.length - 1] ?? startDate;
  const spanDates: string[] = [];
  let spanCursor = parseDateYMD(startDate);

  while (formatDateYMD(spanCursor) <= endDate) {
    spanDates.push(formatDateYMD(spanCursor));
    spanCursor = addDays(spanCursor, 1);
  }

  return { scheduledDates, endDate, spanDates };
}
