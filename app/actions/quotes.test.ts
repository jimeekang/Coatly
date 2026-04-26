import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  redirectMock,
  createServerClientMock,
  createAdminClientMock,
  sendQuoteApprovalNotificationMock,
  sendQuoteEmailMock,
  renderToBufferMock,
  getActiveSubscriptionRequiredMessageMock,
  getMonthlyActiveQuoteUsageForUserMock,
  getSubscriptionSnapshotForUserMock,
  requireCurrentUserMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  createServerClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  sendQuoteApprovalNotificationMock: vi.fn(),
  sendQuoteEmailMock: vi.fn(),
  renderToBufferMock: vi.fn(),
  getActiveSubscriptionRequiredMessageMock: vi.fn(
    (actionName: string) =>
      `Choose a paid plan to unlock ${actionName}. Finish checkout before using Coatly tools.`
  ),
  getMonthlyActiveQuoteUsageForUserMock: vi.fn(),
  getSubscriptionSnapshotForUserMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
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

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/lib/supabase/request-context', () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

vi.mock('@/lib/subscription/access', () => ({
  getActiveSubscriptionRequiredMessage: getActiveSubscriptionRequiredMessageMock,
  getMonthlyActiveQuoteUsageForUser: getMonthlyActiveQuoteUsageForUserMock,
  getSubscriptionSnapshotForUser: getSubscriptionSnapshotForUserMock,
}));

vi.mock('@/lib/email/resend', () => ({
  sendQuoteApprovalNotification: sendQuoteApprovalNotificationMock,
  sendQuoteEmail: sendQuoteEmailMock,
}));

vi.mock('@react-pdf/renderer', async () => {
  const actual = await vi.importActual<typeof import('@react-pdf/renderer')>(
    '@react-pdf/renderer'
  );

  return {
    ...actual,
    renderToBuffer: renderToBufferMock,
  };
});

