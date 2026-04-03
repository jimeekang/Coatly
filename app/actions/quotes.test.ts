import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  redirectMock,
  createServerClientMock,
  getActiveSubscriptionRequiredMessageMock,
  getMonthlyActiveQuoteUsageForUserMock,
  getSubscriptionSnapshotForUserMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  createServerClientMock: vi.fn(),
  getActiveSubscriptionRequiredMessageMock: vi.fn(
    (actionName: string) =>
      `Choose a paid plan to unlock ${actionName}. Finish checkout before using Coatly tools.`
  ),
  getMonthlyActiveQuoteUsageForUserMock: vi.fn(),
  getSubscriptionSnapshotForUserMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/lib/subscription/access', () => ({
  getActiveSubscriptionRequiredMessage: getActiveSubscriptionRequiredMessageMock,
  getMonthlyActiveQuoteUsageForUser: getMonthlyActiveQuoteUsageForUserMock,
  getSubscriptionSnapshotForUser: getSubscriptionSnapshotForUserMock,
}));

import { createQuote } from '@/app/actions/quotes';

function createFilterQuery<Result>(result: Result) {
  return {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    order: vi.fn().mockResolvedValue(result),
  };
}

describe('createQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    getMonthlyActiveQuoteUsageForUserMock.mockResolvedValue({
      count: 0,
      limit: null,
      remaining: null,
      reached: false,
    });
  });

  it('returns a validation error for an invalid payload', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    });

    const result = await createQuote({
      customer_id: '',
      title: '',
      status: 'draft',
      valid_until: '',
      complexity: 'standard',
      labour_margin_percent: 10,
      material_margin_percent: 5,
      notes: '',
      internal_notes: '',
      rooms: [],
    });

    expect(result).toEqual({ error: 'Select a customer' });
  });

  it('creates a quote and redirects to the detail page', async () => {
    const captured: {
      quoteInsert?: Record<string, unknown>;
      surfaceInsert?: Array<Record<string, unknown>>;
    } = {};

    const customerQuery = createFilterQuery({
      data: { id: 'customer-1' },
      error: null,
    });

    const quoteInsertResult = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'quote-1' },
          error: null,
        }),
      }),
    };

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
            insert: vi.fn((payload) => {
              captured.quoteInsert = payload;
              return quoteInsertResult;
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
            }),
          };
        }

        if (table === 'quote_rooms') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'room-1' },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'quote_room_surfaces') {
          return {
            insert: vi.fn(async (payload) => {
              captured.surfaceInsert = payload;
              return { error: null };
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === 'generate_quote_number') {
          return { data: 'QUO-0008', error: null };
        }

        if (fn === 'calculate_quote_totals') {
          return { data: null, error: null };
        }

        throw new Error(`Unexpected rpc ${fn}`);
      }),
    });

    const result = await createQuote({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Harbor Cafe repaint',
      status: 'draft',
      valid_until: '2026-04-10',
      complexity: 'standard',
      labour_margin_percent: 10,
      material_margin_percent: 5,
      notes: 'Client note',
      internal_notes: 'Internal note',
      rooms: [
        {
          name: 'Living Room',
          room_type: 'interior',
          length_m: 5,
          width_m: 4,
          height_m: 2.7,
          surfaces: [
            {
              surface_type: 'walls',
              area_m2: 35,
              coating_type: 'repaint_2coat',
              rate_per_m2_cents: 1800,
              notes: '',
            },
          ],
        },
      ],
    });

    expect(result).toBeUndefined();
    expect(captured.quoteInsert).toMatchObject({
      user_id: 'user-1',
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_number: 'QUO-0008',
      title: 'Harbor Cafe repaint',
      subtotal_cents: 72450,
      gst_cents: 7245,
      total_cents: 79695,
    });
    expect(captured.surfaceInsert).toEqual([
      {
        room_id: 'room-1',
        surface_type: 'walls',
        area_m2: 35,
        coating_type: 'repaint_2coat',
        rate_per_m2_cents: 1800,
        material_cost_cents: 20160,
        labour_cost_cents: 42840,
        paint_litres_needed: 2.9,
        tier: 'standard',
        notes: null,
      },
    ]);
    expect(redirectMock).toHaveBeenCalledWith('/quotes/quote-1');
  });

  it('creates an interior anchor quote and stores estimate items instead of room surfaces', async () => {
    const captured: {
      quoteInsert?: Record<string, unknown>;
      estimateItemsInsert?: Array<Record<string, unknown>>;
    } = {};

    const customerQuery = createFilterQuery({
      data: { id: 'customer-1' },
      error: null,
    });

    const quoteInsertResult = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'quote-1' },
          error: null,
        }),
      }),
    };

    const rpcMock = vi.fn(async (fn: string) => {
      if (fn === 'generate_quote_number') {
        return { data: 'QUO-0009', error: null };
      }

      if (fn === 'calculate_quote_totals') {
        return { data: null, error: null };
      }

      throw new Error(`Unexpected rpc ${fn}`);
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
            insert: vi.fn((payload) => {
              captured.quoteInsert = payload;
              return quoteInsertResult;
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
            }),
          };
        }

        if (table === 'quote_estimate_items') {
          return {
            insert: vi.fn(async (payload) => {
              captured.estimateItemsInsert = payload;
              return { error: null };
            }),
          };
        }

        if (table === 'quote_rooms' || table === 'quote_room_surfaces') {
          throw new Error(`Unexpected table ${table}`);
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: rpcMock,
    });

    const result = await createQuote({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Apartment anchor repaint',
      status: 'draft',
      valid_until: '2026-04-10',
      complexity: 'standard',
      labour_margin_percent: 10,
      material_margin_percent: 5,
      notes: 'Client note',
      internal_notes: 'Internal note',
      rooms: [],
      interior_estimate: {
        property_type: 'apartment',
        estimate_mode: 'entire_property',
        condition: 'fair',
        scope: ['walls', 'ceiling', 'trim'],
        property_details: {
          apartment_type: '2_bedroom_standard',
        },
        rooms: [],
        opening_items: [],
        trim_items: [],
      },
    });

    expect(result).toBeUndefined();
    expect(captured.quoteInsert).toMatchObject({
      user_id: 'user-1',
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_number: 'QUO-0009',
      title: 'Apartment anchor repaint',
      subtotal_cents: 661250,
      gst_cents: 66125,
      total_cents: 727375,
      estimate_category: 'interior',
      property_type: 'apartment',
      estimate_mode: 'entire_property',
      estimate_context: expect.objectContaining({
        property_type: 'apartment',
        estimate_mode: 'entire_property',
      }),
      pricing_snapshot: expect.objectContaining({
        price_source: 'anchor',
        property_type: 'apartment',
        estimate_mode: 'entire_property',
      }),
    });
    expect(captured.estimateItemsInsert).toEqual([
      expect.objectContaining({
        quote_id: 'quote-1',
        category: 'entire_property',
        label: 'Apartment interior repaint (2 Bedroom (Standard))',
        quantity: 1,
        unit: 'job',
        unit_price_cents: 575000,
        total_cents: 575000,
        sort_order: 0,
      }),
    ]);
    expect(rpcMock).toHaveBeenCalledWith('generate_quote_number', { user_uuid: 'user-1' });
    expect(rpcMock).not.toHaveBeenCalledWith('calculate_quote_totals', {
      quote_uuid: 'quote-1',
    });
    expect(redirectMock).toHaveBeenCalledWith('/quotes/quote-1');
  });

  it('blocks quote creation when the Starter monthly active quote limit is reached', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    });
    getSubscriptionSnapshotForUserMock.mockResolvedValue({
      plan: 'starter',
      status: 'active',
      active: true,
      cancelScheduled: false,
      features: {
        ai: false,
        xeroSync: false,
        jobCosting: false,
        prioritySupport: false,
        unlimitedQuotes: false,
        activeQuoteLimit: 10,
      },
    });
    getMonthlyActiveQuoteUsageForUserMock.mockResolvedValue({
      count: 10,
      limit: 10,
      remaining: 0,
      reached: true,
    });

    const result = await createQuote({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Harbor Cafe repaint',
      status: 'draft',
      valid_until: '2026-04-10',
      complexity: 'standard',
      labour_margin_percent: 10,
      material_margin_percent: 5,
      notes: 'Client note',
      internal_notes: 'Internal note',
      rooms: [
        {
          name: 'Living Room',
          room_type: 'interior',
          length_m: 5,
          width_m: 4,
          height_m: 2.7,
          surfaces: [
            {
              surface_type: 'walls',
              area_m2: 35,
              coating_type: 'repaint_2coat',
              rate_per_m2_cents: 1800,
              notes: '',
            },
          ],
        },
      ],
    });

    expect(result).toEqual({
      error:
        'Starter includes up to 10 active quotes per month. Upgrade to Pro to create more quotes this month.',
    });
  });

  it('blocks quote creation when there is no active subscription', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    });
    getSubscriptionSnapshotForUserMock.mockResolvedValue({
      plan: 'starter',
      status: 'none',
      active: false,
      cancelScheduled: false,
      features: {
        ai: false,
        xeroSync: false,
        jobCosting: false,
        prioritySupport: false,
        unlimitedQuotes: false,
        activeQuoteLimit: 10,
      },
    });

    const result = await createQuote({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Harbor Cafe repaint',
      status: 'draft',
      valid_until: '2026-04-10',
      complexity: 'standard',
      labour_margin_percent: 10,
      material_margin_percent: 5,
      notes: 'Client note',
      internal_notes: 'Internal note',
      rooms: [
        {
          name: 'Living Room',
          room_type: 'interior',
          length_m: 5,
          width_m: 4,
          height_m: 2.7,
          surfaces: [
            {
              surface_type: 'walls',
              area_m2: 35,
              coating_type: 'repaint_2coat',
              rate_per_m2_cents: 1800,
              notes: '',
            },
          ],
        },
      ],
    });

    expect(result).toEqual({
      error:
        'Choose a paid plan to unlock quote creation. Finish checkout before using Coatly tools.',
    });
  });
});
