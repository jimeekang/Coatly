import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { saveQuotePricingRelations } from '@/modules/quotes/application/quote-pricing-save-service';

// Regression: ISSUE-006 - clearing all quote structure left old rows persisted
// Found by /qa on 2026-07-12
// Report: .gstack/qa-reports/qa-report-localhost-3000-2026-07-12.md
describe('saveQuotePricingRelations structure replacement', () => {
  it('deletes existing structure rows when an update submits empty arrays', async () => {
    const deletedTables: string[] = [];
    const supabase = {
      from: vi.fn((table: string) => ({
        delete: vi.fn(() => ({
          eq: vi.fn(async () => {
            deletedTables.push(table);
            return { error: null };
          }),
        })),
      })),
    };

    const result = await saveQuotePricingRelations({
      supabase: supabase as never,
      quoteId: '550e8400-e29b-41d4-a716-446655440010',
      userId: '550e8400-e29b-41d4-a716-446655440011',
      mode: 'update',
      data: {
        job_type: 'interior',
        scope_sections: [],
        clause_items: [],
        replace_quote_structure: true,
        ai_intake_snapshot: null,
      } as never,
      pricing: {
        interiorEstimate: null,
        lineItems: [],
        preview: { rooms: [] },
        pricingMethod: 'manual',
        resolvedPricingInputs: {
          method: 'manual',
          inputs: { labor_cents: 50_000, material_cents: 10_000 },
        },
      } as never,
    });

    expect(result).toEqual({ error: null });
    expect(deletedTables).toEqual([
      'quote_clause_items',
      'quote_ai_intake_snapshots',
      'quote_scope_sections',
    ]);
  });
});
