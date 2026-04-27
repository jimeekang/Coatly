import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  redirectMock,
  revalidatePathMock,
  createServerClientMock,
  createAdminClientMock,
  requireCurrentUserMock,
  getActiveSubscriptionRequiredMessageMock,
  getSubscriptionSnapshotForUserMock,
  getGoogleBusyDatesForUserMock,
  syncBookedJobToGoogleCalendarMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  createServerClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
  getActiveSubscriptionRequiredMessageMock: vi.fn(
    (actionName: string) =>
      `Choose a paid plan to unlock ${actionName}. Finish checkout before using Coatly tools.`,
  ),
  getSubscriptionSnapshotForUserMock: vi.fn(),
  getGoogleBusyDatesForUserMock: vi.fn(),
  syncBookedJobToGoogleCalendarMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/lib/supabase/request-context', () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

vi.mock('@/lib/subscription/access', () => ({
  getActiveSubscriptionRequiredMessage: getActiveSubscriptionRequiredMessageMock,
  getSubscriptionSnapshotForUser: getSubscriptionSnapshotForUserMock,
}));

vi.mock('@/lib/google-calendar/service', () => ({
  getGoogleBusyDatesForUser: getGoogleBusyDatesForUserMock,
  syncBookedJobToGoogleCalendar: syncBookedJobToGoogleCalendarMock,
}));

import {
  addJobScheduleDay,
  bookJobFromPublicQuote,
  createJob,
  createJobFromQuote,
  deleteJobScheduleDay,
  deleteJob,
  getAvailableDatesForToken,
  getJob,
  getJobDetail,
  getJobFormOptions,
  getJobs,
  updateJob,
  updateJobSchedule,
  updateJobScheduleDay,
} from '@/app/actions/jobs';

function createFilterQuery<Result>(result: Result) {
  return {
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    order: vi.fn().mockResolvedValue(result),
  };
}

function createEqInQuery<Result>(result: Result) {
  return {
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue(result),
  };
}

function createJobScheduleDaysTable(options?: {
  existingDates?: string[];
  jobId?: string;
  onInsert?: (payload: Array<Record<string, unknown>>) => void;
}) {
  return {
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
    insert: vi.fn().mockImplementation(async (payload: Array<Record<string, unknown>>) => {
      options?.onInsert?.(payload);
      return { error: null };
    }),
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: (options?.existingDates ?? []).map((date) => ({
          job_id: options?.jobId ?? 'job-1',
          date,
        })),
        error: null,
      }),
    }),
  };
}