import {
  approvePublicQuote,
  createQuote,
  getQuote,
  getPublicQuoteByToken,
  getQuotes,
  rejectPublicQuote,
  setPublicQuoteOptionalLineItemSelection,
  setQuoteOptionalLineItemSelection,
  updateQuote,
} from '@/app/actions/quotes';

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
    renderToBufferMock.mockResolvedValue(Buffer.from('pdf'));
    sendQuoteEmailMock.mockResolvedValue({ error: null });
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
      lineItemsInsert?: Array<Record<string, unknown>>;
    } = {};

    const customerQuery = createFilterQuery({
      data: {
        id: 'customer-1',
        email: 'site@harborcafe.com.au',
        emails: ['site@harborcafe.com.au', 'accounts@harborcafe.com.au'],
        address_line1: '128 Beach Street',
        address_line2: 'Suite 4',
        city: 'Manly',
        state: 'NSW',
        postcode: '2095',
        properties: [
          {
            label: 'Cafe',
            address_line1: '128 Beach Street',
            address_line2: 'Suite 4',
            city: 'Manly',
            state: 'NSW',
            postcode: '2095',
            notes: '',
          },
          {
            label: 'Warehouse',
            address_line1: '9 Storage Lane',
            address_line2: 'Unit 4',
            city: 'Brookvale',
            state: 'NSW',
            postcode: '2100',
            notes: '',
          },
        ],
      },
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

        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
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

        if (table === 'quote_line_items') {
          return {
            insert: vi.fn(async (payload) => {
              captured.lineItemsInsert = payload;
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
      line_items: [
        {
          material_item_id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Premium wash & wear',
          category: 'paint',
          unit: 'tin',
          quantity: 2,
          unit_price_cents: 1500,
        },
      ],
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
      customer_email: 'site@harborcafe.com.au',
      customer_address: '128 Beach Street, Suite 4, Manly, NSW, 2095',
      quote_number: 'QUO-0008',
      title: 'Harbor Cafe repaint',
      subtotal_cents: 75450,
      gst_cents: 7545,
      total_cents: 82995,
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
    expect(captured.lineItemsInsert).toEqual([
      {
        quote_id: 'quote-1',
        material_item_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Premium wash & wear',
        category: 'paint',
        unit: 'tin',
        quantity: 2,
        unit_price_cents: 1500,
        total_cents: 3000,
        notes: null,
        is_optional: false,
        is_selected: true,
        sort_order: 0,
      },
    ]);
    expect(redirectMock).toHaveBeenCalledWith('/quotes/quote-1');
  });

  it('marks the quote as sent and redirects with a demo email flag when send_email is used', async () => {
    const captured: {
      quoteInsert?: Record<string, unknown>;
      quoteSentUpdate?: Record<string, unknown>;
    } = {};
    const quoteDetailRow = {
      id: 'quote-send-1',
      user_id: 'user-1',
      customer_id: 'customer-1',
      public_share_token: '11111111-1111-1111-1111-111111111111',
      approved_at: null,
      approved_by_name: null,
      approved_by_email: null,
      approval_signature: null,
      manual_adjustment_cents: 0,
      discount_cents: 0,
      deposit_percent: 0,
      customer_email: 'accounts@harborcafe.com.au',
      customer_address: '9 Storage Lane, Unit 4, Brookvale, NSW, 2100',
      quote_number: 'QUO-0010',
      title: 'Harbor Cafe repaint',
      status: 'sent',
      valid_until: '2026-04-10',
      tier: 'standard',
      notes: 'Client note',
      internal_notes: 'Internal note',
      labour_margin_percent: 10,
      material_margin_percent: 5,
      subtotal_cents: 100000,
      gst_cents: 10000,
      total_cents: 110000,
      estimate_category: 'interior',
      property_type: 'apartment',
      estimate_mode: 'specific_areas',
      estimate_context: {},
      pricing_snapshot: {},
      pricing_method: 'hybrid',
      pricing_method_inputs: null,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
      customer: {
        id: 'customer-1',
        name: 'Harbor Cafe',
        company_name: null,
        email: 'site@harborcafe.com.au',
        phone: null,
        address_line1: '128 Beach Street',
        address_line2: 'Suite 4',
        city: 'Manly',
        state: 'NSW',
        postcode: '2095',
      },
    };

    const customerQuery = createFilterQuery({
      data: {
        id: 'customer-1',
        email: 'site@harborcafe.com.au',
        emails: ['site@harborcafe.com.au', 'accounts@harborcafe.com.au'],
        address_line1: '128 Beach Street',
        address_line2: 'Suite 4',
        city: 'Manly',
        state: 'NSW',
        postcode: '2095',
        properties: [
          {
            label: 'Cafe',
            address_line1: '128 Beach Street',
            address_line2: 'Suite 4',
            city: 'Manly',
            state: 'NSW',
            postcode: '2095',
            notes: '',
          },
          {
            label: 'Warehouse',
            address_line1: '9 Storage Lane',
            address_line2: 'Unit 4',
            city: 'Brookvale',
            state: 'NSW',
            postcode: '2100',
            notes: '',
          },
        ],
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
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(customerQuery),
          };
        }

        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { business_name: 'Harbor Painting' },
                error: null,
              }),
            }),
          };
        }

        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: quoteDetailRow,
                error: null,
              }),
            }),
            insert: vi.fn((payload) => {
              captured.quoteInsert = payload;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'quote-send-1' },
                    error: null,
                  }),
                }),
              };
            }),
            update: vi.fn((payload) => {
              captured.quoteSentUpdate = payload;
              return {
                eq: vi.fn().mockReturnThis(),
              };
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
            }),
          };
        }

        if (table === 'quote_estimate_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            insert: vi.fn(async () => ({ error: null })),
          };
        }

        if (table === 'quote_line_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            insert: vi.fn(async () => ({ error: null })),
          };
        }

        if (table === 'quote_rooms') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }

        if (table === 'invoices') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              then: vi.fn((resolve) => resolve({ count: 0, error: null })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === 'generate_quote_number') {
          return { data: 'QUO-0010', error: null };
        }

        throw new Error(`Unexpected rpc ${fn}`);
      }),
    });

    const result = await createQuote(
      {
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
        customer_email: 'accounts@harborcafe.com.au',
        customer_address: '9 Storage Lane, Unit 4, Brookvale, NSW, 2100',
        title: 'Harbor Cafe repaint',
        status: 'draft',
        valid_until: '2026-04-10',
        complexity: 'standard',
        labour_margin_percent: 10,
        material_margin_percent: 5,
        notes: 'Client note',
        internal_notes: 'Internal note',
        rooms: [],
        line_items: [],
        interior_estimate: {
          property_type: 'apartment',
          estimate_mode: 'specific_areas',
          condition: 'fair',
          scope: ['walls'],
          property_details: {
            apartment_type: '2_bedroom_standard',
          },
          rooms: [
            {
              name: 'Living Room',
              anchor_room_type: 'Living Room',
              room_type: 'interior',
              include_walls: true,
              include_ceiling: false,
              include_trim: false,
            },
          ],
          opening_items: [],
          trim_items: [],
        },
      },
      { submitIntent: 'send_email' }
    );

    expect(result).toBeUndefined();
    expect(captured.quoteInsert).toMatchObject({
      status: 'draft',
      customer_email: 'accounts@harborcafe.com.au',
      customer_address: '9 Storage Lane, Unit 4, Brookvale, NSW, 2100',
    });
    expect(captured.quoteSentUpdate).toEqual({ status: 'sent' });
    expect(sendQuoteEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'accounts@harborcafe.com.au',
        approvalUrl: 'https://app.coatly.com.au/q/11111111-1111-1111-1111-111111111111',
        pdfAttachment: expect.any(Buffer),
      })
    );
    expect(redirectMock).toHaveBeenCalledWith('/quotes/quote-send-1?emailSent=1');
  });

  it('returns an error when send_email is used without a customer email', async () => {
    const customerQuery = createFilterQuery({
      data: {
        id: 'customer-1',
        email: null,
        address_line1: '128 Beach Street',
        address_line2: null,
        city: 'Manly',
        state: 'NSW',
        postcode: '2095',
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
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(customerQuery),
          };
        }

        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(),
    });

    const result = await createQuote(
      {
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
      },
      { submitIntent: 'send_email' }
    );

    expect(result).toEqual({ error: 'Add a customer email before sending this quote.' });
  });

  it('creates an interior anchor quote and stores estimate items instead of room surfaces', async () => {
    const captured: {
      quoteInsert?: Record<string, unknown>;
      estimateItemsInsert?: Array<Record<string, unknown>>;
      lineItemsInsert?: Array<Record<string, unknown>>;
    } = {};

    const customerQuery = createFilterQuery({
      data: {
        id: 'customer-1',
        email: 'accounts@example.com',
        address_line1: '9 Harbour Parade',
        address_line2: null,
        city: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      },
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

        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
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

        if (table === 'quote_line_items') {
          return {
            insert: vi.fn(async (payload) => {
              captured.lineItemsInsert = payload;
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
      line_items: [
        {
          material_item_id: null,
          name: 'Feature wall upgrade',
          category: 'service',
          unit: 'job',
          quantity: 1,
          unit_price_cents: 5000,
        },
      ],
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
      customer_email: 'accounts@example.com',
      customer_address: '9 Harbour Parade, Sydney, NSW, 2000',
      quote_number: 'QUO-0009',
      title: 'Apartment anchor repaint',
      subtotal_cents: 666250,
      gst_cents: 66625,
      total_cents: 732875,
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
    expect(captured.lineItemsInsert).toEqual([
      expect.objectContaining({
        quote_id: 'quote-1',
        material_item_id: null,
        name: 'Feature wall upgrade',
        category: 'service',
        unit: 'job',
        quantity: 1,
        unit_price_cents: 5000,
        total_cents: 5000,
        is_optional: false,
        is_selected: true,
      }),
    ]);
    expect(rpcMock).toHaveBeenCalledWith('generate_quote_number', { user_uuid: 'user-1' });
    expect(rpcMock).not.toHaveBeenCalledWith('calculate_quote_totals', {
      quote_uuid: 'quote-1',
    });
    expect(redirectMock).toHaveBeenCalledWith('/quotes/quote-1');
  });

  it('keeps day-rate quote totals when materials and services are attached', async () => {
    const captured: {
      quoteInsert?: Record<string, unknown>;
      lineItemsInsert?: Array<Record<string, unknown>>;
    } = {};

    const customerQuery = createFilterQuery({
      data: {
        id: 'customer-1',
        email: 'dayrate@example.com',
        address_line1: '55 Pitt Street',
        address_line2: null,
        city: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      },
      error: null,
    });

    const quoteInsertResult = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'quote-2' },
          error: null,
        }),
      }),
    };

    const rpcMock = vi.fn(async (fn: string) => {
      if (fn === 'generate_quote_number') {
        return { data: 'QUO-0010', error: null };
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

        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
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

        if (table === 'quote_line_items') {
          return {
            insert: vi.fn(async (payload) => {
              captured.lineItemsInsert = payload;
              return { error: null };
            }),
          };
        }

        if (
          table === 'quote_rooms' ||
          table === 'quote_room_surfaces' ||
          table === 'quote_estimate_items'
        ) {
          throw new Error(`Unexpected table ${table}`);
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: rpcMock,
    });

    const result = await createQuote({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Day-rate repaint',
      status: 'draft',
      valid_until: '2026-04-10',
      complexity: 'standard',
      labour_margin_percent: 0,
      material_margin_percent: 0,
      notes: 'Client note',
      internal_notes: 'Internal note',
      rooms: [],
      line_items: [
        {
          material_item_id: null,
          name: 'Masking materials',
          category: 'supply',
          unit: 'bundle',
          quantity: 2,
          unit_price_cents: 5000,
        },
      ],
      pricing_method: 'day_rate',
      pricing_method_inputs: {
        method: 'day_rate',
        inputs: {
          days: 2,
          daily_rate_cents: 100000,
          material_method: 'percentage',
          material_percent: 25,
        },
      },
    });

    expect(result).toBeUndefined();
    expect(captured.quoteInsert).toMatchObject({
      customer_email: 'dayrate@example.com',
      customer_address: '55 Pitt Street, Sydney, NSW, 2000',
      quote_number: 'QUO-0010',
      pricing_method: 'day_rate',
      subtotal_cents: 260000,
      gst_cents: 26000,
      total_cents: 286000,
    });
    expect(captured.lineItemsInsert).toEqual([
      expect.objectContaining({
        quote_id: 'quote-2',
        name: 'Masking materials',
        total_cents: 10000,
        is_optional: false,
        is_selected: true,
      }),
    ]);
    expect(rpcMock).not.toHaveBeenCalledWith('calculate_quote_totals', {
      quote_uuid: 'quote-2',
    });
    expect(redirectMock).toHaveBeenCalledWith('/quotes/quote-2');
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

describe('updateQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back when the quotes customer snapshot columns are missing during edit save', async () => {
    const captured: {
      firstQuoteUpdate?: Record<string, unknown>;
      fallbackQuoteUpdate?: Record<string, unknown>;
    } = {};
    let quoteUpdateCalls = 0;

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'quotes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'quote-1',
                  quote_number: 'QUO-0009',
                  customer_id: 'customer-1',
                },
                error: null,
              }),
            })),
            update: vi.fn((payload) => {
              quoteUpdateCalls += 1;
              if (quoteUpdateCalls === 1) {
                captured.firstQuoteUpdate = payload;
                return {
                  error: {
                    message:
                      "Could not find the 'customer_address' column of 'quotes' in the schema cache",
                  },
                  eq: vi.fn().mockReturnThis(),
                };
              }

              captured.fallbackQuoteUpdate = payload;
              return {
                error: null,
                eq: vi.fn().mockReturnThis(),
              };
            }),
          };
        }

        if (table === 'invoices') {
          return {
            select: vi.fn(() => ({
              count: 0,
              error: null,
              eq: vi.fn().mockReturnThis(),
            })),
          };
        }

        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(
              createFilterQuery({
                data: {
                  id: 'customer-1',
                  email: 'client@example.com',
                  emails: ['client@example.com'],
                  address_line1: '128 Beach Street',
                  address_line2: null,
                  city: 'Manly',
                  state: 'NSW',
                  postcode: '2095',
                  properties: [],
                },
                error: null,
              })
            ),
          };
        }

        if (table === 'businesses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }

        if (table === 'quote_rooms') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
            insert: vi.fn(() => ({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'room-1' },
                  error: null,
                }),
              }),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }

        if (table === 'quote_room_surfaces') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        if (table === 'quote_estimate_items' || table === 'quote_line_items') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(),
    });

    const result = await updateQuote('quote-1', {
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      customer_email: 'client@example.com',
      customer_address: '128 Beach Street, Manly, NSW, 2095',
      title: 'Apartment repaint',
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
              coating_type: 'repaint_2coat',
              area_m2: 35,
              rate_per_m2_cents: 1800,
              notes: '',
            },
          ],
        },
      ],
      line_items: [],
    });

    expect(result).toBeUndefined();
    expect(captured.firstQuoteUpdate).toMatchObject({
      customer_email: 'client@example.com',
      customer_address: '128 Beach Street, Manly, NSW, 2095',
    });
    expect(captured.fallbackQuoteUpdate).not.toHaveProperty('customer_email');
    expect(captured.fallbackQuoteUpdate).not.toHaveProperty('customer_address');
    expect(redirectMock).toHaveBeenCalledWith('/quotes/quote-1');
  });

  it('blocks quote edits once any linked invoice exists', async () => {
    const existingQuoteQuery = createFilterQuery({
      data: {
        id: 'quote-1',
        quote_number: 'QUO-0009',
        customer_id: 'customer-1',
      },
      error: null,
    });
    const linkedInvoicesQuery = {
      count: 1,
      error: null,
      eq: vi.fn().mockReturnThis(),
    };

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(existingQuoteQuery),
          };
        }

        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue(linkedInvoicesQuery),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(),
    });

    const result = await updateQuote('quote-1', {
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Apartment anchor repaint',
      status: 'approved',
      valid_until: '2026-04-10',
      complexity: 'standard',
      labour_margin_percent: 10,
      material_margin_percent: 5,
      notes: 'Client note',
      internal_notes: 'Internal note',
      rooms: [],
      line_items: [
        {
          material_item_id: null,
          name: 'Feature wall upgrade',
          category: 'service',
          unit: 'job',
          quantity: 1,
          unit_price_cents: 5000,
        },
      ],
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

    expect(result).toEqual({
      error: 'This quote can no longer be edited because an invoice already exists for it.',
    });
  });
});

describe('setQuoteOptionalLineItemSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
    });
  });

  it('updates optional selections and recalculates quote totals', async () => {
    const captured: {
      lineItemUpdate?: Record<string, unknown>;
      quoteUpdate?: Record<string, unknown>;
    } = {};

    createServerClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'quote-1',
                  subtotal_cents: 68000,
                  manual_adjustment_cents: 0,
                },
                error: null,
              }),
            }),
            update: vi.fn((payload) => {
              captured.quoteUpdate = payload;
              return {
                eq: vi.fn().mockReturnThis(),
              };
            }),
          };
        }

        if (table === 'quote_line_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'line-1',
                    total_cents: 15000,
                    is_optional: true,
                    is_selected: false,
                  },
                  {
                    id: 'line-2',
                    total_cents: 5000,
                    is_optional: false,
                    is_selected: true,
                  },
                ],
                error: null,
              }),
            }),
            update: vi.fn((payload) => {
              captured.lineItemUpdate = payload;
              return {
                eq: vi.fn().mockReturnThis(),
              };
            }),
          };
        }

        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              count: 0,
              error: null,
              eq: vi.fn().mockReturnThis(),
            }),
          };
        }

        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              count: 0,
              error: null,
              eq: vi.fn().mockReturnThis(),
            }),
          };
        }

        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              count: 0,
              error: null,
              eq: vi.fn().mockReturnThis(),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const formData = new FormData();
    formData.set('quoteId', 'quote-1');
    formData.set('lineItemId', 'line-1');
    formData.set('isSelected', 'true');

    const result = await setQuoteOptionalLineItemSelection(formData);

    expect(result).toBeUndefined();
    expect(captured.lineItemUpdate).toEqual({ is_selected: true });
    expect(captured.quoteUpdate).toEqual({
      subtotal_cents: 83000,
      gst_cents: 8300,
      total_cents: 91300,
    });
  });
});

