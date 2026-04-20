import { describe, expect, it } from 'vitest';
import { expandBusyIntervalsToDates } from '@/lib/google-calendar/service';

describe('expandBusyIntervalsToDates', () => {
  it('maps timed events to blocked local dates', () => {
    const blocked = expandBusyIntervalsToDates(
      [
        {
          start: '2026-04-20T10:00:00+10:00',
          end: '2026-04-20T14:00:00+10:00',
        },
      ],
      'Australia/Sydney'
    );

    expect(blocked).toEqual(['2026-04-20']);
  });

  it('expands multi-day intervals across every blocked date', () => {
    const blocked = expandBusyIntervalsToDates(
      [
        {
          start: '2026-04-20T00:00:00+10:00',
          end: '2026-04-23T00:00:00+10:00',
        },
      ],
      'Australia/Sydney'
    );

    expect(blocked).toEqual(['2026-04-20', '2026-04-21', '2026-04-22']);
  });
});