describe('jobs actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    requireCurrentUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
    });
    getSubscriptionSnapshotForUserMock.mockResolvedValue({
      plan: 'pro',
      status: 'active',
      active: true,
      cancelScheduled: false,
      features: {
        ai: true,
        xeroSync: true,
        jobCosting: true,
        prioritySupport: true,
        unlimitedQuotes: true,
        activeQuoteLimit: null,
      },
    });
    getGoogleBusyDatesForUserMock.mockResolvedValue({
      blockedDates: [],
      error: null,
    });
    syncBookedJobToGoogleCalendarMock.mockResolvedValue({
      synced: false,
      error: null,
    });
  });

  it('loads jobs with customer and quote labels', async () => {
    const jobsQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValueOnce({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'job-1',
              customer_id: 'customer-1',
              quote_id: 'quote-1',
              title: 'Prep living room',
              status: 'scheduled',
              scheduled_date: '2026-04-05',
              start_date: null,
              end_date: null,
              duration_days: null,
              notes: 'Rear gate access',
              created_at: '2026-04-01T00:00:00.000Z',
              updated_at: '2026-04-01T00:00:00.000Z',
            },
          ],
          error: null,
        }),
      }),
    };

    createServerClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue(jobsQuery),
          };
        }

        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(
              createEqInQuery({
                data: [
                  {
                    id: 'customer-1',
                    name: 'Olivia Brown',
                    company_name: 'Brown Projects',
                    email: 'olivia@example.com',
                    address_line1: '12 Beach St',
                    city: 'Manly',
                    state: 'NSW',
                    postcode: '2095',
                  },
                ],
                error: null,
              }),
            ),
          };
        }

        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(
              createEqInQuery({
                data: [
                  {
                    id: 'quote-1',
                    quote_number: 'QUO-0012',
                    title: 'Living room repaint',
                    status: 'approved',
                    customer_id: 'customer-1',
                  },
                ],
                error: null,
              }),
            ),
          };
        }

        if (table === 'job_schedule_days') {
          return createJobScheduleDaysTable({
            existingDates: ['2026-04-05', '2026-04-07'],
          });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await getJobs();

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'job-1',
        schedule_dates: ['2026-04-05', '2026-04-07'],
        title: 'Prep living room',
        customer: expect.objectContaining({
          name: 'Olivia Brown',
          company_name: 'Brown Projects',
          address: '12 Beach St, Manly, NSW, 2095',
        }),
        quote: expect.objectContaining({
          quote_number: 'QUO-0012',
        }),
      }),
    ]);
  });

  it('loads a single job with explicit customer and quote mapping', async () => {
    const jobQuery = createFilterQuery({
      data: {
        id: 'job-1',
        customer_id: 'customer-1',
        quote_id: 'quote-1',
        title: 'Prep living room',
        status: 'scheduled',
        scheduled_date: '2026-04-05',
        start_date: null,
        end_date: null,
        duration_days: null,
        notes: null,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
      },
      error: null,
    });

    createServerClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'jobs') return { select: vi.fn().mockReturnValue(jobQuery) };
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(
              createEqInQuery({
                data: [
                  {
                    id: 'customer-1',
                    name: 'Olivia Brown',
                    company_name: null,
                    email: 'olivia@example.com',
                    address_line1: null,
                    city: null,
                    state: null,
                    postcode: null,
                  },
                ],
                error: null,
              }),
            ),
          };
        }
        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(
              createEqInQuery({
                data: [
                  {
                    id: 'quote-1',
                    quote_number: 'QUO-0012',
                    title: 'Living room repaint',
                    status: 'approved',
                    customer_id: 'customer-1',
                  },
                ],
                error: null,
              }),
            ),
          };
        }
        if (table === 'job_schedule_days') {
          return createJobScheduleDaysTable({
            existingDates: ['2026-04-05'],
          });
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await getJob('job-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual(
      expect.objectContaining({
        id: 'job-1',
        customer: expect.objectContaining({ name: 'Olivia Brown' }),
        quote: expect.objectContaining({ quote_number: 'QUO-0012' }),
      }),
    );
  });

  it('loads job detail after explicit job hydration', async () => {
    const jobQuery = createFilterQuery({
      data: {
        id: 'job-1',
        customer_id: 'customer-1',
        quote_id: 'quote-1',
        title: 'Prep living room',
        status: 'scheduled',
        scheduled_date: '2026-04-05',
        start_date: null,
        end_date: null,
        duration_days: null,
        notes: null,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
      },
      error: null,
    });
    const lineItemsQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'line-1',
            name: 'Walls',
            quantity: 2,
            unit_price_cents: 50000,
            total_cents: 100000,
            is_optional: false,
            is_selected: true,
            sort_order: 0,
          },
        ],
        error: null,
      }),
    };
    const variationsQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const invoiceQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'invoice-1',
            invoice_number: 'INV-0001',
            status: 'draft',
            total_cents: 100000,
          },
          error: null,
        }),
      }),
    };

    createServerClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'jobs') return { select: vi.fn().mockReturnValue(jobQuery) };
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(
              createEqInQuery({
                data: [
                  {
                    id: 'customer-1',
                    name: 'Olivia Brown',
                    company_name: null,
                    email: 'olivia@example.com',
                    address_line1: null,
                    city: null,
                    state: null,
                    postcode: null,
                  },
                ],
                error: null,
              }),
            ),
          };
        }
        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(
              createEqInQuery({
                data: [
                  {
                    id: 'quote-1',
                    quote_number: 'QUO-0012',
                    title: 'Living room repaint',
                    status: 'approved',
                    customer_id: 'customer-1',
                  },
                ],
                error: null,
              }),
            ),
          };
        }
        if (table === 'job_schedule_days') {
          return createJobScheduleDaysTable({
            existingDates: ['2026-04-05'],
          });
        }
        if (table === 'quote_line_items') return { select: vi.fn().mockReturnValue(lineItemsQuery) };
        if (table === 'job_variations') return { select: vi.fn().mockReturnValue(variationsQuery) };
        if (table === 'invoices') return { select: vi.fn().mockReturnValue(invoiceQuery) };
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await getJobDetail('job-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual(
      expect.objectContaining({
        id: 'job-1',
        quoteLineItems: [expect.objectContaining({ name: 'Walls' })],
        invoice: expect.objectContaining({ invoice_number: 'INV-0001' }),
      }),
    );
  });

  it('loads job form options for customers and quotes', async () => {
    const customersQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'customer-1',
            name: 'Olivia Brown',
            company_name: 'Brown Projects',
            email: 'olivia@example.com',
            address_line1: '12 Beach St',
            city: 'Manly',
            state: 'NSW',
            postcode: '2095',
          },
        ],
        error: null,
      }),
    };

    const quotesQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'quote-1',
            quote_number: 'QUO-0012',
            title: 'Living room repaint',
            customer_id: 'customer-1',
            status: 'approved',
          },
        ],
        error: null,
      }),
    };

    createServerClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(customersQuery),
          };
        }

        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(quotesQuery),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await getJobFormOptions();

    expect(result.error).toBeNull();
    expect(result.data.customers[0]).toEqual(
      expect.objectContaining({
        id: 'customer-1',
        address: '12 Beach St, Manly, NSW, 2095',
      }),
    );
    expect(result.data.quotes[0]).toEqual(
      expect.objectContaining({
        id: 'quote-1',
        customer_id: 'customer-1',
      }),
    );
  });

  it('creates a job and revalidates jobs and quote pages', async () => {
    const captured: { insert?: Record<string, unknown> } = {};
    const customerQuery = createFilterQuery({
      data: { id: 'customer-1' },
      error: null,
    });
    const quoteQuery = createFilterQuery({
      data: { id: 'quote-1', customer_id: '550e8400-e29b-41d4-a716-446655440000' },
      error: null,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(customerQuery),
          };
        }

        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(quoteQuery),
          };
        }

        if (table === 'jobs') {
          return {
            insert: vi.fn((payload) => {
              captured.insert = payload;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'job-created-1' },
                    error: null,
                  }),
                }),
              };
            }),
          };
        }

        if (table === 'job_schedule_days') return createJobScheduleDaysTable();

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await createJob({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Prep living room',
      status: 'scheduled',
      scheduled_date: '2026-04-05',
      notes: 'Rear gate access',
    });

    expect(result).toEqual({ error: null });
    expect(captured.insert).toEqual({
      user_id: 'user-1',
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Prep living room',
      status: 'scheduled',
      scheduled_date: '2026-04-05',
      start_date: '2026-04-05',
      end_date: '2026-04-05',
      duration_days: 1,
      notes: 'Rear gate access',
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/jobs');
    expect(revalidatePathMock).toHaveBeenCalledWith(
      '/quotes/550e8400-e29b-41d4-a716-446655440001',
    );
  });

  it('creates a job directly from a quote with default values', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-04T09:30:00.000Z'));

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'job-quote-1' },
          error: null,
        }),
      }),
    });
    const jobsExistingQuery = createFilterQuery({
      data: null,
      error: null,
    });
    const quoteQuery = createFilterQuery({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        quote_number: 'QUO-0012',
        title: 'Living room repaint',
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
      },
      error: null,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(quoteQuery),
          };
        }

        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue(jobsExistingQuery),
            insert: insertMock,
          };
        }

        if (table === 'job_schedule_days') return createJobScheduleDaysTable();

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await createJobFromQuote('550e8400-e29b-41d4-a716-446655440001');

    expect(result).toEqual({
      error: null,
      jobId: 'job-quote-1',
      existing: false,
    });
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Living room repaint',
      status: 'scheduled',
      scheduled_date: '2026-04-04',
      start_date: '2026-04-04',
      end_date: '2026-04-04',
      duration_days: 1,
      notes: null,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/jobs');
    expect(revalidatePathMock).toHaveBeenCalledWith(
      '/quotes/550e8400-e29b-41d4-a716-446655440001',
    );
  });

  it('reuses an existing job when the quote is already linked', async () => {
    const insertMock = vi.fn();
    const jobsExistingQuery = createFilterQuery({
      data: { id: 'job-existing-1' },
      error: null,
    });
    const quoteQuery = createFilterQuery({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        quote_number: 'QUO-0012',
        title: 'Living room repaint',
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
      },
      error: null,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(quoteQuery),
          };
        }

        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue(jobsExistingQuery),
            insert: insertMock,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await createJobFromQuote('550e8400-e29b-41d4-a716-446655440001');

    expect(result).toEqual({
      error: null,
      jobId: 'job-existing-1',
      existing: true,
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejects a job when the quote belongs to a different customer', async () => {
    const customerQuery = createFilterQuery({
      data: { id: 'customer-1' },
      error: null,
    });
    const quoteQuery = createFilterQuery({
      data: { id: 'quote-1', customer_id: 'different-customer' },
      error: null,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(customerQuery),
          };
        }

        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(quoteQuery),
          };
        }

        if (table === 'jobs') {
          return {
            insert: vi.fn(),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await createJob({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Prep living room',
      status: 'scheduled',
      scheduled_date: '2026-04-05',
      notes: '',
    });

    expect(result).toEqual({
      error: 'Quote customer does not match the selected customer.',
    });
  });

  it('updates an existing job', async () => {
    const customerQuery = createFilterQuery({
      data: { id: 'customer-1' },
      error: null,
    });
    const quoteQuery = createFilterQuery({
      data: { id: 'quote-2', customer_id: '550e8400-e29b-41d4-a716-446655440000' },
      error: null,
    });
    const existingJobQuery = createFilterQuery({
      data: { id: 'job-1', quote_id: 'quote-1' },
      error: null,
    });
    const eqUserMock = vi.fn().mockResolvedValue({ error: null });
    const eqIdMock = vi.fn().mockReturnValue({
      eq: eqUserMock,
    });
    const updateMock = vi.fn().mockReturnValue({
      eq: eqIdMock,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(customerQuery),
          };
        }

        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(quoteQuery),
          };
        }

        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue(existingJobQuery),
            update: updateMock,
          };
        }

        if (table === 'job_schedule_days') return createJobScheduleDaysTable();

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await updateJob('job-1', {
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: '550e8400-e29b-41d4-a716-446655440002',
      title: 'Finish living room',
      status: 'in_progress',
      scheduled_date: '2026-04-06',
      notes: 'Client home after 2pm',
    });

    expect(result).toEqual({ error: null });
    expect(updateMock).toHaveBeenCalledWith({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: '550e8400-e29b-41d4-a716-446655440002',
      title: 'Finish living room',
      status: 'in_progress',
      scheduled_date: '2026-04-06',
      start_date: '2026-04-06',
      end_date: '2026-04-06',
      duration_days: 1,
      notes: 'Client home after 2pm',
    });
    expect(eqIdMock).toHaveBeenCalledWith('id', 'job-1');
    expect(eqUserMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(revalidatePathMock).toHaveBeenCalledWith('/quotes/quote-1');
    expect(revalidatePathMock).toHaveBeenCalledWith(
      '/quotes/550e8400-e29b-41d4-a716-446655440002',
    );
  });

  it('returns an error when updating a missing job', async () => {
    const missingJobQuery = createFilterQuery({
      data: null,
      error: null,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue(missingJobQuery),
            update: vi.fn(),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await updateJob('missing-job', {
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: null,
      title: 'Missing job',
      status: 'scheduled',
      scheduled_date: '2026-04-07',
      notes: '',
    });

    expect(result).toEqual({ error: 'Job not found.' });
  });

  it('deletes a job and revalidates the linked quote', async () => {
    const existingJobQuery = createFilterQuery({
      data: { id: 'job-1', quote_id: 'quote-1' },
      error: null,
    });
    const eqUserMock = vi.fn().mockResolvedValue({ error: null });
    const eqIdMock = vi.fn().mockReturnValue({
      eq: eqUserMock,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue(existingJobQuery),
            delete: vi.fn().mockReturnValue({
              eq: eqIdMock,
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await deleteJob('job-1');

    expect(result).toEqual({ error: null });
    expect(eqIdMock).toHaveBeenCalledWith('id', 'job-1');
    expect(eqUserMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(revalidatePathMock).toHaveBeenCalledWith('/jobs');
    expect(revalidatePathMock).toHaveBeenCalledWith('/quotes/quote-1');
  });

  it('updates a job schedule range and checks overlap excluding itself', async () => {
    const existingJobQuery = createFilterQuery({
      data: { id: 'job-1', quote_id: null, status: 'scheduled' },
      error: null,
    });
    const rpcMock = vi.fn().mockResolvedValue({ data: false, error: null });
    const eqUserMock = vi.fn().mockResolvedValue({ error: null });
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqUserMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue(existingJobQuery),
            update: updateMock,
          };
        }

        if (table === 'job_schedule_days') return createJobScheduleDaysTable();

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await updateJobSchedule('job-1', {
      startDate: '2026-04-20',
      endDate: '2026-04-22',
    });

    expect(result).toEqual({ error: null });
    expect(rpcMock).toHaveBeenCalledWith('check_job_date_overlap', {
      p_user_id: 'user-1',
      p_start_date: '2026-04-20',
      p_end_date: '2026-04-22',
      p_exclude_job_id: 'job-1',
    });
    expect(updateMock).toHaveBeenCalledWith({
      scheduled_date: '2026-04-20',
      start_date: '2026-04-20',
      end_date: '2026-04-22',
      duration_days: 3,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/schedule');
    expect(revalidatePathMock).toHaveBeenCalledWith('/jobs/job-1');
  });

  it('blocks job schedule updates when the new range overlaps another active job', async () => {
    const existingJobQuery = createFilterQuery({
      data: { id: 'job-1', quote_id: null, status: 'scheduled' },
      error: null,
    });
    const updateMock = vi.fn();

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: vi.fn((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue(existingJobQuery),
            update: updateMock,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await updateJobSchedule('job-1', {
      startDate: '2026-04-20',
      endDate: '2026-04-22',
    });

    expect(result).toEqual({ error: 'Those dates overlap another active job.' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('moves only the dragged job day when rescheduling from the calendar', async () => {
    const existingJobQuery = createFilterQuery({
      data: {
        id: 'job-1',
        quote_id: null,
        status: 'scheduled',
        scheduled_date: '2026-04-20',
        start_date: '2026-04-20',
        end_date: '2026-04-25',
      },
      error: null,
    });
    const rpcMock = vi.fn().mockResolvedValue({ data: false, error: null });
    const eqUserMock = vi.fn().mockResolvedValue({ error: null });
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqUserMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
    let insertedScheduleDays: string[] = [];

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue(existingJobQuery),
            update: updateMock,
          };
        }

        if (table === 'job_schedule_days') {
          return createJobScheduleDaysTable({
            existingDates: [
              '2026-04-20',
              '2026-04-21',
              '2026-04-22',
              '2026-04-23',
              '2026-04-24',
              '2026-04-25',
            ],
            onInsert: (payload) => {
              insertedScheduleDays = payload.map((row) => String(row.date));
            },
          });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await updateJobScheduleDay('job-1', {
      fromDate: '2026-04-22',
      toDate: '2026-04-26',
    });

    expect(result).toEqual({ error: null });
    expect(rpcMock).toHaveBeenCalledWith('check_job_date_overlap', {
      p_user_id: 'user-1',
      p_start_date: '2026-04-26',
      p_end_date: '2026-04-26',
      p_exclude_job_id: 'job-1',
    });
    expect(insertedScheduleDays).toEqual([
      '2026-04-20',
      '2026-04-21',
      '2026-04-23',
      '2026-04-24',
      '2026-04-25',
      '2026-04-26',
    ]);
    expect(updateMock).toHaveBeenCalledWith({
      scheduled_date: '2026-04-20',
      start_date: '2026-04-20',
      end_date: '2026-04-26',
      duration_days: 6,
    });
  });

  it('rejects moving a job day onto another existing day for the same job', async () => {
    const existingJobQuery = createFilterQuery({
      data: {
        id: 'job-1',
        quote_id: null,
        status: 'scheduled',
        scheduled_date: '2026-04-20',
        start_date: '2026-04-20',
        end_date: '2026-04-25',
      },
      error: null,
    });
    const updateMock = vi.fn();

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      rpc: vi.fn(),
      from: vi.fn((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue(existingJobQuery),
            update: updateMock,
          };
        }

        if (table === 'job_schedule_days') {
          return createJobScheduleDaysTable({
            existingDates: [
              '2026-04-20',
              '2026-04-21',
              '2026-04-22',
              '2026-04-23',
              '2026-04-24',
              '2026-04-25',
            ],
          });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await updateJobScheduleDay('job-1', {
      fromDate: '2026-04-22',
      toDate: '2026-04-24',
    });

    expect(result).toEqual({ error: 'This job is already scheduled on that date.' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('adds a single scheduled day to a job without rebuilding the full range', async () => {
    const existingJobQuery = createFilterQuery({
      data: {
        id: 'job-1',
        quote_id: null,
        status: 'scheduled',
        scheduled_date: '2026-04-20',
        start_date: '2026-04-20',
        end_date: '2026-04-22',
      },
      error: null,
    });
    const rpcMock = vi.fn().mockResolvedValue({ data: false, error: null });
    const eqUserMock = vi.fn().mockResolvedValue({ error: null });
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqUserMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
    let insertedScheduleDays: string[] = [];

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue(existingJobQuery),
            update: updateMock,
          };
        }

        if (table === 'job_schedule_days') {
          return createJobScheduleDaysTable({
            existingDates: ['2026-04-20', '2026-04-22'],
            onInsert: (payload) => {
              insertedScheduleDays = payload.map((row) => String(row.date));
            },
          });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await addJobScheduleDay('job-1', { date: '2026-04-24' });

    expect(result).toEqual({ error: null });
    expect(rpcMock).toHaveBeenCalledWith('check_job_date_overlap', {
      p_user_id: 'user-1',
      p_start_date: '2026-04-24',
      p_end_date: '2026-04-24',
      p_exclude_job_id: 'job-1',
    });
    expect(insertedScheduleDays).toEqual(['2026-04-20', '2026-04-22', '2026-04-24']);
    expect(updateMock).toHaveBeenCalledWith({
      scheduled_date: '2026-04-20',
      start_date: '2026-04-20',
      end_date: '2026-04-24',
      duration_days: 3,
    });
  });

  it('deletes one scheduled day from a job and keeps the remaining dates', async () => {
    const existingJobQuery = createFilterQuery({
      data: {
        id: 'job-1',
        quote_id: null,
        status: 'scheduled',
        scheduled_date: '2026-04-20',
        start_date: '2026-04-20',
        end_date: '2026-04-24',
      },
      error: null,
    });
    const rpcMock = vi.fn();
    const eqUserMock = vi.fn().mockResolvedValue({ error: null });
    const eqIdMock = vi.fn().mockReturnValue({ eq: eqUserMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
    let insertedScheduleDays: string[] = [];

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue(existingJobQuery),
            update: updateMock,
          };
        }

        if (table === 'job_schedule_days') {
          return createJobScheduleDaysTable({
            existingDates: ['2026-04-20', '2026-04-22', '2026-04-24'],
            onInsert: (payload) => {
              insertedScheduleDays = payload.map((row) => String(row.date));
            },
          });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await deleteJobScheduleDay('job-1', { date: '2026-04-20' });

    expect(result).toEqual({ error: null });
    expect(rpcMock).not.toHaveBeenCalled();
    expect(insertedScheduleDays).toEqual(['2026-04-22', '2026-04-24']);
    expect(updateMock).toHaveBeenCalledWith({
      scheduled_date: '2026-04-22',
      start_date: '2026-04-22',
      end_date: '2026-04-24',
      duration_days: 2,
    });
  });

  it('rejects deleting the last remaining scheduled day for a job', async () => {
    const existingJobQuery = createFilterQuery({
      data: {
        id: 'job-1',
        quote_id: null,
        status: 'scheduled',
        scheduled_date: '2026-04-20',
        start_date: '2026-04-20',
        end_date: '2026-04-20',
      },
      error: null,
    });
    const updateMock = vi.fn();

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      rpc: vi.fn(),
      from: vi.fn((table: string) => {
        if (table === 'jobs') {
          return {
            select: vi.fn().mockReturnValue(existingJobQuery),
            update: updateMock,
          };
        }

        if (table === 'job_schedule_days') {
          return createJobScheduleDaysTable({
            existingDates: ['2026-04-20'],
          });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await deleteJobScheduleDay('job-1', { date: '2026-04-20' });

    expect(result).toEqual({ error: 'A job must keep at least one scheduled day.' });
    expect(updateMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// bookJobFromPublicQuote
// ---------------------------------------------------------------------------

describe('bookJobFromPublicQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T00:00:00.000Z'));
    getGoogleBusyDatesForUserMock.mockResolvedValue({
      blockedDates: [],
      error: null,
    });
    syncBookedJobToGoogleCalendarMock.mockResolvedValue({
      synced: false,
      error: null,
    });
  });

  function makeQuoteTokenQuery(quote: Record<string, unknown> | null) {
    return {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: quote, error: null }),
    };
  }

  it('creates job with correct date range when quote is approved', async () => {
    const insertedJob = { id: 'job-1' };
    const insertSelectSingleMock = vi.fn().mockResolvedValue({ data: insertedJob, error: null });
    const insertSelectMock = vi.fn().mockReturnValue({ single: insertSelectSingleMock });
    const insertMock = vi.fn().mockReturnValue({ select: insertSelectMock });

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') {
          return { select: vi.fn().mockReturnValue(makeQuoteTokenQuery({ id: 'quote-1', status: 'approved', working_days: 3, user_id: 'uid-1', customer_id: 'customer-1', title: 'Fence paint', quote_number: 'Q-001' })) };
        }
        if (table === 'jobs') return { insert: insertMock };
        if (table === 'job_schedule_days') return createJobScheduleDaysTable();
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    });

    const result = await bookJobFromPublicQuote('valid-token', '2026-04-15');

    expect(result.error).toBeNull();
    expect(result.jobId).toBe('job-1');
    const insertPayload = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertPayload.start_date).toBe('2026-04-15');
    expect(insertPayload.end_date).toBe('2026-04-17');
    expect(insertPayload.duration_days).toBe(3);
  });

  it('returns error when quote is not approved', async () => {
    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') return { select: vi.fn().mockReturnValue(makeQuoteTokenQuery({ id: 'quote-2', status: 'sent', working_days: 2, user_id: 'uid-1', customer_id: 'customer-1', title: 'Deck coat', quote_number: 'Q-002' })) };
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    });

    const result = await bookJobFromPublicQuote('token-sent', '2026-04-15');

    expect(result.error).not.toBeNull();
    expect(result.jobId).toBeNull();
    const errorLower = (result.error ?? '').toLowerCase();
    expect(errorLower.includes('approved') || errorLower.includes('승인')).toBe(true);
  });

  it('returns error for invalid token', async () => {
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn().mockReturnValue(makeQuoteTokenQuery(null)) })),
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    });

    const result = await bookJobFromPublicQuote('invalid-token', '2026-04-15');

    expect(result.error).not.toBeNull();
    expect(result.jobId).toBeNull();
  });

  it('returns error when date range conflicts with existing job', async () => {
    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') return { select: vi.fn().mockReturnValue(makeQuoteTokenQuery({ id: 'quote-3', status: 'approved', working_days: 3, user_id: 'uid-1', customer_id: 'customer-1', title: 'Trim repaint', quote_number: 'Q-003' })) };
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    });

    const result = await bookJobFromPublicQuote('token-conflict', '2026-04-15');

    expect(result.error).not.toBeNull();
    expect(result.jobId).toBeNull();
  });

  it('returns error when start date is in the past', async () => {
    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') return { select: vi.fn().mockReturnValue(makeQuoteTokenQuery({ id: 'quote-4', status: 'approved', working_days: 2, user_id: 'uid-1', customer_id: 'customer-1', title: 'Roof coat', quote_number: 'Q-004' })) };
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    });

    const result = await bookJobFromPublicQuote('token-past', '2020-01-01');

    expect(result.error).not.toBeNull();
    expect(result.jobId).toBeNull();
  });

  it('blocks NSW weekend and public holiday starts unless the client opts in', async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: false, error: null });

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') return { select: vi.fn().mockReturnValue(makeQuoteTokenQuery({ id: 'quote-weekend', status: 'approved', working_days: 2, user_id: 'uid-1', customer_id: 'customer-1', title: 'Weekend job', quote_number: 'Q-007' })) };
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: rpcMock,
    });

    const result = await bookJobFromPublicQuote('token-weekend', '2026-04-04');

    expect(result.error).toMatch(/weekends and nsw public holidays/i);
    expect(result.jobId).toBeNull();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('allows weekend and NSW public holiday dates when the client opts in', async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'job-weekend' }, error: null }),
      }),
    });

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') return { select: vi.fn().mockReturnValue(makeQuoteTokenQuery({ id: 'quote-weekend-ok', status: 'approved', working_days: 2, user_id: 'uid-1', customer_id: 'customer-1', title: 'Weekend job', quote_number: 'Q-008' })) };
        if (table === 'jobs') return { insert: insertMock };
        if (table === 'job_schedule_days') return createJobScheduleDaysTable();
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    });

    const result = await bookJobFromPublicQuote('token-weekend-ok', '2026-04-04', {
      includeNonWorkingDates: true,
    });

    expect(result.error).toBeNull();
    expect(result.jobId).toBe('job-weekend');
    const insertPayload = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertPayload.start_date).toBe('2026-04-04');
    expect(insertPayload.end_date).toBe('2026-04-05');
    expect(insertPayload.duration_days).toBe(2);
  });

  it('uses 1 day when working_days is null', async () => {
    const insertedJob = { id: 'job-2' };
    const insertSelectSingleMock = vi.fn().mockResolvedValue({ data: insertedJob, error: null });
    const insertMock = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: insertSelectSingleMock }) });

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') return { select: vi.fn().mockReturnValue(makeQuoteTokenQuery({ id: 'quote-5', status: 'approved', working_days: null, user_id: 'uid-1', customer_id: 'customer-1', title: 'Quick touch up', quote_number: 'Q-005' })) };
        if (table === 'jobs') return { insert: insertMock };
        if (table === 'job_schedule_days') return createJobScheduleDaysTable();
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    });

    const result = await bookJobFromPublicQuote('token-null-days', '2026-04-15');

    expect(result.error).toBeNull();
    const insertPayload = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertPayload.start_date).toBe('2026-04-15');
    expect(insertPayload.end_date).toBe('2026-04-15');
    expect(insertPayload.duration_days).toBe(1);
  });

  it('calculates end_date correctly for 3 working days (Apr 15 → Apr 17)', async () => {
    const insertMock = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'job-3' }, error: null }) }) });

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') return { select: vi.fn().mockReturnValue(makeQuoteTokenQuery({ id: 'quote-6', status: 'approved', working_days: 3, user_id: 'uid-1', customer_id: 'customer-1', title: 'Full exterior', quote_number: 'Q-006' })) };
        if (table === 'jobs') return { insert: insertMock };
        if (table === 'job_schedule_days') return createJobScheduleDaysTable();
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    });

    await bookJobFromPublicQuote('token-3day', '2026-04-15');

    const insertPayload = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertPayload.start_date).toBe('2026-04-15');
    expect(insertPayload.end_date).toBe('2026-04-17');
  });

  it('syncs booked jobs to Google Calendar after job creation', async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'job-google-1' }, error: null }),
      }),
    });

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(
              makeQuoteTokenQuery({
                id: 'quote-google-1',
                status: 'approved',
                working_days: 2,
                user_id: 'uid-1',
                customer_id: 'customer-1',
                title: 'Interior repaint',
                quote_number: 'Q-100',
              })
            ),
          };
        }
        if (table === 'jobs') return { insert: insertMock };
        if (table === 'job_schedule_days') return createJobScheduleDaysTable();
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    });

    const result = await bookJobFromPublicQuote('token-google-sync', '2026-04-15');

    expect(result.error).toBeNull();
    expect(syncBookedJobToGoogleCalendarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'uid-1',
        jobId: 'job-google-1',
        quoteId: 'quote-google-1',
        quoteNumber: 'Q-100',
        startDate: '2026-04-15',
        endDate: '2026-04-16',
      })
    );
  });
});

