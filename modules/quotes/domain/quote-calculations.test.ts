import { describe, expect, it } from 'vitest';
import { calculateQuickEstimate } from './quote-calculations';
import { buildDefaultRateSettings } from '@/modules/price-rates/domain/rate-settings';
import type { QuickInputs, SelectedQuickPropertyPreset } from './quote';

function makeSettings(overrides?: Partial<ReturnType<typeof buildDefaultRateSettings>>) {
  const base = buildDefaultRateSettings();
  // Set up a test room with known prices
  base.quick_estimate.rooms = [
    {
      id: 'room-1',
      label: 'Bedroom',
      enabled_surfaces: ['walls', 'ceiling', 'trim'],
      sizes: {
        small: { walls_cents: 20000, ceiling_cents: 10000, trim_cents: 10000 },
        medium: { walls_cents: 30000, ceiling_cents: 15000, trim_cents: 15000 },
        large: { walls_cents: 45000, ceiling_cents: 20000, trim_cents: 20000 },
      },
      sort_order: 0,
    },
    {
      id: 'room-2',
      label: 'Bathroom',
      enabled_surfaces: ['walls', 'ceiling', 'trim'],
      sizes: {
        small: { walls_cents: 15000, ceiling_cents: 8000, trim_cents: 8000 },
        medium: { walls_cents: 22000, ceiling_cents: 11000, trim_cents: 11000 },
        large: { walls_cents: 35000, ceiling_cents: 15000, trim_cents: 15000 },
      },
      sort_order: 1,
    },
  ];
  return { ...base, ...overrides };
}

