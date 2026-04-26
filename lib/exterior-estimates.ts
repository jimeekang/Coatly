import {
  EXTERIOR_COATING_TYPES,
  EXTERIOR_SURFACE_LABELS,
  EXTERIOR_SURFACES,
  buildDefaultExteriorRates,
  type CustomExteriorSurfaceRate,
  type ExteriorCoatingType,
  type ExteriorRateSettings,
  type ExteriorSurface,
  type UserRateSettings,
} from '@/lib/rate-settings';

export type ExteriorEstimateInput = {
  coating: ExteriorCoatingType;
  surfaces: Partial<Record<ExteriorSurface, number>>;
  custom_surfaces?: Record<string, number>;
  custom_labels?: Partial<Record<ExteriorSurface, string>>;
};

export type ExteriorPricingItem = {
  surface: ExteriorSurface | string;
  label: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  total_cents: number;
};

export type ExteriorPricingSnapshot = {
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  pricing_items: ExteriorPricingItem[];
  snapshot: {
    coating: ExteriorCoatingType;
    rates_used: ExteriorRateSettings;
    custom_rates_used: CustomExteriorSurfaceRate[];
  };
};

export const EXTERIOR_UNIT_LABELS: Record<ExteriorSurface, string> = {
  ext_walls: 'sqm',
  eaves: 'sqm',
  fascia: 'lm',
  gutters: 'lm',
};

function rateUnitToQuantityUnit(unit: string) {
  return unit.replace(/^\//, '');
}

export function isExteriorEstimateInput(value: unknown): value is ExteriorEstimateInput {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (!EXTERIOR_COATING_TYPES.includes(v.coating as ExteriorCoatingType)) return false;
  if (v.surfaces == null || typeof v.surfaces !== 'object' || Array.isArray(v.surfaces)) return false;
  return true;
}

export function calculateExteriorEstimate(
  input: ExteriorEstimateInput,
  userRates?: UserRateSettings | null
): ExteriorPricingSnapshot {
  const rates = userRates?.exterior ?? buildDefaultExteriorRates();
  const customRates = userRates?.custom_exterior_surfaces ?? [];
  const pricing_items: ExteriorPricingItem[] = [];
  let subtotal_cents = 0;

  for (const surface of EXTERIOR_SURFACES) {
    const qty = input.surfaces[surface];
    if (!qty || qty <= 0) continue;
    const unit_price_cents = rates[surface][input.coating];
    const total_cents = Math.round(qty * unit_price_cents);
    subtotal_cents += total_cents;
    const customLabel = input.custom_labels?.[surface]?.trim();
    pricing_items.push({
      surface,
      label: customLabel || EXTERIOR_SURFACE_LABELS[surface],
      quantity: qty,
      unit: EXTERIOR_UNIT_LABELS[surface],
      unit_price_cents,
      total_cents,
    });
  }

  for (const surface of customRates) {
    const qty = input.custom_surfaces?.[surface.id];
    if (!qty || qty <= 0) continue;
    const unit_price_cents = surface.rates[input.coating];
    const total_cents = Math.round(qty * unit_price_cents);
    subtotal_cents += total_cents;
    pricing_items.push({
      surface: surface.id,
      label: surface.label,
      quantity: qty,
      unit: rateUnitToQuantityUnit(surface.unit),
      unit_price_cents,
      total_cents,
    });
  }

  const gst_cents = Math.round(subtotal_cents * 0.1);
  return {
    subtotal_cents,
    gst_cents,
    total_cents: subtotal_cents + gst_cents,
    pricing_items,
    snapshot: { coating: input.coating, rates_used: rates, custom_rates_used: customRates },
  };
}
