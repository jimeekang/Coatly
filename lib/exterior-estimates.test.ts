import { describe, expect, it } from 'vitest';
import { calculateExteriorEstimate } from '@/lib/exterior-estimates';
import { buildDefaultRateSettings } from '@/lib/rate-settings';

describe('calculateExteriorEstimate', () => {
  it('includes custom exterior surfaces from rate settings', () => {
    const settings = buildDefaultRateSettings();
    settings.custom_exterior_surfaces = [
      {
        id: 'pergola',
        label: 'Pergola',
        unit: '/lm',
        rates: {
          refresh_1coat: 1000,
          repaint_2coat: 1500,
          full_system: 2000,
        },
      },
    ];

    const estimate = calculateExteriorEstimate(
      {
        coating: 'repaint_2coat',
        surfaces: {},
        custom_surfaces: { pergola: 12 },
      },
      settings
    );

    expect(estimate.subtotal_cents).toBe(18_000);
    expect(estimate.pricing_items).toEqual([
      expect.objectContaining({
        surface: 'pergola',
        label: 'Pergola',
        quantity: 12,
        unit: 'lm',
        unit_price_cents: 1500,
        total_cents: 18_000,
      }),
    ]);
  });
});