describe('calculateQuickEstimate', () => {
  it('prices a selected 2 bed 2 bath apartment whole-property preset from anchors', () => {
    const rates = makeSettings();
    const inputs: QuickInputs = {
      property_preset: {
        preset_id: 'preset-2-bed-2-bath',
        label: '2 Bed 2 Bath Apartment',
        property_type: 'apartment',
        apartment_type: '2_bedroom_standard',
        bedrooms: 2,
        bathrooms: 2,
        sqm: 89,
        storeys: null,
        condition: 'fair',
        scope: ['walls', 'ceiling', 'trim'],
        wall_paint_system: 'repaint_2coat',
        subtotal_cents: 0,
        gst_cents: 0,
        total_cents: 0,
      },
      rooms: [],
      global_coating: 'two_coats_repaint',
      global_condition: 'average',
    };

    const result = calculateQuickEstimate(inputs, rates);

    expect(result.property_preset?.subtotal_cents).toBe(495650);
    expect(result.subtotal_cents).toBe(495650);
    expect(result.gst_cents).toBe(49565);
    expect(result.total_cents).toBe(545215);
  });

  it('prices whole-property trim higher when Water Base is selected', () => {
    const rates = makeSettings();
    const oilInputs: QuickInputs = {
      property_preset: {
        preset_id: 'preset-trim-oil',
        label: '2 Bed 2 Bath Apartment',
        property_type: 'apartment',
        apartment_type: '2_bedroom_standard',
        bedrooms: 2,
        bathrooms: 2,
        sqm: 89,
        storeys: null,
        condition: 'fair',
        scope: ['trim'],
        wall_paint_system: 'repaint_2coat',
        trim_paint_system: 'oil_2coat',
        subtotal_cents: 0,
        gst_cents: 0,
        total_cents: 0,
      },
      rooms: [],
      global_coating: 'two_coats_repaint',
      global_condition: 'average',
      global_trim_paint_system: 'oil_2coat',
    };
    const waterInputs: QuickInputs = {
      ...oilInputs,
      property_preset: oilInputs.property_preset
        ? {
            ...oilInputs.property_preset,
            preset_id: 'preset-trim-water',
            trim_paint_system: 'water_3coat_white_finish',
            subtotal_cents: 0,
            gst_cents: 0,
            total_cents: 0,
          }
        : null,
      global_trim_paint_system: 'water_3coat_white_finish',
    };

    const oilResult = calculateQuickEstimate(oilInputs, rates);
    const waterResult = calculateQuickEstimate(waterInputs, rates);

    expect(waterResult.subtotal_cents).toBeGreaterThan(
      oilResult.subtotal_cents
    );
  });

  it('uses a whole-property preset surface price split for selected scope pricing', () => {
    const rates = makeSettings();
    const basePreset: SelectedQuickPropertyPreset = {
      preset_id: 'preset-surface-split',
      label: '2 Bed 2 Bath Apartment',
      property_type: 'apartment' as const,
      apartment_type: '2_bedroom_standard' as const,
      bedrooms: 2,
      bathrooms: 2,
      sqm: 89,
      storeys: null,
      condition: 'fair' as const,
      scope: ['walls'],
      wall_paint_system: 'repaint_2coat' as const,
      trim_paint_system: 'oil_2coat' as const,
      subtotal_cents: 0,
      gst_cents: 0,
      total_cents: 0,
    };
    const defaultShare = calculateQuickEstimate(
      {
        property_preset: basePreset,
        rooms: [],
        global_coating: 'two_coats_repaint',
        global_condition: 'average',
      },
      rates
    );
    const customShare = calculateQuickEstimate(
      {
        property_preset: {
          ...basePreset,
          surface_price_share: {
            walls_pct: 60,
            ceiling_pct: 20,
            trim_pct: 20,
          },
        },
        rooms: [],
        global_coating: 'two_coats_repaint',
        global_condition: 'average',
      },
      rates
    );

    expect(customShare.subtotal_cents).toBeGreaterThan(
      defaultShare.subtotal_cents
    );
  });

  it('single room, walls only, 2coats/average = 100%×100% baseline', () => {
    const rates = makeSettings();
    const inputs: QuickInputs = {
      rooms: [
        {
          room_id: 'room-1',
          label: 'Bedroom',
          size: 'medium',
          selected_surfaces: ['walls'],
          walls_cents: 30000,
          ceiling_cents: 15000,
          trim_cents: 15000,
          coating_multiplier_pct: 100,
          condition_multiplier_pct: 100,
          total_cents: 30000,
        },
      ],
      global_coating: 'two_coats_repaint',
      global_condition: 'average',
    };
    const result = calculateQuickEstimate(inputs, rates);
    // walls_cents=30000, 100%×100% = 30000
    expect(result.rooms[0].total_cents).toBe(30000);
    expect(result.subtotal_cents).toBe(30000);
    expect(result.gst_cents).toBe(3000);
    expect(result.total_cents).toBe(33000);
  });

  it('single room, all surfaces, 1coat/average = 70%×100% = 0.70', () => {
    const rates = makeSettings();
    const inputs: QuickInputs = {
      rooms: [
        {
          room_id: 'room-1',
          label: 'Bedroom',
          size: 'medium',
          selected_surfaces: ['walls', 'ceiling', 'trim'],
          walls_cents: 30000,
          ceiling_cents: 15000,
          trim_cents: 15000,
          coating_multiplier_pct: 70,
          condition_multiplier_pct: 100,
          total_cents: 42000,
        },
      ],
      global_coating: 'one_coat_refresh',
      global_condition: 'average',
    };
    const result = calculateQuickEstimate(inputs, rates);
    // base = 30000+15000+15000 = 60000; × 0.70 × 1.00 = 42000
    expect(result.rooms[0].base_subtotal_cents).toBe(60000);
    expect(result.rooms[0].total_cents).toBe(42000);
  });

  it('1coat × good = 0.70 × 0.90 = 0.63', () => {
    const rates = makeSettings();
    const inputs: QuickInputs = {
      rooms: [
        {
          room_id: 'room-1',
          label: 'Bedroom',
          size: 'medium',
          selected_surfaces: ['walls'],
          walls_cents: 30000,
          ceiling_cents: 15000,
          trim_cents: 15000,
          coating_multiplier_pct: 70,
          condition_multiplier_pct: 90,
          total_cents: 18900,
        },
      ],
      global_coating: 'one_coat_refresh',
      global_condition: 'good',
    };
    const result = calculateQuickEstimate(inputs, rates);
    // 30000 × 0.70 × 0.90 = 18900
    expect(result.rooms[0].total_cents).toBe(18900);
  });

  it('multiple rooms summed correctly', () => {
    const rates = makeSettings();
    const inputs: QuickInputs = {
      rooms: [
        {
          room_id: 'room-1',
          label: 'Bedroom',
          size: 'small',
          selected_surfaces: ['walls'],
          walls_cents: 20000,
          ceiling_cents: 10000,
          trim_cents: 10000,
          coating_multiplier_pct: 100,
          condition_multiplier_pct: 100,
          total_cents: 20000,
        },
        {
          room_id: 'room-2',
          label: 'Bathroom',
          size: 'small',
          selected_surfaces: ['walls', 'ceiling'],
          walls_cents: 15000,
          ceiling_cents: 8000,
          trim_cents: 8000,
          coating_multiplier_pct: 100,
          condition_multiplier_pct: 100,
          total_cents: 23000,
        },
      ],
      global_coating: 'two_coats_repaint',
      global_condition: 'average',
    };
    const result = calculateQuickEstimate(inputs, rates);
    // room-1: walls=20000 → 20000
    expect(result.rooms[0].total_cents).toBe(20000);
    // room-2: walls+ceiling = 15000+8000 = 23000
    expect(result.rooms[1].total_cents).toBe(23000);
    expect(result.subtotal_cents).toBe(43000);
    expect(result.gst_cents).toBe(4300);
    expect(result.total_cents).toBe(47300);
  });

  it('same room added twice produces separate totals', () => {
    const rates = makeSettings();
    const inputs: QuickInputs = {
      rooms: [
        {
          room_id: 'room-1',
          label: 'Bedroom (with wardrobe)',
          size: 'medium',
          selected_surfaces: ['walls', 'ceiling', 'trim'],
          walls_cents: 30000,
          ceiling_cents: 15000,
          trim_cents: 15000,
          coating_multiplier_pct: 100,
          condition_multiplier_pct: 100,
          total_cents: 60000,
        },
        {
          room_id: 'room-1',
          label: 'Bedroom (no wardrobe)',
          size: 'medium',
          selected_surfaces: ['walls', 'ceiling'],
          walls_cents: 30000,
          ceiling_cents: 15000,
          trim_cents: 15000,
          coating_multiplier_pct: 100,
          condition_multiplier_pct: 100,
          total_cents: 45000,
        },
      ],
      global_coating: 'two_coats_repaint',
      global_condition: 'average',
    };
    const result = calculateQuickEstimate(inputs, rates);
    expect(result.rooms).toHaveLength(2);
    expect(result.rooms[0].total_cents).toBe(60000);
    expect(result.rooms[1].total_cents).toBe(45000);
    expect(result.subtotal_cents).toBe(105000);
  });

  it('room with $0 price contributes 0 to total (no error)', () => {
    const rates = makeSettings();
    rates.quick_estimate.rooms[0].sizes.medium = { walls_cents: 0, ceiling_cents: 0, trim_cents: 0 };
    const inputs: QuickInputs = {
      rooms: [
        {
          room_id: 'room-1',
          label: 'Bedroom',
          size: 'medium',
          selected_surfaces: ['walls', 'ceiling', 'trim'],
          walls_cents: 0,
          ceiling_cents: 0,
          trim_cents: 0,
          coating_multiplier_pct: 100,
          condition_multiplier_pct: 100,
          total_cents: 0,
        },
      ],
      global_coating: 'two_coats_repaint',
      global_condition: 'average',
    };
    const result = calculateQuickEstimate(inputs, rates);
    expect(result.rooms[0].total_cents).toBe(0);
    expect(result.subtotal_cents).toBe(0);
    expect(result.total_cents).toBe(0);
  });

  it('result has correct room metadata snapshots', () => {
    const rates = makeSettings();
    const inputs: QuickInputs = {
      rooms: [
        {
          room_id: 'room-1',
          label: 'Bedroom',
          size: 'large',
          selected_surfaces: ['walls', 'trim'],
          notes: 'skip wardrobe',
          walls_cents: 45000,
          ceiling_cents: 20000,
          trim_cents: 20000,
          coating_multiplier_pct: 100,
          condition_multiplier_pct: 130,
          total_cents: 84500,
        },
      ],
      global_coating: 'two_coats_repaint',
      global_condition: 'poor',
    };
    const result = calculateQuickEstimate(inputs, rates);
    const r = result.rooms[0];
    expect(r.notes).toBe('skip wardrobe');
    expect(r.size).toBe('large');
    expect(r.selected_surfaces).toEqual(['walls', 'trim']);
    expect(r.coating_multiplier_pct).toBe(100);
    expect(r.condition_multiplier_pct).toBe(130);
    // base = walls(45000)+trim(20000)=65000; × 1.00 × 1.30 = 84500
    expect(r.total_cents).toBe(84500);
  });

  it('uses selected room snapshot prices instead of current Price Rates template prices', () => {
    const rates = makeSettings();
    rates.quick_estimate.rooms[0].sizes.medium = {
      walls_cents: 99900,
      ceiling_cents: 99900,
      trim_cents: 99900,
    };
    const inputs: QuickInputs = {
      rooms: [
        {
          room_id: 'room-1',
          source_rate_item_id: 'room-1',
          source_rate_item_version: 1,
          label: 'Bedroom',
          size: 'medium',
          selected_surfaces: ['walls'],
          walls_cents: 30000,
          ceiling_cents: 15000,
          trim_cents: 15000,
          coating_multiplier_pct: 100,
          condition_multiplier_pct: 100,
          total_cents: 30000,
        },
      ],
      global_coating: 'two_coats_repaint',
      global_condition: 'average',
    };

    const result = calculateQuickEstimate(inputs, rates);

    expect(result.rooms[0].walls_cents).toBe(30000);
    expect(result.rooms[0].total_cents).toBe(30000);
    expect(result.subtotal_cents).toBe(30000);
  });

  it('keeps quote A on version 1 snapshot while quote B uses version 2 prices', () => {
    const rates = makeSettings();

    const quoteA: QuickInputs = {
      rooms: [
        {
          room_id: 'room-1',
          source_rate_item_id: 'room-1',
          source_rate_item_version: 1,
          source_rate_item_label: 'Bedroom',
          rate_snapshot_version: 1,
          label: 'Bedroom',
          size: 'medium',
          selected_surfaces: ['walls', 'ceiling'],
          walls_cents: 30000,
          ceiling_cents: 15000,
          trim_cents: 15000,
          coating_multiplier_pct: 100,
          condition_multiplier_pct: 100,
          total_cents: 45000,
        },
      ],
      global_coating: 'two_coats_repaint',
      global_condition: 'average',
    };

    rates.quick_estimate.rooms[0] = {
      ...rates.quick_estimate.rooms[0],
      version: 2,
      sizes: {
        ...rates.quick_estimate.rooms[0].sizes,
        medium: {
          walls_cents: 80000,
          ceiling_cents: 20000,
          trim_cents: 15000,
        },
      },
    };

    const quoteB: QuickInputs = {
      rooms: [
        {
          room_id: 'room-1',
          source_rate_item_id: 'room-1',
          source_rate_item_version: 2,
          source_rate_item_label: 'Bedroom',
          rate_snapshot_version: 1,
          label: 'Bedroom',
          size: 'medium',
          selected_surfaces: ['walls', 'ceiling'],
          walls_cents: 80000,
          ceiling_cents: 20000,
          trim_cents: 15000,
          coating_multiplier_pct: 100,
          condition_multiplier_pct: 100,
          total_cents: 100000,
        },
      ],
      global_coating: 'two_coats_repaint',
      global_condition: 'average',
    };

    expect(calculateQuickEstimate(quoteA, rates).subtotal_cents).toBe(45000);
    expect(calculateQuickEstimate(quoteB, rates).subtotal_cents).toBe(100000);
  });

  it('uses stored snapshot multipliers when Price Rates multipliers change later', () => {
    const rates = makeSettings();
    rates.quick_estimate.coating_multipliers.one_coat_refresh_pct = 50;
    rates.quick_estimate.condition_multipliers.good_pct = 80;
    const inputs: QuickInputs = {
      rooms: [
        {
          room_id: 'room-1',
          source_rate_item_id: 'room-1',
          source_rate_item_version: 1,
          label: 'Bedroom',
          size: 'medium',
          selected_surfaces: ['walls'],
          walls_cents: 30000,
          ceiling_cents: 15000,
          trim_cents: 15000,
          coating_multiplier_pct: 70,
          condition_multiplier_pct: 90,
          total_cents: 18900,
        },
      ],
      global_coating: 'one_coat_refresh',
      global_condition: 'good',
    };

    const result = calculateQuickEstimate(inputs, rates);

    expect(result.rooms[0].coating_multiplier_pct).toBe(70);
    expect(result.rooms[0].condition_multiplier_pct).toBe(90);
    expect(result.rooms[0].total_cents).toBe(18900);
  });
});
