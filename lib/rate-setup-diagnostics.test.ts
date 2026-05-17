import { describe, expect, it } from 'vitest';
import {
  getAdvancedEstimateSetupIssues,
  getQuickEstimateSetupIssues,
  getSelectedAdvancedEstimateIssues,
  getSelectedQuickEstimateIssues,
} from '@/lib/rate-setup-diagnostics';
import { buildDefaultRateSettings } from '@/lib/rate-settings';

describe('rate setup diagnostics', () => {
  it('reports missing quick rooms and zero enabled quick surface prices', () => {
    const settings = buildDefaultRateSettings();
    settings.quick_estimate.rooms = [
      {
        id: 'quick-bedroom',
        version: 1,
        label: 'Bedroom',
        enabled_surfaces: ['walls', 'ceiling'],
        sizes: {
          small: {
            walls_cents: 120000,
            ceiling_cents: 0,
            trim_cents: 0,
          },
          medium: {
            walls_cents: 140000,
            ceiling_cents: 0,
            trim_cents: 0,
          },
          large: {
            walls_cents: 160000,
            ceiling_cents: 50000,
            trim_cents: 0,
          },
        },
        sort_order: 0,
      },
    ];

    const issues = getQuickEstimateSetupIssues(settings);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          area: 'quick',
          code: 'zero_quick_surface_price',
          source_id: 'quick-bedroom:small:ceiling',
          source_label: 'Bedroom',
        }),
      ])
    );
    expect(
      getQuickEstimateSetupIssues({
        ...settings,
        quick_estimate: { ...settings.quick_estimate, rooms: [] },
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          area: 'quick',
          severity: 'blocking',
          code: 'missing_quick_rooms',
        }),
      ])
    );
  });

  it('keeps quick setup zero-price issue identifiers unique per size and surface', () => {
    const settings = buildDefaultRateSettings();
    settings.quick_estimate.rooms = [
      {
        id: 'default-0',
        version: 1,
        label: 'Bedroom',
        enabled_surfaces: ['walls', 'ceiling', 'trim'],
        sizes: {
          small: {
            walls_cents: 0,
            ceiling_cents: 0,
            trim_cents: 0,
          },
          medium: {
            walls_cents: 0,
            ceiling_cents: 0,
            trim_cents: 0,
          },
          large: {
            walls_cents: 0,
            ceiling_cents: 0,
            trim_cents: 0,
          },
        },
        sort_order: 0,
      },
    ];

    const issueIds = getQuickEstimateSetupIssues(settings)
      .filter((issue) => issue.code === 'zero_quick_surface_price')
      .map((issue) => issue.source_id);

    expect(new Set(issueIds).size).toBe(issueIds.length);
    expect(issueIds).toEqual(
      expect.arrayContaining([
        'default-0:small:walls',
        'default-0:small:ceiling',
        'default-0:small:trim',
      ])
    );
  });

  it('blocks a selected quick room when an included surface price is zero', () => {
    const settings = buildDefaultRateSettings();

    const issues = getSelectedQuickEstimateIssues(
      {
        global_coating: 'two_coats_repaint',
        global_condition: 'average',
        rooms: [
          {
            room_id: 'quick-bedroom',
            source_rate_item_id: 'quick-bedroom',
            source_rate_item_version: 1,
            source_rate_item_label: 'Bedroom',
            rate_snapshot_version: 1,
            label: 'Bedroom',
            size: 'medium',
            selected_surfaces: ['walls', 'ceiling'],
            walls_cents: 120000,
            ceiling_cents: 0,
            trim_cents: 25000,
            coating_multiplier_pct: 100,
            condition_multiplier_pct: 100,
            total_cents: 120000,
          },
        ],
      },
      settings
    );

    expect(issues).toEqual([
      expect.objectContaining({
        area: 'quick',
        severity: 'blocking',
        code: 'zero_quick_surface_price',
        message: expect.stringContaining('Bedroom ceiling'),
      }),
    ]);
  });

  it('keeps selected quick zero-price issue identifiers unique per surface', () => {
    const settings = buildDefaultRateSettings();

    const issues = getSelectedQuickEstimateIssues(
      {
        global_coating: 'two_coats_repaint',
        global_condition: 'average',
        rooms: [
          {
            room_id: 'quick-bedroom',
            source_rate_item_id: 'quick-bedroom',
            source_rate_item_version: 1,
            source_rate_item_label: 'Bedroom',
            rate_snapshot_version: 1,
            label: 'Bedroom',
            size: 'medium',
            selected_surfaces: ['walls', 'ceiling'],
            walls_cents: 0,
            ceiling_cents: 0,
            trim_cents: 25000,
            coating_multiplier_pct: 100,
            condition_multiplier_pct: 100,
            total_cents: 0,
          },
        ],
      },
      settings
    );

    expect(issues.map((issue) => issue.source_id)).toEqual([
      'quick-bedroom:walls',
      'quick-bedroom:ceiling',
    ]);
  });

  it('reports advanced library items with missing or zero room anchors', () => {
    const settings = buildDefaultRateSettings();
    settings.detailed_estimate_anchors.interior_rooms['Bedroom 1'] = {
      min: 0,
      median: 0,
      max: 0,
    };
    settings.detailed_estimate_items.advanced_rooms = [
      {
        id: 'adv-bedroom',
        version: 1,
        label: 'Bedroom repaint',
        anchor_room_type: 'Bedroom 1',
        include_walls: true,
        include_ceiling: true,
        include_trim: false,
        default_height_m: 2.7,
        sort_order: 0,
      },
      {
        id: 'adv-missing',
        version: 1,
        label: 'Custom room',
        anchor_room_type: 'Not configured',
        include_walls: true,
        include_ceiling: false,
        include_trim: false,
        default_height_m: 2.7,
        sort_order: 1,
      },
    ];

    expect(getAdvancedEstimateSetupIssues(settings)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          area: 'advanced',
          code: 'zero_advanced_anchor',
          source_id: 'Bedroom 1',
        }),
        expect.objectContaining({
          area: 'advanced',
          code: 'missing_advanced_anchor',
          source_id: 'adv-missing',
        }),
      ])
    );
  });

  it('blocks selected advanced rooms and openings that resolve to zero priced sources', () => {
    const settings = buildDefaultRateSettings();
    settings.detailed_estimate_anchors.interior_rooms['Bedroom 1'] = {
      min: 0,
      median: 0,
      max: 0,
    };
    settings.door_unit_rates.oil_2coat.standard.door_and_frame = 0;

    const issues = getSelectedAdvancedEstimateIssues(
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
            anchor_room_type: 'Bedroom 1',
            room_type: 'interior',
            length_m: null,
            width_m: null,
            height_m: null,
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
            room_index: 0,
            door_type: 'standard',
            door_scope: 'door_and_frame',
          },
        ],
        trim_items: [],
      },
      settings
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'blocking',
          code: 'zero_advanced_anchor',
          message: expect.stringContaining('Bedroom repaint'),
        }),
        expect.objectContaining({
          severity: 'blocking',
          code: 'zero_door_unit_rate',
        }),
      ])
    );
  });
});
