import { describe, expect, it } from 'vitest';
import { FORBIDDEN_QUOTE_FORM_PRICE_FIELDS } from '@/config/quote-form-taxonomy';
import { validateAIQuoteDraftOutput } from '@/modules/ai/domain/validator';

function collectForbiddenPaths(value: unknown, path: string[] = []): string[] {
  if (!value || typeof value !== 'object') return [];

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectForbiddenPaths(item, [...path, String(index)])
    );
  }

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, nested]) => {
      const nextPath = [...path, key];
      return FORBIDDEN_QUOTE_FORM_PRICE_FIELDS.includes(
        key as (typeof FORBIDDEN_QUOTE_FORM_PRICE_FIELDS)[number]
      )
        ? [nextPath.join('.')]
        : collectForbiddenPaths(nested, nextPath);
    }
  );
}

describe('validateAIQuoteDraftOutput', () => {
  it('strips forbidden price fields recursively and keeps only approved top-level draft keys', () => {
    const result = validateAIQuoteDraftOutput({
      job_type: 'maintenance',
      maintenance_job_pack: 'wall_patch_repaint',
      total_cents: 440000,
      scope_sections: [
        {
          title: 'Patch and repaint marked walls',
          section_kind: 'maintenance',
          price: 1200,
          steps: [
            {
              step_type: 'repair',
              description: 'Patch holes',
              metadata: { rates: { standard: 100 }, gst_cents: 90 },
            },
          ],
        },
      ],
      pricing_candidates: [
        {
          label: 'Wall patch repaint',
          pricing_path: 'manual_service',
          metadata: {
            nested: {
              subtotal: 400,
              unit_price_cents: 200,
            },
          },
        },
      ],
      clauses: [
        {
          clause_key: 'touch_up_colour_match_limit',
          category: 'risk_disclosure',
          title: 'Colour match',
          body: 'Touch-up colour match is best effort.',
          total: 1,
        },
      ],
      assumptions: ['Matching paint is available.'],
      questions_for_user: [],
    });

    expect(Object.keys(result.draft)).toEqual([
      'job_type',
      'maintenance_job_pack',
      'scope_sections',
      'pricing_candidates',
      'clauses',
      'assumptions',
      'questions_for_user',
    ]);
    expect(collectForbiddenPaths(result.draft)).toEqual([]);
  });

  it('limits maintenance job packs to painting-adjacent packs', () => {
    const result = validateAIQuoteDraftOutput({
      job_type: 'maintenance',
      maintenance_job_pack: 'plumbing_repair',
      scope_sections: [
        {
          title: 'Water stain repaint',
          section_kind: 'maintenance',
          maintenance_job_pack: 'water_damage_repaint',
        },
        {
          title: 'Pipe repair',
          section_kind: 'maintenance',
          maintenance_job_pack: 'plumbing_repair',
        },
      ],
    });

    expect(result.draft.job_type).toBe('maintenance');
    expect(result.draft.maintenance_job_pack).toBeNull();
    expect(result.draft.scope_sections[0]?.maintenance_job_pack).toBe(
      'water_damage_repaint'
    );
    expect(result.draft.scope_sections[1]?.maintenance_job_pack).toBeUndefined();
    expect(result.warnings).toContain(
      'Unsupported maintenance job pack was removed: plumbing_repair'
    );
  });

  it('routes unsupported trade scope to questions instead of priced candidates', () => {
    const result = validateAIQuoteDraftOutput({
      job_type: 'maintenance',
      pricing_candidates: [
        {
          label: 'Paint water damaged ceiling',
          description: 'Stain block and repaint ceiling after source is fixed.',
          pricing_path: 'advanced_interior',
        },
        {
          label: 'Electrical fan repair',
          description: 'Repair electrical exhaust fan before repainting.',
          pricing_path: 'manual_service',
        },
      ],
      questions_for_user: [],
    });

    expect(result.draft.pricing_candidates).toHaveLength(1);
    expect(result.draft.pricing_candidates[0]?.label).toBe(
      'Paint water damaged ceiling'
    );
    expect(result.draft.questions_for_user).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: 'refer_to_specialist',
          question: expect.stringContaining('electrical'),
        }),
      ])
    );
  });

  it('downgrades photo-only exact measurements and fixed price claims to confirmation questions', () => {
    const result = validateAIQuoteDraftOutput({
      job_type: 'maintenance',
      scope_sections: [
        {
          title: 'Ceiling repaint from photo',
          description: 'Photo shows exact 12.4 sqm and fixed price is ready.',
          section_kind: 'maintenance',
          measurement_status: 'confirmed',
          source: 'ai',
        },
      ],
      pricing_candidates: [
        {
          label: 'Exact 12.4 sqm ceiling from photo',
          description: 'Fixed price from supplied photo.',
          pricing_path: 'advanced_interior',
          measurement_status: 'confirmed',
        },
      ],
    });

    expect(result.draft.scope_sections[0]?.measurement_status).toBe(
      'to_confirm'
    );
    expect(result.draft.pricing_candidates).toEqual([]);
    expect(result.draft.questions_for_user).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: 'to_confirm',
          question: expect.stringContaining('photo'),
        }),
      ])
    );
  });

  it('normalizes missing arrays, defaults job type conservatively, and caps scope sections', () => {
    const result = validateAIQuoteDraftOutput({
      scope_sections: Array.from({ length: 10 }, (_, index) => ({
        title: `Scope ${index + 1}`,
      })),
      pricing_candidates: 'not an array',
      clauses: null,
      assumptions: undefined,
      questions_for_user: { question: 'invalid' },
    });

    expect(result.draft.job_type).toBe('maintenance');
    expect(result.draft.scope_sections).toHaveLength(8);
    expect(result.draft.pricing_candidates).toEqual([]);
    expect(result.draft.clauses).toEqual([]);
    expect(result.draft.assumptions).toEqual([]);
    expect(result.draft.questions_for_user).toEqual([]);
    expect(result.warnings).toContain('Scope sections were capped at 8.');
  });
});
