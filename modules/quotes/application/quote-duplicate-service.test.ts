import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadQuoteRelationsMock } = vi.hoisted(() => ({
  loadQuoteRelationsMock: vi.fn(),
}));

vi.mock('@/modules/quotes/infrastructure/quote-repository', () => ({
  QUOTE_DETAIL_SELECT: 'quote-detail-select',
  QUOTE_DETAIL_SELECT_LEGACY: 'quote-detail-select-legacy',
  isMissingQuoteSelectColumnError: (message: string | null | undefined) =>
    Boolean(message?.includes('does not exist')),
  loadQuoteRelations: loadQuoteRelationsMock,
}));

import { duplicateQuoteForUser } from '@/modules/quotes/application/quote-duplicate-service';

function createFilterQuery<Result>(result: Result) {
  const query = {
    eq: vi.fn(() => query),
    single: vi.fn().mockResolvedValue(result),
  };

  return query;
}

function createInsertSingle<Result>(result: Result) {
  return {
    select: vi.fn(() => ({
      single: vi.fn().mockResolvedValue(result),
    })),
  };
}

function createSourceQuote() {
  return {
    id: 'quote-1',
    user_id: 'user-1',
    customer_id: 'customer-1',
    job_type: 'interior',
    customer_email: 'client@example.com',
    customer_address: '9 Harbour Parade, Sydney, NSW, 2000',
    quote_number: 'QUO-0001',
    title: 'Original quote',
    status: 'sent',
    valid_until: '2026-07-01',
    working_days: 3,
    tier: 'standard',
    notes: 'Client note',
    internal_notes: 'Internal note',
    labour_margin_percent: 10,
    material_margin_percent: 5,
    subtotal_cents: 100000,
    gst_cents: 10000,
    total_cents: 110000,
    manual_adjustment_cents: 1000,
    discount_cents: 500,
    deposit_percent: 20,
    estimate_category: 'interior',
    property_type: 'house',
    estimate_mode: 'specific_areas',
    estimate_context: { property_type: 'house' },
    pricing_snapshot: { price_source: 'anchor' },
    pricing_method: 'hybrid',
    pricing_method_inputs: { method: 'hybrid', inputs: null },
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    customer: null,
  };
}

function createRelations(overrides: {
  lineItems?: Array<Record<string, unknown>>;
} = {}) {
  return {
    rooms: [
      {
        id: 'room-1',
        quote_id: 'quote-1',
        name: 'Bedroom',
        room_type: 'interior',
        length_m: null,
        width_m: null,
        height_m: null,
        surfaces: [
          {
            id: 'surface-1',
            room_id: 'room-1',
            surface_type: 'walls',
            area_m2: 12,
            coating_type: 'repaint_2coat',
            rate_per_m2_cents: 1800,
            material_cost_cents: 4000,
            labour_cost_cents: 17600,
            paint_litres_needed: 2,
            notes: null,
          },
        ],
      },
    ],
    estimate_items: [
      {
        id: 'estimate-1',
        quote_id: 'quote-1',
        category: 'room_anchor',
        label: 'Bedroom',
        quantity: 1,
        unit: 'room',
        unit_price_cents: 75000,
        total_cents: 75000,
        sort_order: 0,
        metadata: { source: 'anchor' },
      },
    ],
    line_items:
      overrides.lineItems ??
      [
        {
          id: 'line-1',
          quote_id: 'quote-1',
          material_item_id: null,
          name: 'Custom add-on',
          category: 'custom-category',
          unit: 'job',
          quantity: 1,
          unit_price_cents: 25000,
          total_cents: 25000,
          notes: 'Optional extra',
          is_optional: true,
          is_selected: false,
          sort_order: 0,
          created_at: '2026-06-01T00:00:00.000Z',
          updated_at: '2026-06-01T00:00:00.000Z',
        },
      ],
    scope_sections: [],
    clause_items: [],
  };
}

