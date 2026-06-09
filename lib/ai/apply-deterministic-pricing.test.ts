import { describe, expect, it } from 'vitest';
import {
  applyDeterministicPricing,
  type AIQuotePricingCandidate,
} from '@/lib/ai/apply-deterministic-pricing';
import { buildDefaultRateSettings } from '@/modules/price-rates/domain/rate-settings';
import type { UserRateSettings } from '@/modules/price-rates/domain/rate-settings';

function buildRatesWithQuickBedroom(): UserRateSettings {
  const settings = buildDefaultRateSettings();
  settings.quick_estimate.coating_multipliers = {
    one_coat_refresh_pct: 70,
    two_coats_repaint_pct: 100,
    three_coats_new_plaster_pct: 140,
  };
  settings.quick_estimate.condition_multipliers = {
    good_pct: 90,
    average_pct: 100,
    poor_pct: 130,
  };
  settings.quick_estimate.rooms = [
    {
      id: 'quick-bedroom',
      version: 3,
      label: 'Bedroom',
      enabled_surfaces: ['walls', 'ceiling', 'trim'],
      sizes: {
        small: {
          walls_cents: 80000,
          ceiling_cents: 25000,
          trim_cents: 12000,
          trim_oil_cents: 12000,
          trim_water_cents: 16000,
        },
        medium: {
          walls_cents: 120000,
          ceiling_cents: 30000,
          trim_cents: 20000,
          trim_oil_cents: 20000,
          trim_water_cents: 42000,
        },
        large: {
          walls_cents: 160000,
          ceiling_cents: 40000,
          trim_cents: 28000,
          trim_oil_cents: 28000,
          trim_water_cents: 54000,
        },
      },
      sort_order: 0,
    },
  ];
  return settings;
}

describe('applyDeterministicPricing', () => {
  it('maps a reviewable quick room candidate to an existing room template snapshot', () => {
    const settings = buildRatesWithQuickBedroom();
    const candidates: AIQuotePricingCandidate[] = [
      {
        id: 'candidate-bedroom',
        type: 'quick_room',
        status: 'reviewable',
        room_template_id: 'quick-bedroom',
        room_template_label: 'Bedroom',
        suggested_size: 'medium',
        selected_surfaces: ['walls', 'ceiling'],
        global_coating: 'two_coats_repaint',
        global_condition: 'average',
        trim_paint_system: 'oil_2coat',
      },
    ];

    const result = applyDeterministicPricing(candidates, settings);

    expect(result.priced_payloads).toHaveLength(1);
    expect(result.candidates[0]).toEqual(
      expect.objectContaining({
        candidate_id: 'candidate-bedroom',
        status: 'priced',
        pricing_path: 'quick_estimate_room',
      })
    );
    expect(result.priced_payloads[0]).toEqual({
      pricing_path: 'quick_estimate_room',
      pricing_method: 'detailed_quick',
      source_candidate_id: 'candidate-bedroom',
      room: {
        room_id: 'quick-bedroom',
        source_rate_item_id: 'quick-bedroom',
        source_rate_item_version: 3,
        source_rate_item_label: 'Bedroom',
        rate_snapshot_version: 1,
        label: 'Bedroom',
        size: 'medium',
        selected_surfaces: ['walls', 'ceiling'],
        trim_paint_system: 'oil_2coat',
        walls_cents: 120000,
        ceiling_cents: 30000,
        trim_cents: 20000,
        coating_multiplier_pct: 100,
        condition_multiplier_pct: 100,
        total_cents: 150000,
      },
    });
  });

  it('leaves missing quick templates and selected zero-rate surfaces to confirm', () => {
    const settings = buildRatesWithQuickBedroom();
    const candidates: AIQuotePricingCandidate[] = [
      {
        id: 'missing-template',
        type: 'quick_room',
        status: 'accepted',
        room_template_id: 'quick-kitchen',
        room_template_label: 'Kitchen',
        suggested_size: 'medium',
        selected_surfaces: ['walls'],
      },
      {
        id: 'missing-rate',
        type: 'quick_room',
        status: 'accepted',
        room_template_id: 'quick-bedroom',
        suggested_size: 'medium',
        selected_surfaces: ['windows'],
      },
    ];

    const result = applyDeterministicPricing(candidates, settings);

    expect(result.priced_payloads).toEqual([]);
    expect(result.candidates).toEqual([
      expect.objectContaining({
        candidate_id: 'missing-template',
        status: 'to_confirm',
        reason: 'missing_quick_room_template',
        priced_payload: null,
      }),
      expect.objectContaining({
        candidate_id: 'missing-rate',
        status: 'to_confirm',
        reason: 'missing_quick_room_rate',
        priced_payload: null,
      }),
    ]);
  });

  it('does not create a generic maintenance price', () => {
    const settings = buildRatesWithQuickBedroom();
    const candidates: AIQuotePricingCandidate[] = [
      {
        id: 'maintenance-patch',
        type: 'maintenance',
        status: 'accepted',
        maintenance_job_pack: 'wall_patch_repaint',
        suggested_pricing_method: 'maintenance',
        title: 'Patch and repaint damaged wall',
      },
    ];

    const result = applyDeterministicPricing(candidates, settings);

    expect(result.priced_payloads).toEqual([]);
    expect(result.candidates[0]).toEqual(
      expect.objectContaining({
        candidate_id: 'maintenance-patch',
        status: 'to_confirm',
        reason: 'unsupported_maintenance_pricing_path',
        priced_payload: null,
      })
    );
  });

  it('ignores AI-provided price-like fields and uses deterministic app cents', () => {
    const settings = buildRatesWithQuickBedroom();
    const candidates: AIQuotePricingCandidate[] = [
      {
        id: 'candidate-trim',
        type: 'quick_room',
        status: 'accepted',
        room_template_label: 'Bedroom',
        suggested_size: 'medium',
        selected_surfaces: ['trim'],
        global_coating: 'two_coats_repaint',
        global_condition: 'average',
        trim_paint_system: 'water_3coat_white_finish',
        rate_cents: 999999,
        unit_price_cents: 999999,
        price_cents: 999999,
        subtotal_cents: 999999,
        gst_cents: 999999,
        total_cents: 999999,
        daily_rate_cents: 999999,
      },
    ];

    const result = applyDeterministicPricing(candidates, settings);

    expect(result.priced_payloads[0]?.room.trim_cents).toBe(42000);
    expect(result.priced_payloads[0]?.room.total_cents).toBe(42000);
    expect(result.candidates[0]?.candidate).not.toHaveProperty('price_cents');
    expect(result.candidates[0]?.candidate).not.toHaveProperty('rate_cents');
    expect(JSON.stringify(result)).not.toContain('999999');
  });
});
