import { describe, expect, it } from 'vitest';
import {
  getDashboardPaidThisMonthCents,
  getStalestSentQuoteActivityAgeDays,
} from './dashboard-metrics';

describe('getDashboardPaidThisMonthCents', () => {
  it('uses paid status, Sydney paid_date month, and paid amount only', () => {
    const total = getDashboardPaidThisMonthCents(
      [
        {
          effective_status: 'paid',
          paid_date: '2026-07-01',
          amount_paid_cents: 25000,
        },
        {
          effective_status: 'paid',
          paid_date: '2026-06-30',
          amount_paid_cents: 90000,
        },
        {
          effective_status: 'sent',
          paid_date: '2026-07-02',
          amount_paid_cents: 50000,
        },
      ],
      new Date('2026-06-30T14:30:00.000Z')
    );

    expect(total).toBe(25000);
  });
});

describe('getStalestSentQuoteActivityAgeDays', () => {
  it('reports the oldest sent quote activity and ignores other statuses', () => {
    expect(
      getStalestSentQuoteActivityAgeDays(
        [
          { status: 'sent', updated_at: '2026-07-16T00:00:00.000Z' },
          { status: 'sent', updated_at: '2026-07-08T00:00:00.000Z' },
          { status: 'draft', updated_at: '2026-06-01T00:00:00.000Z' },
        ],
        new Date('2026-07-18T00:00:00.000Z')
      )
    ).toBe(10);
  });

  it('returns null when no sent quote needs follow-up', () => {
    expect(
      getStalestSentQuoteActivityAgeDays(
        [{ status: 'approved', updated_at: '2026-07-08T00:00:00.000Z' }],
        new Date('2026-07-18T00:00:00.000Z')
      )
    ).toBeNull();
  });
});
