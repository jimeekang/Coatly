import { describe, expect, it } from 'vitest';
import {
  interiorEstimateSchema,
  quoteCreateSchema,
  quoteLineItemInsertSchema,
  ratePresetSchema,
} from '@/lib/supabase/validators';

describe('interiorEstimateSchema', () => {
  it('requires at least one room for specific-area estimates', () => {
    const parsed = interiorEstimateSchema.safeParse({
      property_type: 'apartment',
      estimate_mode: 'specific_areas',
      condition: 'fair',
      scope: ['walls'],
      property_details: {},
      rooms: [],
      opening_items: [],
      trim_items: [],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe('Add at least one room');
  });

  it('requires door-specific fields for door opening items', () => {
    const parsed = interiorEstimateSchema.safeParse({
      property_type: 'apartment',
      estimate_mode: 'specific_areas',
      condition: 'fair',
      scope: ['walls'],
      property_details: {},
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
      opening_items: [
        {
          opening_type: 'door',
          paint_system: 'oil_2coat',
          quantity: 1,
        },
      ],
      trim_items: [],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.message)).toEqual([
      'Select the door type',
      'Select the door scope',
    ]);
  });
});

describe('quoteCreateSchema', () => {
  it('accepts interior estimate quotes without manual rooms', () => {
    const parsed = quoteCreateSchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Apartment repaint',
      status: 'draft',
      valid_until: '2026-04-10',
      tier: 'better',
      labour_margin_percent: 10,
      material_margin_percent: 5,
      notes: '',
      internal_notes: '',
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

    expect(parsed.success).toBe(true);
  });
});

describe('quoteLineItemInsertSchema', () => {
  it('accepts quote estimate items used as quote line items', () => {
    const parsed = quoteLineItemInsertSchema.safeParse({
      quote_id: '550e8400-e29b-41d4-a716-446655440000',
      category: 'room',
      label: 'Living room walls',
      quantity: 32.5,
      unit: 'm2',
      unit_price_cents: 1800,
      total_cents: 58500,
      metadata: { room_index: 0 },
      sort_order: 0,
    });

    expect(parsed.success).toBe(true);
  });
});

describe('ratePresetSchema', () => {
  it('requires non-negative integer rate values for every configured surface and coating', () => {
    const parsed = ratePresetSchema.safeParse({
      walls: {
        touch_up_2coat: 1200,
        repaint_2coat: 1800,
        new_plaster_3coat: 2800,
      },
      ceiling: {
        touch_up_2coat: 1400,
        repaint_2coat: 2000,
        new_plaster_3coat: 3000,
      },
      trim: {
        touch_up_2coat: 2500,
        repaint_2coat: 3500,
        new_plaster_3coat: 5000,
      },
      doors: {
        touch_up_2coat: 3000,
        repaint_2coat: 4500,
        new_plaster_3coat: 6000,
      },
      windows: {
        touch_up_2coat: 3500,
        repaint_2coat: 5000,
        new_plaster_3coat: 7000,
      },
    });

    expect(parsed.success).toBe(true);
  });
});