describe('public quote access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendQuoteApprovalNotificationMock.mockResolvedValue({ error: null });
  });

  it('loads a public quote by share token', async () => {
    const quoteSelectMock = vi.fn().mockReturnValue(
      createFilterQuery({
        data: {
          id: 'quote-public-1',
          user_id: 'user-1',
          customer_id: 'customer-1',
          public_share_token: '11111111-1111-1111-1111-111111111111',
          approved_at: null,
          approved_by_name: null,
          approved_by_email: null,
          approval_signature: null,
          customer_email: 'client@example.com',
          customer_address: '128 Beach Street, Manly, NSW, 2095',
          quote_number: 'QUO-2026-001',
          title: 'Public quote',
          status: 'sent',
          valid_until: '2026-04-10',
          tier: 'standard',
          notes: 'Client-facing note',
          internal_notes: 'Internal only',
          labour_margin_percent: 0,
          material_margin_percent: 0,
          subtotal_cents: 95000,
          gst_cents: 9500,
          total_cents: 104500,
          estimate_category: 'manual',
          property_type: null,
          estimate_mode: null,
          estimate_context: {},
          pricing_snapshot: {},
          pricing_method: 'hybrid',
          pricing_method_inputs: null,
          created_at: '2026-04-01T00:00:00.000Z',
          updated_at: '2026-04-01T00:00:00.000Z',
          customer: {
            id: 'customer-1',
            name: 'Harbor Cafe',
            company_name: null,
            email: 'client@example.com',
            phone: '0412 555 012',
            address_line1: '128 Beach Street',
            address_line2: null,
            city: 'Manly',
            state: 'NSW',
            postcode: '2095',
          },
        },
        error: null,
      })
    );

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') {
          return { select: quoteSelectMock };
        }

        if (table === 'quote_rooms') {
          return {
            select: vi.fn().mockReturnValue(
              createFilterQuery({
                data: [],
                error: null,
              })
            ),
          };
        }

        if (table === 'quote_estimate_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }

        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              count: 0,
              error: null,
              eq: vi.fn().mockReturnThis(),
            }),
          };
        }

        if (table === 'quote_line_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'line-item-1',
                    quote_id: 'quote-public-1',
                    material_item_id: null,
                    name: 'Feature wall upgrade',
                    category: 'service',
                    unit: 'job',
                    quantity: 1,
                    unit_price_cents: 15000,
                    total_cents: 15000,
                    notes: 'Optional extra',
                    is_optional: true,
                    is_selected: false,
                    sort_order: 0,
                    created_at: '2026-04-01T00:00:00.000Z',
                    updated_at: '2026-04-01T00:00:00.000Z',
                  },
                ],
                error: null,
              }),
            }),
          };
        }

        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  business_name: 'Harbor Painting',
                  abn: '12345678901',
                  phone: '0412 000 999',
                  email: 'hello@harborpainting.com.au',
                  logo_url: null,
                  address_line1: null,
                  city: null,
                  state: null,
                  postcode: null,
                },
                error: null,
              }),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await getPublicQuoteByToken('11111111-1111-1111-1111-111111111111');

    expect(quoteSelectMock).toHaveBeenCalledWith(
      expect.not.stringContaining('public_share_token')
    );
    expect(quoteSelectMock).toHaveBeenCalledWith(
      expect.not.stringContaining('internal_notes')
    );
    expect(result.error).toBeNull();
    expect(result.data?.quote).not.toHaveProperty('public_share_token');
    expect(result.data?.quote.customer.address).toBe('128 Beach Street, Manly, NSW, 2095');
    expect(result.data?.quote.line_items).toEqual([
      expect.objectContaining({
        id: 'line-item-1',
        is_optional: true,
        is_selected: false,
      }),
    ]);
    expect(result.data?.business).toEqual({
      name: 'Harbor Painting',
      abn: '12345678901',
      phone: '0412 000 999',
      email: 'hello@harborpainting.com.au',
    });
  });

  it('updates public optional selections only for sent quotes', async () => {
    const captured: {
      lineItemUpdate?: Record<string, unknown>;
      quoteUpdate?: Record<string, unknown>;
    } = {};

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'quote-public-1',
                  status: 'sent',
                  subtotal_cents: 68000,
                  manual_adjustment_cents: 0,
                },
                error: null,
              }),
            }),
            update: vi.fn((payload) => {
              captured.quoteUpdate = payload;
              return {
                eq: vi.fn().mockReturnThis(),
              };
            }),
          };
        }

        if (table === 'quote_line_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'line-1',
                    total_cents: 15000,
                    is_optional: true,
                    is_selected: false,
                  },
                  {
                    id: 'line-2',
                    total_cents: 5000,
                    is_optional: false,
                    is_selected: true,
                  },
                ],
                error: null,
              }),
            }),
            update: vi.fn((payload) => {
              captured.lineItemUpdate = payload;
              return {
                eq: vi.fn().mockReturnThis(),
              };
            }),
          };
        }

        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              count: 0,
              error: null,
              eq: vi.fn().mockReturnThis(),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const formData = new FormData();
    formData.set('quoteToken', '11111111-1111-1111-1111-111111111111');
    formData.set('lineItemId', 'line-1');
    formData.set('isSelected', 'true');

    const result = await setPublicQuoteOptionalLineItemSelection(formData);

    expect(result).toBeUndefined();
    expect(captured.lineItemUpdate).toEqual({ is_selected: true });
    expect(captured.quoteUpdate).toEqual({
      subtotal_cents: 83000,
      gst_cents: 8300,
      total_cents: 91300,
    });
  });

  it('approves a public quote, stores signer details, and notifies the business owner', async () => {
    const captured: {
      quoteUpdate?: Record<string, unknown>;
    } = {};

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'quote-public-1',
                  user_id: 'user-1',
                  customer_id: 'customer-1',
                  public_share_token: '11111111-1111-1111-1111-111111111111',
                  approved_at: null,
                  approved_by_name: null,
                  approved_by_email: null,
                  approval_signature: null,
                  customer_email: 'client@example.com',
                  customer_address: '128 Beach Street, Manly, NSW, 2095',
                  quote_number: 'QUO-2026-001',
                  title: 'Public quote',
                  status: 'sent',
                  valid_until: '2099-04-10',
                  tier: 'standard',
                  notes: 'Client-facing note',
                  internal_notes: 'Existing internal note',
                  labour_margin_percent: 0,
                  material_margin_percent: 0,
                  subtotal_cents: 95000,
                  gst_cents: 9500,
                  total_cents: 104500,
                  estimate_category: 'manual',
                  property_type: null,
                  estimate_mode: null,
                  estimate_context: {},
                  pricing_snapshot: {},
                  pricing_method: 'hybrid',
                  pricing_method_inputs: null,
                  created_at: '2026-04-01T00:00:00.000Z',
                  updated_at: '2026-04-01T00:00:00.000Z',
                  customer: {
                    id: 'customer-1',
                    name: 'Harbor Cafe',
                    company_name: null,
                    email: 'client@example.com',
                    phone: '0412 555 012',
                    address_line1: '128 Beach Street',
                    address_line2: null,
                    city: 'Manly',
                    state: 'NSW',
                    postcode: '2095',
                  },
                },
                error: null,
              }),
            }),
            update: vi.fn((payload) => {
              captured.quoteUpdate = payload;
              return {
                eq: vi.fn().mockReturnThis(),
              };
            }),
          };
        }

        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  business_name: 'Harbor Painting',
                  abn: '12345678901',
                  phone: '0412 000 999',
                  email: 'hello@harborpainting.com.au',
                  logo_url: null,
                  address_line1: null,
                  city: null,
                  state: null,
                  postcode: null,
                },
                error: null,
              }),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const formData = new FormData();
    formData.set('quoteToken', '11111111-1111-1111-1111-111111111111');
    formData.set('approvedByName', 'Alex Harper');
    formData.set('approvedByEmail', 'alex@example.com');
    formData.set('approvalSignature', 'Alex Harper');

    const result = await approvePublicQuote(formData);

    expect(result).toBeUndefined();
    expect(captured.quoteUpdate).toMatchObject({
      status: 'approved',
      approved_by_name: 'Alex Harper',
      approved_by_email: 'alex@example.com',
      approval_signature: 'Alex Harper',
    });
    expect(sendQuoteApprovalNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'hello@harborpainting.com.au',
        quoteNumber: 'QUO-2026-001',
        approvedByName: 'Alex Harper',
        approvedByEmail: 'alex@example.com',
        signature: 'Alex Harper',
        totalFormatted: '$1,045.00',
      })
    );
  });

  it('rejects a public quote when the customer declines it', async () => {
    const captured: {
      quoteUpdate?: Record<string, unknown>;
    } = {};

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'quote-public-1',
                  user_id: 'user-1',
                  customer_id: 'customer-1',
                  public_share_token: '11111111-1111-1111-1111-111111111111',
                  approved_at: null,
                  approved_by_name: null,
                  approved_by_email: null,
                  approval_signature: null,
                  customer_email: 'client@example.com',
                  customer_address: '128 Beach Street, Manly, NSW, 2095',
                  quote_number: 'QUO-2026-001',
                  title: 'Public quote',
                  status: 'sent',
                  valid_until: '2099-04-10',
                  tier: 'standard',
                  notes: 'Client-facing note',
                  internal_notes: 'Existing internal note',
                  labour_margin_percent: 0,
                  material_margin_percent: 0,
                  subtotal_cents: 95000,
                  gst_cents: 9500,
                  total_cents: 104500,
                  estimate_category: 'manual',
                  property_type: null,
                  estimate_mode: null,
                  estimate_context: {},
                  pricing_snapshot: {},
                  pricing_method: 'hybrid',
                  pricing_method_inputs: null,
                  created_at: '2026-04-01T00:00:00.000Z',
                  updated_at: '2026-04-01T00:00:00.000Z',
                  customer: {
                    id: 'customer-1',
                    name: 'Harbor Cafe',
                    company_name: null,
                    email: 'client@example.com',
                    phone: '0412 555 012',
                    address_line1: '128 Beach Street',
                    address_line2: null,
                    city: 'Manly',
                    state: 'NSW',
                    postcode: '2095',
                  },
                },
                error: null,
              }),
            }),
            update: vi.fn((payload) => {
              captured.quoteUpdate = payload;
              return {
                eq: vi.fn().mockReturnThis(),
              };
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const formData = new FormData();
    formData.set('quoteToken', '11111111-1111-1111-1111-111111111111');
    formData.set('rejectedByName', 'Alex Harper');
    formData.set('rejectedByEmail', 'alex@example.com');

    const result = await rejectPublicQuote(formData);

    expect(result).toBeUndefined();
    expect(captured.quoteUpdate).toMatchObject({
      status: 'rejected',
    });
    expect(sendQuoteApprovalNotificationMock).not.toHaveBeenCalled();
  });
});

