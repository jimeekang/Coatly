import { describe, expect, it } from 'vitest';
import {
  calculateQuotePreview,
  getSuggestedRatePerM2Cents,
  parseQuoteCreateInput,
} from '@/lib/quotes';

describe('lib/quotes', () => {
  it('calculates quoted totals from rooms, surfaces, and margins', () => {
    const preview = calculateQuotePreview({
      tier: 'better',
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
      tier: 'better',
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
        tier: 'better',
        labour_margin_percent: 10,
        material_margin_percent: 5,
        notes: 'Client-facing note',
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
                notes: 'Two coats',
              },
            ],
          },
        ],
      },
    });
  });

  it('provides a suggested rate for a surface and tier', () => {
    expect(getSuggestedRatePerM2Cents('walls', 'repaint_2coat', 'better')).toBe(1800);
    expect(getSuggestedRatePerM2Cents('walls', 'repaint_2coat', 'best')).toBeGreaterThan(
      1800
    );
  });
});
