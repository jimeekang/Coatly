import { describe, expect, it } from 'vitest';

/**
 * Unit tests for the date range calculation logic used in bookJobFromPublicQuote.
 *
 * The helper calculates end_date as:
 *   end_date = start_date + (working_days - 1) calendar days
 *
 * e.g. working_days=1 → end = start (same day)
 *      working_days=3 → end = start + 2 days
 *      working_days=5 → end = start + 4 days
 */

function calcEndDate(startDate: string, workingDays: number): string {
  const days = workingDays > 0 ? workingDays : 1;
  const start = new Date(`${startDate}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() + (days - 1));
  return start.toISOString().slice(0, 10);
}

describe('date range calculation', () => {
  it('calculates end date correctly for single day', () => {
    expect(calcEndDate('2026-04-15', 1)).toBe('2026-04-15');
  });

  it('calculates end date correctly for 3 days', () => {
    expect(calcEndDate('2026-04-15', 3)).toBe('2026-04-17');
  });

  it('calculates end date correctly for 5 days', () => {
    expect(calcEndDate('2026-04-15', 5)).toBe('2026-04-19');
  });

  it('calculates end date correctly when spanning a month boundary', () => {
    // April has 30 days: start Apr 29, 3 days → end May 1
    expect(calcEndDate('2026-04-29', 3)).toBe('2026-05-01');
  });

  it('treats 0 working_days as 1 day', () => {
    expect(calcEndDate('2026-04-15', 0)).toBe('2026-04-15');
  });
});
