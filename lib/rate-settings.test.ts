import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RATE_SETTINGS,
  DEFAULT_DOOR_UNIT_RATES,
  DEFAULT_WINDOW_UNIT_RATES,
  buildDefaultRateSettings,
  parseUserRateSettings,
  ratePresetSchema,
  RATE_DOOR_TYPES,
  DOOR_SCOPES,
  WINDOW_TYPES,
  WINDOW_SCOPES,
  SQM_SURFACE_TYPES,
  EXTERIOR_SURFACES,
  TRIM_PAINT_SYSTEMS,
} from '@/lib/rate-settings';

// ─── ratePresetSchema ─────────────────────────────────────────────────────────

describe('ratePresetSchema', () => {
  it('rejects negative per-m² rate values', () => {
    const parsed = ratePresetSchema.safeParse({
      walls: { refresh_1coat: -1, repaint_2coat: 1800, new_plaster_3coat: 2800 },
      ceiling: { refresh_1coat: 1400, repaint_2coat: 2000, new_plaster_3coat: 3000 },
      trim:    { refresh_1coat: 2500, repaint_2coat: 3500, new_plaster_3coat: 5000 },
      doors:   { refresh_1coat: 3000, repaint_2coat: 4500, new_plaster_3coat: 6000 },
      windows: { refresh_1coat: 3500, repaint_2coat: 5000, new_plaster_3coat: 7000 },
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts zero rates', () => {
    const parsed = ratePresetSchema.safeParse({
      walls:   { refresh_1coat: 0, repaint_2coat: 0, new_plaster_3coat: 0 },
      ceiling: { refresh_1coat: 0, repaint_2coat: 0, new_plaster_3coat: 0 },
      trim:    { refresh_1coat: 0, repaint_2coat: 0, new_plaster_3coat: 0 },
      doors:   { refresh_1coat: 0, repaint_2coat: 0, new_plaster_3coat: 0 },
      windows: { refresh_1coat: 0, repaint_2coat: 0, new_plaster_3coat: 0 },
    });
    expect(parsed.success).toBe(true);
  });
});

// ─── buildDefaultRateSettings ─────────────────────────────────────────────────

describe('buildDefaultRateSettings', () => {
  it('includes all door types for all paint systems and scopes', () => {
    const settings = buildDefaultRateSettings();
    for (const ps of TRIM_PAINT_SYSTEMS) {
      for (const dt of RATE_DOOR_TYPES) {
        for (const scope of DOOR_SCOPES) {
          expect(settings.door_unit_rates[ps][dt][scope]).toBeGreaterThan(0);
        }
      }
    }
  });

  it('includes all window types for all paint systems and scopes', () => {
    const settings = buildDefaultRateSettings();
    for (const ps of TRIM_PAINT_SYSTEMS) {
      for (const type of WINDOW_TYPES) {
        for (const scope of WINDOW_SCOPES) {
          expect(settings.window_unit_rates[ps][type][scope]).toBeGreaterThan(0);
        }
      }
    }
  });

  it('enables all detailed estimate items by default', () => {
    const settings = buildDefaultRateSettings();
    expect(settings.enabled_surface_types).toEqual(expect.arrayContaining([...SQM_SURFACE_TYPES]));
    expect(settings.enabled_door_types).toEqual(expect.arrayContaining([...RATE_DOOR_TYPES]));
    expect(settings.enabled_door_scopes).toEqual(expect.arrayContaining([...DOOR_SCOPES]));
    expect(settings.enabled_window_types).toEqual(expect.arrayContaining([...WINDOW_TYPES]));
    expect(settings.enabled_exterior_surfaces).toEqual(expect.arrayContaining([...EXTERIOR_SURFACES]));
    expect(settings.custom_exterior_surfaces).toEqual([]);
  });

  it('standard door oil_2coat door_and_frame matches anchor price', () => {
    const settings = buildDefaultRateSettings();
    // Anchor: $220 = 22000 cents
    expect(settings.door_unit_rates.oil_2coat.standard.door_and_frame).toBe(22000);
  });
});

// ─── parseUserRateSettings ────────────────────────────────────────────────────

describe('parseUserRateSettings', () => {
  it('merges a partial stored preset with defaults for per-m² rates', () => {
    const parsed = parseUserRateSettings({ walls: { repaint_2coat: 2100 } });
    expect(parsed.walls.repaint_2coat).toBe(2100);
    expect(parsed.ceiling.repaint_2coat).toBe(DEFAULT_RATE_SETTINGS.ceiling.repaint_2coat);
  });

  it('accepts legacy touch_up_2coat values from stored presets', () => {
    const parsed = parseUserRateSettings({
      walls: { touch_up_2coat: 1350 },
    });

    expect(parsed.walls.refresh_1coat).toBe(1350);
    expect(parsed.walls.repaint_2coat).toBe(DEFAULT_RATE_SETTINGS.walls.repaint_2coat);
  });

  it('falls back to defaults when given an empty object', () => {
    const parsed = parseUserRateSettings({});
    expect(parsed.walls).toEqual(DEFAULT_RATE_SETTINGS.walls);
    expect(parsed.door_unit_rates).toEqual(DEFAULT_DOOR_UNIT_RATES);
    expect(parsed.window_unit_rates).toEqual(DEFAULT_WINDOW_UNIT_RATES);
  });

  it('falls back to defaults when given invalid JSON', () => {
    const parsed = parseUserRateSettings('not-an-object');
    expect(parsed.walls).toEqual(DEFAULT_RATE_SETTINGS.walls);
  });

  it('persists a customised door rate override', () => {
    const customRates = buildDefaultRateSettings();
    customRates.door_unit_rates.oil_2coat.standard.door_and_frame = 25000;
    const serialised = JSON.parse(JSON.stringify(customRates));
    const parsed = parseUserRateSettings(serialised);
    expect(parsed.door_unit_rates.oil_2coat.standard.door_and_frame).toBe(25000);
    // Other door rates should remain at defaults
    expect(parsed.door_unit_rates.oil_2coat.flush.door_and_frame)
      .toBe(DEFAULT_DOOR_UNIT_RATES.oil_2coat.flush.door_and_frame);
  });

  it('persists a customised window rate override', () => {
    const customRates = buildDefaultRateSettings();
    customRates.window_unit_rates.water_3coat_white_finish.french.window_and_frame = 55000;
    const serialised = JSON.parse(JSON.stringify(customRates));
    const parsed = parseUserRateSettings(serialised);
    expect(parsed.window_unit_rates.water_3coat_white_finish.french.window_and_frame).toBe(55000);
    // Other window rates remain at defaults
    expect(parsed.window_unit_rates.oil_2coat.normal.window_and_frame)
      .toBe(DEFAULT_WINDOW_UNIT_RATES.oil_2coat.normal.window_and_frame);
  });

  it('persists enabled_door_types override', () => {
    const parsed = parseUserRateSettings({
      enabled_door_types: ['standard', 'flush'],
    });
    expect(parsed.enabled_door_types).toEqual(['standard', 'flush']);
  });

  it('persists enabled_surface_types override', () => {
    const parsed = parseUserRateSettings({
      enabled_surface_types: ['walls', 'trim'],
    });
    expect(parsed.enabled_surface_types).toEqual(['walls', 'trim']);
  });

  it('persists enabled_door_scopes override', () => {
    const parsed = parseUserRateSettings({
      enabled_door_scopes: ['door_and_frame'],
    });
    expect(parsed.enabled_door_scopes).toEqual(['door_and_frame']);
  });

  it('persists enabled_window_types override', () => {
    const parsed = parseUserRateSettings({
      enabled_window_types: ['normal', 'awning'],
    });
    expect(parsed.enabled_window_types).toEqual(['normal', 'awning']);
  });

  it('persists enabled_exterior_surfaces override', () => {
    const parsed = parseUserRateSettings({
      enabled_exterior_surfaces: ['ext_walls', 'gutters'],
    });
    expect(parsed.enabled_exterior_surfaces).toEqual(['ext_walls', 'gutters']);
  });

  it('persists custom exterior surface rates', () => {
    const parsed = parseUserRateSettings({
      custom_exterior_surfaces: [
        {
          id: 'rendered-blockwork',
          label: 'Rendered Blockwork',
          unit: '/sqm',
          rates: {
            refresh_1coat: 1900,
            repaint_2coat: 2700,
            full_system: 3900,
          },
        },
      ],
    });

    expect(parsed.custom_exterior_surfaces).toEqual([
      {
        id: 'rendered-blockwork',
        label: 'Rendered Blockwork',
        unit: '/sqm',
        rates: {
          refresh_1coat: 1900,
          repaint_2coat: 2700,
          full_system: 3900,
        },
      },
    ]);
  });

  it('round-trips through JSON serialisation without data loss', () => {
    const original = buildDefaultRateSettings();
    original.door_unit_rates.oil_2coat.bi_fold.frame_only = 9999;
    original.window_unit_rates.water_3coat_white_finish.double_hung.window_only = 33333;
    original.enabled_door_types = ['standard', 'panelled'];
    original.enabled_surface_types = ['walls', 'trim'];
    original.enabled_window_types = ['awning'];
    original.enabled_exterior_surfaces = ['eaves', 'gutters'];
    original.custom_exterior_surfaces = [
      {
        id: 'pergola',
        label: 'Pergola',
        unit: '/lm',
        rates: {
          refresh_1coat: 1200,
          repaint_2coat: 1800,
          full_system: 2400,
        },
      },
    ];

    const roundTripped = parseUserRateSettings(JSON.parse(JSON.stringify(original)));

    expect(roundTripped.door_unit_rates.oil_2coat.bi_fold.frame_only).toBe(9999);
    expect(roundTripped.window_unit_rates.water_3coat_white_finish.double_hung.window_only).toBe(33333);
    expect(roundTripped.enabled_door_types).toEqual(['standard', 'panelled']);
    expect(roundTripped.enabled_surface_types).toEqual(['walls', 'trim']);
    expect(roundTripped.enabled_window_types).toEqual(['awning']);
    expect(roundTripped.enabled_exterior_surfaces).toEqual(['eaves', 'gutters']);
    expect(roundTripped.custom_exterior_surfaces).toEqual(original.custom_exterior_surfaces);
  });
});
