import { describe, expect, it } from 'vitest';
import {
  buildInteriorRoomScopeKey,
  buildQuickRoomScopeKey,
  findQuotePricingScopeIssues,
} from '@/modules/quotes/domain/quote-pricing-scopes';

describe('quote pricing scope guard', () => {
  it('blocks a deterministic quick-estimate line item that duplicates an included room surface', () => {
    const issues = findQuotePricingScopeIssues({
      pricing_method: 'detailed_quick',
      pricing_method_inputs: {
        method: 'detailed_quick',
        inputs: {
          global_coating: 'two_coats_repaint',
          global_condition: 'average',
          rooms: [
            {
              room_id: 'bedroom-1',
              label: 'Bedroom 1',
              size: 'medium',
              selected_surfaces: ['walls', 'ceiling'],
              walls_cents: 120000,
              ceiling_cents: 35000,
              trim_cents: 20000,
              coating_multiplier_pct: 100,
              condition_multiplier_pct: 100,
              total_cents: 155000,
            },
          ],
        },
      },
      line_items: [
        {
          name: 'Bedroom 1 walls',
          category: 'service',
          unit: 'item',
          quantity: 1,
          unit_price_cents: 20000,
          is_optional: false,
          is_selected: true,
          pricing_scope_key: buildQuickRoomScopeKey('bedroom-1', 'walls'),
          pricing_role: 'priced_scope',
        },
      ],
    });

    expect(issues.errors).toEqual([
      expect.objectContaining({
        line_item_name: 'Bedroom 1 walls',
        pricing_scope_key: 'quick:bedroom-1:walls',
      }),
    ]);
  });

  it('blocks a deterministic advanced-room line item that duplicates an included room surface', () => {
    const issues = findQuotePricingScopeIssues({
      pricing_method: 'hybrid',
      interior_estimate: {
        property_type: 'apartment',
        estimate_mode: 'specific_areas',
        condition: 'excellent',
        scope: ['walls', 'ceiling', 'trim'],
        wall_paint_system: 'repaint_2coat',
        property_details: {},
        rooms: [
          {
            name: 'Bedroom 1',
            anchor_room_type: 'Bedroom 1',
            room_type: 'interior',
            length_m: null,
            width_m: null,
            height_m: null,
            include_walls: true,
            include_ceiling: false,
            include_trim: false,
            source_rate_item_id: 'advanced-room-bedroom-1',
            source_rate_item_version: 1,
            source_rate_item_label: 'Bedroom 1',
            rate_snapshot_version: 1,
          },
        ],
        opening_items: [],
        trim_items: [],
      },
      line_items: [
        {
          name: 'Bedroom 1 walls',
          category: 'service',
          unit: 'item',
          quantity: 1,
          unit_price_cents: 25000,
          is_optional: false,
          is_selected: true,
          pricing_scope_key: buildInteriorRoomScopeKey(
            'advanced-room-bedroom-1',
            'walls'
          ),
          pricing_role: 'priced_scope',
        },
      ],
    });

    expect(issues.errors).toHaveLength(1);
    expect(issues.errors[0]?.message).toContain('already included');
  });

  it('uses the Room Price Library template key for advanced room priced scopes', () => {
    const issues = findQuotePricingScopeIssues({
      pricing_method: 'hybrid',
      interior_estimate: {
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
            include_ceiling: false,
            include_trim: false,
            source_room_template_id: 'quick-bedroom',
            source_room_template_size: 'medium',
          },
        ],
        opening_items: [],
        trim_items: [],
      },
      line_items: [
        {
          name: 'Bedroom walls',
          category: 'service',
          unit: 'item',
          quantity: 1,
          unit_price_cents: 25000,
          is_optional: false,
          is_selected: true,
          pricing_scope_key: buildQuickRoomScopeKey('quick-bedroom', 'walls'),
          pricing_role: 'priced_scope',
        },
      ],
    });

    expect(issues.errors).toEqual([
      expect.objectContaining({
        pricing_scope_key: 'quick:quick-bedroom:walls',
      }),
    ]);
  });

  it('warns but does not block fuzzy free-text line items that look like an included scope', () => {
    const issues = findQuotePricingScopeIssues({
      pricing_method: 'detailed_quick',
      pricing_method_inputs: {
        method: 'detailed_quick',
        inputs: {
          global_coating: 'two_coats_repaint',
          global_condition: 'average',
          rooms: [
            {
              room_id: 'living-room',
              label: 'Living Room',
              size: 'medium',
              selected_surfaces: ['walls'],
              walls_cents: 140000,
              ceiling_cents: 40000,
              trim_cents: 25000,
              coating_multiplier_pct: 100,
              condition_multiplier_pct: 100,
              total_cents: 140000,
            },
          ],
        },
      },
      line_items: [
        {
          name: 'Living room walls',
          category: 'service',
          unit: 'item',
          quantity: 1,
          unit_price_cents: 22000,
          is_optional: false,
          is_selected: true,
        },
      ],
    });

    expect(issues.errors).toEqual([]);
    expect(issues.warnings).toEqual([
      expect.objectContaining({
        line_item_name: 'Living room walls',
        scope_label: 'Living Room walls',
      }),
    ]);
  });

  it('allows legitimate add-ons that do not carry a duplicate priced scope key', () => {
    const issues = findQuotePricingScopeIssues({
      pricing_method: 'detailed_quick',
      pricing_method_inputs: {
        method: 'detailed_quick',
        inputs: {
          global_coating: 'two_coats_repaint',
          global_condition: 'average',
          rooms: [
            {
              room_id: 'living-room',
              label: 'Living Room',
              size: 'medium',
              selected_surfaces: ['walls'],
              walls_cents: 140000,
              ceiling_cents: 40000,
              trim_cents: 25000,
              coating_multiplier_pct: 100,
              condition_multiplier_pct: 100,
              total_cents: 140000,
            },
          ],
        },
      },
      line_items: [
        {
          name: 'Wallpaper removal',
          category: 'service',
          unit: 'item',
          quantity: 1,
          unit_price_cents: 15000,
          is_optional: false,
          is_selected: true,
        },
        {
          name: 'Patch repair',
          category: 'service',
          unit: 'item',
          quantity: 1,
          unit_price_cents: 12000,
          is_optional: false,
          is_selected: true,
        },
        {
          name: 'Travel fee',
          category: 'service',
          unit: 'item',
          quantity: 1,
          unit_price_cents: 9000,
          is_optional: false,
          is_selected: true,
        },
        {
          name: 'Scaffold hire',
          category: 'service',
          unit: 'item',
          quantity: 1,
          unit_price_cents: 40000,
          is_optional: false,
          is_selected: true,
        },
        {
          name: 'Premium paint upgrade',
          category: 'paint',
          unit: 'item',
          quantity: 1,
          unit_price_cents: 18000,
          is_optional: true,
          is_selected: false,
        },
      ],
    });

    expect(issues).toEqual({ errors: [], warnings: [] });
  });
});
