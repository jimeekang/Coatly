import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  redirectMock,
  revalidatePathMock,
  createServerClientMock,
  createAdminClientMock,
  requireCurrentUserMock,
  getActiveSubscriptionRequiredMessageMock,
  getSubscriptionSnapshotForUserMock,
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

import {
  bookJobFromPublicQuote,
  createJob,
  createJobFromQuote,
  deleteJob,
  getAvailableDatesForToken,
  getJobFormOptions,
  getJobs,
  updateJob,
} from '@/app/actions/jobs';

function createFilterQuery<Result>(result: Result) {
  return {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    order: vi.fn().mockResolvedValue(result),
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
              notes: 'Rear gate access',
              created_at: '2026-04-01T00:00:00.000Z',
              updated_at: '2026-04-01T00:00:00.000Z',
              customer: {
                id: 'customer-1',
                name: 'Olivia Brown',
                company_name: 'Brown Projects',
                email: 'olivia@example.com',
                address_line1: '12 Beach St',
                city: 'Manly',
                state: 'NSW',
                postcode: '2095',
              },
              quote: {
                id: 'quote-1',
                quote_number: 'QUO-0012',
                title: 'Living room repaint',
                status: 'approved',
                customer_id: 'customer-1',
              },
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

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await getJobs();

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'job-1',
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
            insert: vi.fn(async (payload) => {
              captured.insert = payload;
              return { error: null };
            }),
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
});

// ---------------------------------------------------------------------------
// bookJobFromPublicQuote
// ---------------------------------------------------------------------------

describe('bookJobFromPublicQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('uses 1 day when working_days is null', async () => {
    const insertedJob = { id: 'job-2' };
    const insertSelectSingleMock = vi.fn().mockResolvedValue({ data: insertedJob, error: null });
    const insertMock = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: insertSelectSingleMock }) });

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') return { select: vi.fn().mockReturnValue(makeQuoteTokenQuery({ id: 'quote-5', status: 'approved', working_days: null, user_id: 'uid-1', customer_id: 'customer-1', title: 'Quick touch up', quote_number: 'Q-005' })) };
        if (table === 'jobs') return { insert: insertMock };
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
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    });

    await bookJobFromPublicQuote('token-3day', '2026-04-15');

    const insertPayload = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertPayload.start_date).toBe('2026-04-15');
    expect(insertPayload.end_date).toBe('2026-04-17');
  });
});

// ---------------------------------------------------------------------------
// getAvailableDatesForToken
// ---------------------------------------------------------------------------

describe('getAvailableDatesForToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