function createSupabaseMock(options: {
  lineItemsError?: { message: string } | null;
} = {}) {
  const captured: Record<string, unknown> = {};
  const deleteQuery = {
    eq: vi.fn(() => deleteQuery),
  };

  const supabase = {
    rpc: vi.fn().mockResolvedValue({ data: 'QUO-0002', error: null }),
    from: vi.fn((table: string) => {
      if (table === 'quotes') {
        return {
          select: vi.fn(() =>
            createFilterQuery({
              data: createSourceQuote(),
              error: null,
            })
          ),
          insert: vi.fn((payload) => {
            captured.quoteInsert = payload;
            return createInsertSingle({
              data: { id: 'quote-copy' },
              error: null,
            });
          }),
          delete: vi.fn(() => deleteQuery),
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

      if (table === 'quote_rooms') {
        return {
          insert: vi.fn((payload) => {
            captured.roomInsert = payload;
            return createInsertSingle({
              data: { id: 'room-copy' },
              error: null,
            });
          }),
        };
      }

      if (table === 'quote_room_surfaces') {
        return {
          insert: vi.fn(async (payload) => {
            captured.surfacesInsert = payload;
            return { error: null };
          }),
        };
      }

      if (table === 'quote_line_items') {
        return {
          insert: vi.fn(async (payload) => {
            captured.lineItemsInsert = payload;
            return { error: options.lineItemsError ?? null };
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };

  return { captured, deleteQuery, supabase };
}

describe('duplicateQuoteForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadQuoteRelationsMock.mockResolvedValue({
      data: createRelations(),
      error: null,
    });
  });

  it('copies quote body and related pricing records into a draft quote', async () => {
    const { captured, supabase } = createSupabaseMock();

    const result = await duplicateQuoteForUser(
      supabase as never,
      'user-1',
      'quote-1'
    );

    expect(result).toEqual({ data: { quoteId: 'quote-copy' }, error: null });
    expect(supabase.rpc).toHaveBeenCalledWith('generate_quote_number', {
      user_uuid: 'user-1',
    });
    expect(captured.quoteInsert).toMatchObject({
      user_id: 'user-1',
      customer_id: 'customer-1',
      quote_number: 'QUO-0002',
      title: 'Original quote (Copy)',
      status: 'draft',
      valid_until: null,
      customer_email: 'client@example.com',
      customer_address: '9 Harbour Parade, Sydney, NSW, 2000',
    });
    expect(captured.estimateItemsInsert).toEqual([
      expect.objectContaining({
        quote_id: 'quote-copy',
        category: 'room_anchor',
        label: 'Bedroom',
        metadata: { source: 'anchor' },
      }),
    ]);
    expect(captured.roomInsert).toMatchObject({
      quote_id: 'quote-copy',
      name: 'Bedroom',
      room_type: 'interior',
    });
    expect(captured.surfacesInsert).toEqual([
      expect.objectContaining({
        room_id: 'room-copy',
        surface_type: 'walls',
        coating_type: 'repaint_2coat',
      }),
    ]);
    expect(captured.lineItemsInsert).toEqual([
      expect.objectContaining({
        quote_id: 'quote-copy',
        name: 'Custom add-on',
        category: 'other',
        is_optional: true,
        is_selected: false,
      }),
    ]);
  });

  it('deletes the duplicated quote when copying relations fails', async () => {
    loadQuoteRelationsMock.mockResolvedValue({
      data: createRelations({ lineItems: createRelations().line_items }),
      error: null,
    });
    const { deleteQuery, supabase } = createSupabaseMock({
      lineItemsError: { message: 'line item copy failed' },
    });

    const result = await duplicateQuoteForUser(
      supabase as never,
      'user-1',
      'quote-1'
    );

    expect(result).toEqual({ data: null, error: 'line item copy failed' });
    expect(deleteQuery.eq).toHaveBeenCalledWith('id', 'quote-copy');
    expect(deleteQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });
});
