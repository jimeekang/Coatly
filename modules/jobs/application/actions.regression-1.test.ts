import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  revalidatePathMock,
  getSubscriptionSnapshotForUserMock,
  syncBookedJobToGoogleCalendarMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  getSubscriptionSnapshotForUserMock: vi.fn(),
  syncBookedJobToGoogleCalendarMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));
vi.mock('@/modules/billing/application/access', () => ({
  getSubscriptionSnapshotForUser: getSubscriptionSnapshotForUserMock,
  getActiveSubscriptionRequiredMessage: vi.fn(),
}));
vi.mock('@/modules/schedule/application/job-calendar-sync', () => ({
  deleteGoogleCalendarEventForJob: vi.fn().mockResolvedValue({
    deleted: false,
    error: null,
  }),
  getGoogleBusyDatesForUser: vi.fn(),
  syncBookedJobToGoogleCalendar: syncBookedJobToGoogleCalendarMock,
}));

import { updateJob } from '@/modules/jobs/application/actions';

function filterQuery<T>(result: T) {
  return {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

// Regression: ISSUE-005 - completing a multi-day job collapsed it to one day
// Found by /qa on 2026-07-12
// Report: .gstack/qa-reports/qa-report-localhost-3000-2026-07-12.md
describe('updateJob schedule preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSubscriptionSnapshotForUserMock.mockResolvedValue({ active: true });
    syncBookedJobToGoogleCalendarMock.mockResolvedValue({
      synced: false,
      error: null,
    });
  });

  it('preserves all scheduled days when only job details or status change', async () => {
    const updatePayloads: Array<Record<string, unknown>> = [];
    const insertedScheduleRows: Array<Record<string, unknown>> = [];

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue(
              filterQuery({
                data: {
                  id: '550e8400-e29b-41d4-a716-446655440004',
                  quote_id: '550e8400-e29b-41d4-a716-446655440001',
                  status: 'scheduled',
                  scheduled_date: '2026-07-15',
                  start_date: '2026-07-15',
                  end_date: '2026-07-17',
                },
                error: null,
              })
            ),
            update: vi.fn((payload: Record<string, unknown>) => {
              updatePayloads.push(payload);
              return {
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              };
            }),
          };
        }

        if (table === 'job_schedule_days') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  { date: '2026-07-15' },
                  { date: '2026-07-16' },
                  { date: '2026-07-17' },
                ],
                error: null,
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
            insert: vi.fn(async (rows: Array<Record<string, unknown>>) => {
              insertedScheduleRows.push(...rows);
              return { error: null };
            }),
          };
        }

        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(
              filterQuery({
                data: { id: '550e8400-e29b-41d4-a716-446655440000' },
                error: null,
              })
            ),
          };
        }

        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(
              filterQuery({
                data: {
                  id: '550e8400-e29b-41d4-a716-446655440001',
                  customer_id: '550e8400-e29b-41d4-a716-446655440000',
                  quote_number: 'QUO-0001',
                  title: 'Interior repaint',
                },
                error: null,
              })
            ),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await updateJob('550e8400-e29b-41d4-a716-446655440004', {
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Interior repaint',
      status: 'completed',
      scheduled_date: '2026-07-15',
      notes: '',
    });

    expect(result).toEqual({ error: null });
    expect(updatePayloads[0]).toEqual(
      expect.objectContaining({
        status: 'completed',
        scheduled_date: '2026-07-15',
        start_date: '2026-07-15',
        end_date: '2026-07-17',
        duration_days: 3,
      })
    );
    expect(insertedScheduleRows.map((row) => row.date)).toEqual([
      '2026-07-15',
      '2026-07-16',
      '2026-07-17',
    ]);
  });
});
