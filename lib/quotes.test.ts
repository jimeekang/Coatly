import { describe, expect, it } from 'vitest';
import {
  calculateQuotePreview,
  getSuggestedRatePerSqmCents,
  parseQuoteCreateInput,
} from '@/lib/quotes';

describe('lib/quotes', () => {
  it('calculates quoted totals from rooms, surfaces, and margins', () => {
    const preview = calculateQuotePreview({
      complexity: 'standard',
      labour_margin_percent: 10,
      material_margin_percent: 5,
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
              notes: null,
            },
          ],
        },
      ],
    });

    expect(preview.base_subtotal_cents).toBe(63000);
    expect(preview.subtotal_cents).toBe(72450);
    expect(preview.gst_cents).toBe(7245);
    expect(preview.total_cents).toBe(79695);
  });

  it('normalizes a quote create payload', () => {
    const parsed = parseQuoteCreateInput({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      title: '  Harbor Cafe repaint  ',
      status: 'draft',
      valid_until: '2026-04-10',
      complexity: 'standard',
      labour_margin_percent: 10,
      material_margin_percent: 5,
      notes: '  Client-facing note  ',
      internal_notes: '  Internal note  ',
      rooms: [
        {
          name: '  Living Room  ',
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
              notes: '  Two coats  ',
            },
          ],
        },
      ],
    });

    expect(parsed).toEqual({
      success: true,
      data: {
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Harbor Cafe repaint',
        status: 'draft',
        valid_until: '2026-04-10',
        complexity: 'standard',
        labour_margin_percent: 10,
        material_margin_percent: 5,
        manual_adjustment_cents: 0,
        notes: 'Client-facing note',
        internal_notes: 'Internal note',
        interior_estimate: null,
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
                notes: 'Two coats',
              },
            ],
          },
        ],
      },
    });
  });

  it('normalizes an interior estimate payload for anchor pricing', () => {
    const parsed = parseQuoteCreateInput({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      title: '  Apartment repaint  ',
      status: 'draft',
      valid_until: '2026-04-10',
      complexity: 'standard',
      labour_margin_percent: 10,
      material_margin_percent: 5,
      notes: '  Client-facing note  ',
      internal_notes: '  Internal note  ',
      rooms: [],
      interior_estimate: {
        property_type: 'apartment',
        estimate_mode: 'specific_areas',
        condition: 'fair',
        scope: ['walls', 'trim'],
        property_details: {
          apartment_type: '2_bedroom_standard',
        },
        rooms: [
          {
            name: '  Living Room  ',
            anchor_room_type: 'Living Room',
            room_type: 'interior',
            include_walls: true,
            include_ceiling: false,
            include_trim: true,
          },
        ],
        opening_items: [
          {
            opening_type: 'door',
            paint_system: 'oil_2coat',
            quantity: 2,
            door_type: 'standard',
            door_scope: 'door_and_frame',
          },
        ],
        trim_items: [
          {
            trim_type: 'skirting',
            paint_system: 'water_3coat_white_finish',
            quantity: 12.5,
          },
        ],
      },
    });

    expect(parsed).toEqual({
      success: true,
      data: {
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Apartment repaint',
        status: 'draft',
        valid_until: '2026-04-10',
        complexity: 'standard',
        labour_margin_percent: 10,
        material_margin_percent: 5,
        manual_adjustment_cents: 0,
        notes: 'Client-facing note',
        internal_notes: 'Internal note',
        interior_estimate: {
          property_type: 'apartment',
          estimate_mode: 'specific_areas',
          condition: 'fair',
          scope: ['walls', 'trim'],
          property_details: {
            apartment_type: '2_bedroom_standard',
            sqm: null,
            bedrooms: null,
            bathrooms: null,
            storeys: null,
          },
          rooms: [
            {
              name: 'Living Room',
              anchor_room_type: 'Living Room',
              room_type: 'interior',
              length_m: null,
              width_m: null,
              height_m: null,
              include_walls: true,
              include_ceiling: false,
              include_trim: true,
            },
          ],
          opening_items: [
            {
              opening_type: 'door',
              paint_system: 'oil_2coat',
              quantity: 2,
              room_index: null,
              door_type: 'standard',
              door_scope: 'door_and_frame',
              window_type: undefined,
              window_scope: undefined,
            },
          ],
          trim_items: [
            {
              trim_type: 'skirting',
              paint_system: 'water_3coat_white_finish',
              quantity: 12.5,
              room_index: null,
            },
          ],
        },
        rooms: [],
      },
    });
  });

  it('rejects quote creation when neither manual rooms nor an interior estimate is provided', () => {
    const parsed = parseQuoteCreateInput({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Apartment repaint',
      status: 'draft',
      valid_until: '2026-04-10',
      complexity: 'standard',
      labour_margin_percent: 10,
      material_margin_percent: 5,
      notes: '',
      internal_notes: '',
      rooms: [],
    });

    expect(parsed).toEqual({
      success: false,
      error: 'Add at least one room',
    });
  });

  it('provides a suggested rate for a surface and complexity level', () => {
    expect(getSuggestedRatePerSqmCents('walls', 'repaint_2coat', 'standard')).toBe(1800);
    expect(getSuggestedRatePerSqmCents('walls', 'repaint_2coat', 'complex')).toBeGreaterThan(
      1800
    );
  });
});
