import { describe, expect, it } from 'vitest';
import {
  calculateInteriorEstimate,
  snapshotInteriorEstimateInput,
} from '@/lib/interior-estimates';
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

  it('prices measured specific-area rooms from per-surface quantities and saved rates', () => {
    const userRates = buildDefaultRateSettings();
    userRates.walls.repaint_2coat = 1800;
    userRates.ceiling.repaint_2coat = 2000;
    userRates.trim.repaint_2coat = 900;

    const result = calculateInteriorEstimate(
      {
        property_type: 'apartment',
        estimate_mode: 'specific_areas',
        condition: 'fair',
        scope: ['walls', 'ceiling', 'trim'],
        wall_paint_system: 'repaint_2coat',
        trim_paint_system: 'oil_2coat',
        property_details: {
          apartment_type: null,
          sqm: null,
          bedrooms: null,
          bathrooms: null,
          storeys: null,
        },
        rooms: [
          {
            name: 'Bedroom 1',
            anchor_room_type: 'Bedroom 1',
            room_type: 'interior',
            length_m: null,
            width_m: null,
            height_m: null,
            pricing_model: 'measured',
            wall_area_m2: 40,
            ceiling_area_m2: 12,
            trim_linear_m: 18,
            include_walls: true,
            include_ceiling: true,
            include_trim: true,
          } as never,
        ],
        opening_items: [],
        trim_items: [],
      },
      userRates
    );

    expect(result.subtotal_cents).toBe(112200);
    expect(result.gst_cents).toBe(11220);
    expect(result.line_items).toEqual([
      expect.objectContaining({
        category: 'room_anchor',
        label: 'Bedroom 1 walls',
        quantity: 40,
        unit: 'sqm',
        unit_price_cents: 1800,
        total_cents: 72000,
      }),
      expect.objectContaining({
        category: 'room_anchor',
        label: 'Bedroom 1 ceiling',
        quantity: 12,
        unit: 'sqm',
        unit_price_cents: 2000,
        total_cents: 24000,
      }),
      expect.objectContaining({
        category: 'room_anchor',
        label: 'Bedroom 1 trim',
        quantity: 18,
        unit: 'linear_metre',
        unit_price_cents: 900,
        total_cents: 16200,
      }),
    ]);
    expect(result.snapshot.price_source).toBe('mixed');
  });

  it('uses saved user door rates in the detailed estimate engine', () => {
    const userRates = buildDefaultRateSettings();
    userRates.door_unit_rates.oil_2coat.standard.door_and_frame = 30000;

    const result = calculateInteriorEstimate(
      {
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
      },
      userRates
    );

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

    const result = calculateInteriorEstimate(
      {
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
      },
      userRates
    );

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

  it('uses custom detailed estimate room anchors for specific areas', () => {
    const userRates = buildDefaultRateSettings();
    userRates.detailed_estimate_anchors.interior_rooms['Bedroom 1'] = {
      min: 200000,
      median: 200000,
      max: 200000,
    };

    const result = calculateInteriorEstimate(
      {
        property_type: 'apartment',
        estimate_mode: 'specific_areas',
        condition: 'excellent',
        scope: ['walls', 'ceiling', 'trim'],
        wall_paint_system: 'repaint_2coat',
        property_details: {},
        rooms: [
          {
            name: 'Bedroom',
            anchor_room_type: 'Bedroom 1',
            room_type: 'interior',
            length_m: null,
            width_m: null,
            height_m: null,
            include_walls: true,
            include_ceiling: true,
            include_trim: true,
          },
        ],
        opening_items: [],
        trim_items: [],
      },
      userRates
    );

    expect(result.pricing_items[0]?.unit_price_cents).toBe(200000);
  });

  it('uses stored advanced room anchor snapshots when current anchors change later', () => {
    const ratesV1 = buildDefaultRateSettings();
    ratesV1.detailed_estimate_anchors.interior_rooms['Bedroom 1'] = {
      min: 180000,
      median: 200000,
      max: 230000,
    };

    const savedInput = snapshotInteriorEstimateInput(
      {
        property_type: 'apartment',
        estimate_mode: 'specific_areas',
        condition: 'excellent',
        scope: ['walls', 'ceiling', 'trim'],
        wall_paint_system: 'repaint_2coat',
        property_details: {},
        rooms: [
          {
            name: 'Bedroom repaint',
            anchor_room_type: 'Bedroom 1',
            room_type: 'interior',
            length_m: null,
            width_m: null,
            height_m: null,
            include_walls: true,
            include_ceiling: true,
            include_trim: true,
            source_rate_item_id: 'adv-bedroom',
            source_rate_item_version: 1,
            source_rate_item_label: 'Bedroom repaint',
            rate_snapshot_version: 1,
          },
        ],
        opening_items: [],
        trim_items: [],
      },
      ratesV1
    );

    const ratesV2 = buildDefaultRateSettings();
    ratesV2.detailed_estimate_anchors.interior_rooms['Bedroom 1'] = {
      min: 480000,
      median: 500000,
      max: 530000,
    };

    const oldQuote = calculateInteriorEstimate(savedInput, ratesV2);
    const newQuote = calculateInteriorEstimate(
      {
        ...savedInput,
        rooms: savedInput.rooms.map((room) => ({
          name: room.name,
          anchor_room_type: room.anchor_room_type,
          room_type: room.room_type,
          length_m: room.length_m,
          width_m: room.width_m,
          height_m: room.height_m,
          include_walls: room.include_walls,
          include_ceiling: room.include_ceiling,
          include_trim: room.include_trim,
        })),
      },
      ratesV2
    );

    expect(savedInput.rooms[0]).toEqual(
      expect.objectContaining({
        source_anchor_range_cents: {
          min: 180000,
          median: 200000,
          max: 230000,
        },
        source_surface_rate_multiplier: expect.any(Number),
        source_scope_multiplier: 1,
        source_condition: 'excellent',
        source_wall_paint_system: 'repaint_2coat',
      })
    );
    expect(oldQuote.pricing_items[0]?.unit_price_cents).toBe(200000);
    expect(newQuote.pricing_items[0]?.unit_price_cents).toBe(500000);
  });

  it('uses Room Price Library snapshots for advanced rooms when quick template prices change later', () => {
    const ratesV1 = buildDefaultRateSettings();
    ratesV1.quick_estimate.rooms = [
      {
        id: 'quick-bedroom',
        version: 2,
        label: 'Bedroom',
        enabled_surfaces: ['walls', 'ceiling', 'trim'],
        sizes: {
          small: { walls_cents: 90000, ceiling_cents: 30000, trim_cents: 10000 },
          medium: { walls_cents: 120000, ceiling_cents: 45000, trim_cents: 15000 },
          large: { walls_cents: 150000, ceiling_cents: 60000, trim_cents: 20000 },
        },
        sort_order: 0,
      },
    ];

    const savedInput = snapshotInteriorEstimateInput(
      {
        property_type: 'apartment',
        estimate_mode: 'specific_areas',
        condition: 'fair',
        scope: ['walls', 'ceiling'],
        wall_paint_system: 'repaint_2coat',
        property_details: {},
        rooms: [
          {
            name: 'Bedroom repaint',
            anchor_room_type: 'Bedroom',
            room_type: 'interior',
            length_m: null,
            width_m: null,
            height_m: null,
            include_walls: true,
            include_ceiling: true,
            include_trim: false,
            source_room_template_id: 'quick-bedroom',
            source_room_template_version: 2,
            source_room_template_label: 'Bedroom',
            source_room_template_size: 'medium',
          },
        ],
        opening_items: [],
        trim_items: [],
      },
      ratesV1
    );

    const ratesV2 = buildDefaultRateSettings();
    ratesV2.quick_estimate.rooms = [
      {
        ...ratesV1.quick_estimate.rooms[0],
        version: 3,
        sizes: {
          small: { walls_cents: 190000, ceiling_cents: 130000, trim_cents: 10000 },
          medium: { walls_cents: 220000, ceiling_cents: 145000, trim_cents: 15000 },
          large: { walls_cents: 250000, ceiling_cents: 160000, trim_cents: 20000 },
        },
      },
    ];

    const oldQuote = calculateInteriorEstimate(savedInput, ratesV2);
    const newQuote = calculateInteriorEstimate(
      {
        ...savedInput,
        rooms: savedInput.rooms.map((room) => ({
          ...room,
          rate_snapshot_version: undefined,
          source_room_template_surface_prices_cents: undefined,
          source_anchor_range_cents: undefined,
        })),
      },
      ratesV2
    );

    expect(savedInput.rooms[0]).toEqual(
      expect.objectContaining({
        rate_snapshot_version: 1,
        source_room_template_id: 'quick-bedroom',
        source_room_template_version: 2,
        source_room_template_label: 'Bedroom',
        source_room_template_size: 'medium',
        source_room_template_surface_prices_cents: {
          walls_cents: 120000,
          ceiling_cents: 45000,
          trim_cents: 0,
        },
        source_anchor_range_cents: {
          min: 120000,
          median: 165000,
          max: 210000,
        },
      })
    );
    expect(oldQuote.pricing_items[0]?.unit_price_cents).toBe(165000);
    expect(newQuote.pricing_items[0]?.unit_price_cents).toBe(365000);
  });

  it('rejects specific-area rooms with no selected walls, ceiling, or trim', () => {
    expect(() =>
      calculateInteriorEstimate({
        property_type: 'apartment',
        estimate_mode: 'specific_areas',
        condition: 'fair',
        scope: ['walls', 'ceiling', 'trim'],
        wall_paint_system: 'repaint_2coat',
        property_details: {},
        rooms: [
          {
            name: 'Deselected room',
            anchor_room_type: 'Living Room',
            room_type: 'interior',
            length_m: null,
            width_m: null,
            height_m: null,
            include_walls: false,
            include_ceiling: false,
            include_trim: false,
          },
        ],
        opening_items: [],
        trim_items: [],
      })
    ).toThrow(/at least one surface/i);
  });

  it('does not use room flat rate presets for detailed estimates', () => {
    const userRates = buildDefaultRateSettings();
    userRates.room_rate_presets = [
      {
        id: 'preset-bedroom',
        title: 'Bedroom 1',
        sqm: 12,
        rate_cents: 999999,
      },
    ];

    const result = calculateInteriorEstimate(
      {
        property_type: 'apartment',
        estimate_mode: 'specific_areas',
        condition: 'excellent',
        scope: ['walls', 'ceiling', 'trim'],
        wall_paint_system: 'repaint_2coat',
        property_details: {},
        rooms: [
          {
            name: 'Bedroom',
            anchor_room_type: 'Bedroom 1',
            room_type: 'interior',
            length_m: null,
            width_m: null,
            height_m: null,
            include_walls: true,
            include_ceiling: true,
            include_trim: true,
          },
        ],
        opening_items: [],
        trim_items: [],
      },
      userRates
    );

    expect(result.pricing_items[0]?.unit_price_cents).not.toBe(999999);
  });

  it('uses saved surface rates as a multiplier for entire-property estimates', () => {
    const userRates = buildDefaultRateSettings();
    userRates.walls.repaint_2coat *= 2;
    userRates.ceiling.repaint_2coat *= 2;
    userRates.trim.repaint_2coat *= 2;

    const result = calculateInteriorEstimate(
      {
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
      },
      userRates
    );

    expect(result.subtotal_cents).toBe(1150000);
	  expect(result.gst_cents).toBe(115000);
	  expect(result.total_cents).toBe(1265000);
	  expect(result.snapshot.price_source).toBe('anchor');
	});

  it('uses house sqm to scale entire-property house estimates within the selected configuration', () => {
    const smallHouse = calculateInteriorEstimate({
      property_type: 'house',
      estimate_mode: 'entire_property',
      condition: 'fair',
      scope: ['walls', 'ceiling', 'trim'],
      property_details: {
        apartment_type: null,
        sqm: 100,
        bedrooms: 3,
        bathrooms: 2,
        storeys: '1_storey',
      },
      rooms: [],
      opening_items: [],
      trim_items: [],
    });

    const largeHouse = calculateInteriorEstimate({
      property_type: 'house',
      estimate_mode: 'entire_property',
      condition: 'fair',
      scope: ['walls', 'ceiling', 'trim'],
      property_details: {
        apartment_type: null,
        sqm: 180,
        bedrooms: 3,
        bathrooms: 2,
        storeys: '1_storey',
      },
      rooms: [],
      opening_items: [],
      trim_items: [],
    });

    expect(largeHouse.subtotal_cents).toBeGreaterThan(smallHouse.subtotal_cents);
    expect(largeHouse.pricing_items[0]?.metadata?.sqm).toBe(180);
  });
});
