import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  redirectMock,
  revalidatePathMock,
  createServerClientMock,
  requireCurrentUserMock,
  getActiveSubscriptionRequiredMessageMock,
  getSubscriptionSnapshotForUserMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  createServerClientMock: vi.fn(),
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

vi.mock('@/lib/supabase/request-context', () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

vi.mock('@/lib/subscription/access', () => ({
  getActiveSubscriptionRequiredMessage: getActiveSubscriptionRequiredMessageMock,
  getSubscriptionSnapshotForUser: getSubscriptionSnapshotForUserMock,
}));

import {
  createJob,
  createJobFromQuote,
  deleteJob,
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
