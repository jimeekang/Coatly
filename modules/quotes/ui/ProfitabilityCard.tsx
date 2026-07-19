'use client';

import { AlertCircle, AlertTriangle } from 'lucide-react';
import { formatAUD } from '@/utils/format';
import type { QuoteDetail } from '@/modules/quotes/domain/quotes';
import { PRICING_METHOD_LABELS } from '@/modules/price-rates/domain/rate-settings';

/** Derive labour/material split from pricing_method_inputs or fallback to room surfaces */
function resolveCostSplit(quote: QuoteDetail): {
  labor_cents: number;
  material_cents: number;
} | null {
  const inputs = quote.pricing_method_inputs;

  if (inputs?.method === 'day_rate' && inputs.inputs) {
    const { days, daily_rate_cents, material_method, material_percent, material_flat_cents } = inputs.inputs;
    const labor_cents = Math.round(days * daily_rate_cents);
    const material_cents =
      material_method === 'percentage'
        ? Math.round(labor_cents * ((material_percent ?? 30) / 100))
        : (material_flat_cents ?? 0);
    return { labor_cents, material_cents };
  }

  // room_rate: the flat rate already includes margin — cost split cannot be derived
  if (inputs?.method === 'room_rate') {
    return null;
  }

  if (inputs?.method === 'manual' && inputs.inputs) {
    return {
      labor_cents: inputs.inputs.labor_cents,
      material_cents: inputs.inputs.material_cents,
    };
  }

  // hybrid / sqm_rate: derive from room surfaces if available
  if (quote.rooms.length > 0) {
    const labor_cents = quote.rooms.reduce(
      (sum, room) => sum + room.surfaces.reduce((s, surf) => s + surf.labour_cost_cents, 0),
      0
    );
    const material_cents = quote.rooms.reduce(
      (sum, room) => sum + room.surfaces.reduce((s, surf) => s + surf.material_cost_cents, 0),
      0
    );
    return { labor_cents, material_cents };
  }

  return null;
}

function MarginBadge({ percent }: { percent: number }) {
  const color =
    percent >= 30
      ? 'bg-success-container text-success border-success/25'
      : percent >= 20
      ? 'bg-warning-container text-warning border-warning/25'
      : 'bg-error-container text-error border-error/25';

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${color}`}>
      {percent.toFixed(1)}%
    </span>
  );
}

export function ProfitabilityCard({
  quote,
  targetDailyEarningsCents,
}: {
  quote: QuoteDetail;
  targetDailyEarningsCents?: number | null;
}) {
  const split = resolveCostSplit(quote);
  const isRoomRate = quote.pricing_method_inputs?.method === 'room_rate';
  const methodLabel = PRICING_METHOD_LABELS[quote.pricing_method] ?? quote.pricing_method;

  // Header shared between both render paths
  const header = (
    <div className="bg-tertiary/10 flex items-center justify-between gap-2 rounded-t-xl px-5 py-3">
      <div className="flex items-center gap-2">
        <h2 className="text-tertiary text-xs font-semibold tracking-wide uppercase">
          Profitability
        </h2>
        <span className="bg-tertiary/10 text-tertiary rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase">
          Internal
        </span>
      </div>
      <span className="bg-tertiary/10 text-tertiary rounded-lg px-2 py-0.5 text-[10px]">
        {methodLabel}
      </span>
    </div>
  );

  // room_rate: flat rates include margin — cost breakdown unavailable
  if (isRoomRate || !split) {
    if (!isRoomRate) return null;
    return (
      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest">
        {header}
        <div className="px-5 py-4">
          <p className="text-sm text-on-surface-variant">
            Room rate pricing — cost breakdown not available.
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Room flat rates include your margin. To see a profit split, switch to Day Rate or Manual pricing.
          </p>
          <div className="mt-3 flex justify-between border-t border-outline-variant pt-3 text-sm">
            <span className="text-on-surface-variant">Quote value (ex-GST)</span>
            <span className="font-medium text-on-surface">{formatAUD(quote.subtotal_cents)}</span>
          </div>
        </div>
      </section>
    );
  }

  const { labor_cents, material_cents } = split;
  const total_cost_cents = labor_cents + material_cents;
  const profit_cents = quote.subtotal_cents - total_cost_cents;
  const margin_percent =
    quote.subtotal_cents > 0 ? (profit_cents / quote.subtotal_cents) * 100 : 0;

  // Estimate days from day_rate inputs if available
  const estimatedDays =
    quote.pricing_method_inputs?.method === 'day_rate' && quote.pricing_method_inputs.inputs
      ? quote.pricing_method_inputs.inputs.days
      : null;

  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest">
      {/* Header */}
      {header}

      {/* Cost breakdown */}
      <div className="space-y-2 px-5 py-4 text-sm">
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Labour cost</span>
          <span className="text-on-surface">{formatAUD(labor_cents)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Material cost</span>
          <span className="text-on-surface">{formatAUD(material_cents)}</span>
        </div>
        <div className="flex justify-between border-t border-outline-variant pt-2">
          <span className="font-medium text-on-surface">Total cost</span>
          <span className="font-medium text-on-surface">{formatAUD(total_cost_cents)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Quote value (ex-GST)</span>
          <span className="text-on-surface">{formatAUD(quote.subtotal_cents)}</span>
        </div>

        {/* Profit line */}
        <div className="flex items-center justify-between rounded-lg bg-surface-container px-3 py-2.5">
          <span className="font-semibold text-on-surface">Estimated profit</span>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${profit_cents >= 0 ? 'text-success' : 'text-error'}`}>
              {profit_cents >= 0 ? '+' : ''}{formatAUD(profit_cents)}
            </span>
            <MarginBadge percent={margin_percent} />
          </div>
        </div>

        {/* Days estimate */}
        {estimatedDays && (
          <div className="flex justify-between text-xs text-on-surface-variant">
            <span>Estimated duration</span>
            <span>{estimatedDays} day{estimatedDays !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Target earnings warning */}
        {targetDailyEarningsCents && estimatedDays && (
          (() => {
            const targetTotal = targetDailyEarningsCents * estimatedDays;
            const shortfall = targetTotal - profit_cents;
            if (shortfall <= 0) return null;
            return (
              <div className="border-warning/25 bg-warning-container text-warning flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {formatAUD(shortfall)} below your target of {formatAUD(targetTotal)} for {estimatedDays} day{estimatedDays !== 1 ? 's' : ''}.
                </span>
              </div>
            );
          })()
        )}

        {/* Margin warning — shown regardless of method */}
        {margin_percent < 20 && profit_cents >= 0 && (
          <div className="border-warning/25 bg-warning-container text-warning flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Margin below 20% — consider adjusting your price.</span>
          </div>
        )}

        {profit_cents < 0 && (
          <div className="border-error/25 bg-error-container text-error flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>This quote is priced below cost — you would lose money on this job.</span>
          </div>
        )}
      </div>
    </section>
  );
}