// ---------------------------------------------------------------------------
// getAvailableDatesForToken
// ---------------------------------------------------------------------------

describe('getAvailableDatesForToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGoogleBusyDatesForUserMock.mockResolvedValue({
      blockedDates: [],
      error: null,
    });
  });

  function makeQuoteTokenQuery(quote: Record<string, unknown> | null) {
    return {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: quote, error: null }),
    };
  }

  it('returns blocked dates from painter schedule', async () => {
    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') return { select: vi.fn().mockReturnValue(makeQuoteTokenQuery({ id: 'quote-1', status: 'approved', working_days: 3, user_id: 'uid-1' })) };
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: [{ blocked_date: '2026-04-20' }], error: null }),
    });

    const result = await getAvailableDatesForToken('valid-token');

    expect(result.error).toBeNull();
    expect(result.blockedDates).toEqual(['2026-04-20']);
    expect(result.workingDays).toBe(3);
  });

  it('merges Google busy dates with Coatly blocked dates', async () => {
    getGoogleBusyDatesForUserMock.mockResolvedValue({
      blockedDates: ['2026-04-21', '2026-04-22'],
      error: null,
    });

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(
              makeQuoteTokenQuery({
                id: 'quote-merge-1',
                status: 'approved',
                working_days: 2,
                user_id: 'uid-1',
              })
            ),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({
        data: [{ blocked_date: '2026-04-20' }, { blocked_date: '2026-04-21' }],
        error: null,
      }),
    });

    const result = await getAvailableDatesForToken('token-google-busy');

    expect(result.error).toBeNull();
    expect(result.blockedDates).toEqual(['2026-04-20', '2026-04-21', '2026-04-22']);
    expect(getGoogleBusyDatesForUserMock).toHaveBeenCalled();
  });

  it('returns error for unapproved quote', async () => {
    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') return { select: vi.fn().mockReturnValue(makeQuoteTokenQuery({ id: 'quote-2', status: 'draft', working_days: 2, user_id: 'uid-1' })) };
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const result = await getAvailableDatesForToken('token-draft');

    expect(result.error).not.toBeNull();
    expect(result.blockedDates).toEqual([]);
  });

  it('returns empty array when no blocked dates', async () => {
    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') return { select: vi.fn().mockReturnValue(makeQuoteTokenQuery({ id: 'quote-3', status: 'approved', working_days: 1, user_id: 'uid-1' })) };
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const result = await getAvailableDatesForToken('token-no-blocks');

    expect(result.error).toBeNull();
    expect(result.blockedDates).toEqual([]);
  });

  it('only returns date strings, not job details', async () => {
    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') return { select: vi.fn().mockReturnValue(makeQuoteTokenQuery({ id: 'quote-4', status: 'approved', working_days: 2, user_id: 'uid-1' })) };
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: [{ blocked_date: '2026-04-22' }, { blocked_date: '2026-04-23' }], error: null }),
    });

    const result = await getAvailableDatesForToken('token-privacy');

    expect(Array.isArray(result.blockedDates)).toBe(true);
    for (const entry of result.blockedDates) {
      expect(typeof entry).toBe('string');
    }
    expect(result).not.toHaveProperty('customer_id');
    expect(result).not.toHaveProperty('title');
    expect(result).not.toHaveProperty('notes');
  });
});