describe('getQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
    });
  });

  it('loads stored pricing method metadata for quote details', async () => {
    const quoteSelectMock = vi.fn().mockReturnValue(
      createFilterQuery({
        data: {
          id: 'quote-1',
          user_id: 'user-1',
          customer_id: 'customer-1',
          customer_email: 'quotes@harborcafe.com.au',
          customer_address: 'Quote Snapshot Address, Manly, NSW, 2095',
          quote_number: 'QUO-0011',
          title: 'Stored method quote',
          status: 'draft',
          valid_until: '2026-04-10',
          tier: 'standard',
          notes: null,
          internal_notes: null,
          labour_margin_percent: 0,
          material_margin_percent: 0,
          subtotal_cents: 250000,
          gst_cents: 25000,
          total_cents: 275000,
          estimate_category: 'manual',
          property_type: null,
          estimate_mode: null,
          estimate_context: {},
          pricing_snapshot: {},
          pricing_method: 'day_rate',
          pricing_method_inputs: {
            method: 'day_rate',
            inputs: {
              days: 2,
              daily_rate_cents: 100000,
              material_method: 'percentage',
              material_percent: 25,
            },
          },
          created_at: '2026-04-01T00:00:00.000Z',
          updated_at: '2026-04-01T00:00:00.000Z',
          customer: {
            id: 'customer-1',
            name: 'Harbor Cafe',
            company_name: null,
            email: 'owner@example.com',
            phone: '0412 555 012',
            address_line1: '128 Beach Street',
            address_line2: 'Suite 4',
            city: 'Manly',
            state: 'NSW',
            postcode: '2095',
          },
        },
        error: null,
      })
    );

    createServerClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') {
          return { select: quoteSelectMock };
        }

        if (table === 'quote_rooms') {
          return {
            select: vi.fn().mockReturnValue(
              createFilterQuery({
                data: [],
                error: null,
              })
            ),
          };
        }

        if (table === 'quote_estimate_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }

        if (table === 'quote_line_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'line-item-1',
                    quote_id: 'quote-1',
                    material_item_id: null,
                    name: 'Feature wall upgrade',
                    category: 'service',
                    unit: 'job',
                    quantity: 1,
                    unit_price_cents: 15000,
                    total_cents: 15000,
                    notes: 'Optional extra',
                    is_optional: true,
                    is_selected: false,
                    sort_order: 0,
                    created_at: '2026-04-01T00:00:00.000Z',
                    updated_at: '2026-04-01T00:00:00.000Z',
                  },
                ],
                error: null,
              }),
            }),
          };
        }

        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              count: 0,
              error: null,
              eq: vi.fn().mockReturnThis(),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await getQuote('quote-1');

    expect(quoteSelectMock).toHaveBeenCalledWith(
      expect.stringContaining('pricing_method, pricing_method_inputs')
    );
    expect(result.error).toBeNull();
    expect(result.data?.pricing_method).toBe('day_rate');
    expect(result.data?.customer.email).toBe('quotes@harborcafe.com.au');
    expect(result.data?.customer.address).toBe('Quote Snapshot Address, Manly, NSW, 2095');
    expect(result.data?.pricing_method_inputs).toEqual({
      method: 'day_rate',
      inputs: {
        days: 2,
        daily_rate_cents: 100000,
        material_method: 'percentage',
        material_percent: 25,
      },
    });
    expect(result.data?.line_items).toEqual([
      expect.objectContaining({
        id: 'line-item-1',
        is_optional: true,
        is_selected: false,
      }),
    ]);
  });

  it('falls back to legacy quote selects when snapshot columns are missing', async () => {
    const quotesSelectMock = vi
      .fn()
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'column quotes.customer_email does not exist' },
        }),
      })
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'quote-legacy-1',
              user_id: 'user-1',
              customer_id: 'customer-1',
              quote_number: 'DEMO-Q001',
              title: 'Legacy quote',
              status: 'draft',
              valid_until: '2026-04-10',
              tier: 'standard',
              subtotal_cents: 100000,
              gst_cents: 10000,
              total_cents: 110000,
              created_at: '2026-04-01T00:00:00.000Z',
              updated_at: '2026-04-01T00:00:00.000Z',
              customer: {
                id: 'customer-1',
                name: 'Legacy Customer',
                company_name: null,
                email: 'legacy@example.com',
                phone: '0400 000 000',
                address_line1: '12 Legacy Street',
                address_line2: null,
                city: 'Sydney',
                state: 'NSW',
                postcode: '2000',
              },
            },
          ],
          error: null,
        }),
      });

    createServerClientMock.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'quotes') {
          return { select: quotesSelectMock };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const result = await getQuotes();

    expect(quotesSelectMock).toHaveBeenCalledTimes(2);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.quote_number).toBe('DEMO-Q001');
    expect(result.data[0]?.customer.email).toBe('legacy@example.com');
    expect(result.data[0]?.customer.address).toBe('12 Legacy Street, Sydney, NSW, 2000');
  });
});
