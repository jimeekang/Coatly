import { describe, expect, it } from 'vitest';
import { calculateInteriorEstimate } from '@/lib/interior-estimates';
import { buildDefaultRateSettings } from '@/lib/rate-settings';

describe('calculateInteriorEstimate', () => {
  it('calculates apartment entire-property anchors with condition and GST', () => {
    const result = calculateInteriorEstimate({
      property_type: 'apartment',
      estimate_mode: 'entire_property',
      condition: 'fair',
      scope: ['walls', 'ceiling', 'trim'],
      property_details: {
        apartment_type: '2_bedroom_standard',
        sqm: null,
        bedrooms: null,
        bathrooms: null,
        storeys: null,
      },
      rooms: [],
      opening_items: [],
      trim_items: [],
    });

    expect(result).toMatchObject({
      subtotal_cents: 575000,
      gst_cents: 57500,
      total_cents: 632500,
      line_items: [
        {
          category: 'entire_property',
          label: 'Apartment interior repaint (2 Bedroom (Standard))',
          quantity: 1,
          unit: 'job',
          unit_price_cents: 575000,
          total_cents: 575000,
        },
      ],
      snapshot: {
        property_type: 'apartment',
        estimate_mode: 'entire_property',
        condition: 'fair',
        range_cents: {
          min: 515000,
          median: 575000,
          max: 635000,
        },
        adjustments: {
          scope_multiplier: 1,
          storey_multiplier: 1,
          quantity_scale_factor: 1,
        },
      },
    });
  });

  it('applies quantity scaling to specific-area opening items', () => {
    const result = calculateInteriorEstimate({
      property_type: 'apartment',
      estimate_mode: 'specific_areas',
      condition: 'fair',
      scope: ['walls', 'ceiling', 'trim'],
      property_details: {
        apartment_type: null,
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
          include_ceiling: true,
          include_trim: true,
        },
      ],
      opening_items: [
        {
          opening_type: 'door',
          paint_system: 'oil_2coat',
          quantity: 4,
          room_index: 0,
          door_type: 'standard',
          door_scope: 'door_and_frame',
        },
      ],
      trim_items: [],
    });

    expect(result.subtotal_cents).toBe(385710);
    expect(result.line_items).toEqual([
      expect.objectContaining({
        category: 'room_anchor',
        label: 'Living Room',
        unit_price_cents: 304750,
        total_cents: 304750,
      }),
      expect.objectContaining({
        category: 'door',
        label: 'Standard Door & Frame',
        quantity: 4,
        unit_price_cents: 20240,
        total_cents: 80960,
      }),
    ]);
    expect(result.snapshot.adjustments.quantity_scale_factor).toBe(0.92);
  });

  it('uses saved user door rates in the detailed estimate engine', () => {
    const userRates = buildDefaultRateSettings();
    userRates.door_unit_rates.oil_2coat.standard.door_and_frame = 30000;

    const result = calculateInteriorEstimate({
      property_type: 'apartment',
      estimate_mode: 'specific_areas',
      condition: 'fair',
      scope: ['walls', 'ceiling', 'trim'],
      property_details: {
        apartment_type: null,
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
          include_ceiling: true,
          include_trim: true,
        },
      ],
      opening_items: [
        {
          opening_type: 'door',
          paint_system: 'oil_2coat',
          quantity: 4,
          room_index: 0,
          door_type: 'standard',
          door_scope: 'door_and_frame',
        },
      ],
      trim_items: [],
    }, userRates);

    expect(result.subtotal_cents).toBe(415150);
    expect(result.line_items).toEqual([
      expect.objectContaining({
        category: 'room_anchor',
        label: 'Living Room',
        unit_price_cents: 304750,
        total_cents: 304750,
      }),
      expect.objectContaining({
        category: 'door',
        label: 'Standard Door & Frame',
        quantity: 4,
        unit_price_cents: 27600,
        total_cents: 110400,
      }),
    ]);
    expect(result.snapshot.price_source).toBe('mixed');
  });

  it('uses saved user window rates in the detailed estimate engine', () => {
    const userRates = buildDefaultRateSettings();
    userRates.window_unit_rates.oil_2coat.normal.window_and_frame = 25000;

    const result = calculateInteriorEstimate({
      property_type: 'apartment',
      estimate_mode: 'specific_areas',
      condition: 'fair',
      scope: ['walls', 'ceiling', 'trim'],
      property_details: {
        apartment_type: null,
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
          include_ceiling: true,
          include_trim: true,
        },
      ],
      opening_items: [
        {
          opening_type: 'window',
          paint_system: 'oil_2coat',
          quantity: 2,
          room_index: 0,
          window_type: 'normal',
          window_scope: 'window_and_frame',
        },
      ],
      trim_items: [],
    }, userRates);

    expect(result.subtotal_cents).toBe(354750);
    expect(result.line_items).toEqual([
      expect.objectContaining({
        category: 'room_anchor',
        label: 'Living Room',
        unit_price_cents: 304750,
        total_cents: 304750,
      }),
      expect.objectContaining({
        category: 'window',
        label: 'Normal Window & Frame',
        quantity: 2,
        unit_price_cents: 25000,
        total_cents: 50000,
      }),
    ]);
    expect(result.snapshot.price_source).toBe('mixed');
  });

  it('uses saved surface rates as a multiplier for entire-property estimates', () => {
    const userRates = buildDefaultRateSettings();
    userRates.walls.repaint_2coat *= 2;
    userRates.ceiling.repaint_2coat *= 2;
    userRates.trim.repaint_2coat *= 2;

    const result = calculateInteriorEstimate({
      property_type: 'apartment',
      estimate_mode: 'entire_property',
      condition: 'fair',
      scope: ['walls', 'ceiling', 'trim'],
      property_details: {
        apartment_type: '2_bedroom_standard',
        sqm: null,
        bedrooms: null,
        bathrooms: null,
        storeys: null,
      },
      rooms: [],
      opening_items: [],
      trim_items: [],
    }, userRates);

    expect(result.subtotal_cents).toBe(1150000);
    expect(result.gst_cents).toBe(115000);
    expect(result.total_cents).toBe(1265000);
    expect(result.snapshot.price_source).toBe('anchor');
  });
});
