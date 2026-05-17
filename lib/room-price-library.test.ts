import { describe, expect, it } from 'vitest';
import {
  deriveAnchorRangeFromRoomTemplate,
  getRoomTemplateSurfaceTotalCents,
  resolveAdvancedRoomPriceSource,
} from '@/lib/room-price-library';
import { buildDefaultRateSettings } from '@/lib/rate-settings';

describe('Room Price Library helpers', () => {
  it('totals selected template surfaces for a size', () => {
    const settings = buildDefaultRateSettings();
    const room = {
      ...settings.quick_estimate.rooms[0],
      sizes: {
        small: { walls_cents: 90000, ceiling_cents: 30000, trim_cents: 10000 },
        medium: { walls_cents: 120000, ceiling_cents: 45000, trim_cents: 15000 },
        large: { walls_cents: 150000, ceiling_cents: 60000, trim_cents: 20000 },
      },
    };

    expect(
      getRoomTemplateSurfaceTotalCents(room, 'medium', ['walls', 'ceiling'])
    ).toBe(165000);
    expect(deriveAnchorRangeFromRoomTemplate(room, ['walls', 'ceiling'])).toEqual({
      min: 120000,
      median: 165000,
      max: 210000,
    });
  });

  it('returns a typed issue instead of zero when a referenced template is missing', () => {
    const settings = buildDefaultRateSettings();
    settings.quick_estimate.rooms = [];

    const resolved = resolveAdvancedRoomPriceSource(settings, {
      id: 'adv-bedroom',
      label: 'Bedroom repaint',
      anchor_room_type: 'Bedroom',
      source_room_template_id: 'missing-template',
      default_size: 'medium',
      include_walls: true,
      include_ceiling: true,
      include_trim: false,
      default_height_m: 2.7,
      sort_order: 0,
    });

    expect(resolved.ok).toBe(false);
    expect(resolved.issue.code).toBe('missing_room_template');
  });
});
