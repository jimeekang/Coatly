import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_QUOTE_FORM_PRICE_FIELDS,
  QUOTE_FORM_CLAUSE_LIBRARY,
} from '@/config/quote-form-taxonomy';
import {
  MAINTENANCE_JOB_PACKS,
  PAINTING_ADJACENT_MAINTENANCE_PACK_IDS,
  UNSUPPORTED_MAINTENANCE_SCOPE_KEYWORDS,
} from '@/config/maintenance-job-packs';

function collectForbiddenFieldPaths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return [];

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectForbiddenFieldPaths(item, `${prefix}[${index}]`)
    );
  }

  return Object.entries(value).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const current = FORBIDDEN_QUOTE_FORM_PRICE_FIELDS.includes(
      key as (typeof FORBIDDEN_QUOTE_FORM_PRICE_FIELDS)[number]
    )
      ? [path]
      : [];

    return [...current, ...collectForbiddenFieldPaths(nested, path)];
  });
}

describe('maintenance job packs', () => {
  it('keeps v1 maintenance limited to painting-adjacent job packs', () => {
    expect(PAINTING_ADJACENT_MAINTENANCE_PACK_IDS).toEqual([
      'wall_patch_repaint',
      'water_damage_repaint',
      'end_of_lease_touch_up',
      'pre_sale_refresh',
      'exterior_maintenance_repaint',
      'deck_stain_maintenance',
      'mould_treatment_repaint',
      'strata_common_area_touch_up',
    ]);

    expect(MAINTENANCE_JOB_PACKS.map((pack) => pack.id)).toEqual(
      PAINTING_ADJACENT_MAINTENANCE_PACK_IDS
    );
  });

  it('does not hide rates, prices, GST, or totals in taxonomy data', () => {
    expect(collectForbiddenFieldPaths(MAINTENANCE_JOB_PACKS)).toEqual([]);
    expect(collectForbiddenFieldPaths(QUOTE_FORM_CLAUSE_LIBRARY)).toEqual([]);
  });

  it('records unsupported trade keywords instead of adding generic trade packs', () => {
    expect(UNSUPPORTED_MAINTENANCE_SCOPE_KEYWORDS).toEqual(
      expect.arrayContaining([
        'plumbing',
        'electrical',
        'structural',
        'roofing',
        'asbestos',
        'waterproofing',
      ])
    );
    expect(MAINTENANCE_JOB_PACKS.some((pack) => pack.id.includes('plumb'))).toBe(
      false
    );
  });
});
