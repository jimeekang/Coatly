import { describe, expect, it } from 'vitest';
import {
  buildBookingRange,
  getNonWorkingDateReason,
  getNswPublicHolidays,
  isNswNonWorkingDate,
} from './nsw-public-holidays';

describe('NSW public holiday calendar', () => {
  it('marks weekends and NSW public holidays as non-working dates', () => {
    expect(getNonWorkingDateReason('2026-04-11')).toBe('weekend');
    expect(getNonWorkingDateReason('2026-01-26')).toBe('nsw_public_holiday');
    expect(isNswNonWorkingDate('2026-04-07')).toBe(false);
  });

  it('includes Easter and Christmas substitute public holidays', () => {
    const holidays = getNswPublicHolidays(2026);

    expect(holidays.has('2026-04-03')).toBe(true);
    expect(holidays.has('2026-04-06')).toBe(true);
    expect(holidays.has('2026-12-28')).toBe(true);
  });

  it('skips non-working dates when building a default booking range', () => {
    expect(buildBookingRange('2026-04-03', 2, false)).toEqual({
      scheduledDates: ['2026-04-07', '2026-04-08'],
      endDate: '2026-04-08',
      spanDates: [
        '2026-04-03',
        '2026-04-04',
        '2026-04-05',
        '2026-04-06',
        '2026-04-07',
        '2026-04-08',
      ],
    });
  });

  it('includes non-working dates when the client opts in', () => {
    expect(buildBookingRange('2026-04-03', 2, true)).toEqual({
      scheduledDates: ['2026-04-03', '2026-04-04'],
      endDate: '2026-04-04',
      spanDates: ['2026-04-03', '2026-04-04'],
    });
  });
});
