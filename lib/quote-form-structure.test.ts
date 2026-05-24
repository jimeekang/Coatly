import { describe, expect, it } from 'vitest';
import {
  mapQuoteClauseItems,
  mapQuoteScopeSections,
} from '@/lib/quote-form-structure';

describe('quote form structure mapping', () => {
  it('maps maintenance section metadata and visible steps in display order', () => {
    const sections = mapQuoteScopeSections(
      [
        {
          id: 'section-2',
          quote_id: 'quote-1',
          section_kind: 'maintenance',
          title: 'Second section',
          description: null,
          area_label: 'Hallway',
          surface_category: 'walls',
          is_optional: false,
          is_selected: true,
          pricing_status: 'included',
          measurement_status: 'rough',
          source: 'manual',
          metadata: {
            maintenance_job_pack: 'end_of_lease_touch_up',
            visible_defects: ['scuffs'],
            priority: 'cosmetic',
            report_context: false,
          },
          sort_order: 2,
          created_at: '2026-05-24T00:00:00.000Z',
          updated_at: '2026-05-24T00:00:00.000Z',
        },
        {
          id: 'section-1',
          quote_id: 'quote-1',
          section_kind: 'maintenance',
          title: 'Water damage repaint',
          description: 'Stain block and repaint affected ceiling.',
          area_label: 'Bedroom ceiling',
          surface_category: 'ceiling',
          is_optional: false,
          is_selected: true,
          pricing_status: 'to_confirm',
          measurement_status: 'photo_hint',
          source: 'ai',
          metadata: {
            maintenance_job_pack: 'water_damage_repaint',
            visible_defects: ['water_stain', 'blistering'],
            priority: 'soon',
            report_context: true,
          },
          sort_order: 1,
          created_at: '2026-05-24T00:00:00.000Z',
          updated_at: '2026-05-24T00:00:00.000Z',
        },
      ],
      [
        {
          id: 'step-hidden',
          section_id: 'section-1',
          step_type: 'special_note',
          label: null,
          description: 'Internal-only note',
          prep_type: null,
          paint_system: null,
          coats_min: null,
          coats_max: null,
          product_name: null,
          colour_status: null,
          colour: null,
          sheen: null,
          requires_confirmation: false,
          is_customer_visible: false,
          metadata: {},
          sort_order: 1,
          created_at: '2026-05-24T00:00:00.000Z',
          updated_at: '2026-05-24T00:00:00.000Z',
        },
        {
          id: 'step-visible',
          section_id: 'section-1',
          step_type: 'prep',
          label: 'Prepare stain',
          description: 'Apply stain blocker before repainting.',
          prep_type: 'stain_blocking',
          paint_system: null,
          coats_min: 1,
          coats_max: 1,
          product_name: null,
          colour_status: 'to_confirm',
          colour: null,
          sheen: null,
          requires_confirmation: true,
          is_customer_visible: true,
          metadata: {},
          sort_order: 0,
          created_at: '2026-05-24T00:00:00.000Z',
          updated_at: '2026-05-24T00:00:00.000Z',
        },
      ]
    );

    expect(sections.map((section) => section.id)).toEqual([
      'section-1',
      'section-2',
    ]);
    expect(sections[0]).toMatchObject({
      maintenance_job_pack: 'water_damage_repaint',
      visible_defects: ['water_stain', 'blistering'],
      priority: 'soon',
      report_context: true,
    });
    expect(sections[0].steps).toEqual([
      expect.objectContaining({
        id: 'step-visible',
        description: 'Apply stain blocker before repainting.',
      }),
    ]);
  });

  it('maps customer-visible clauses in display order', () => {
    const clauses = mapQuoteClauseItems([
      {
        id: 'clause-2',
        quote_id: 'quote-1',
        section_id: null,
        clause_key: 'touch_up_colour_match_limit',
        category: 'risk_disclosure',
        title: 'Touch-up colour match limitation',
        body: 'Touch-ups may remain visible in some lighting.',
        severity: 'info',
        source: 'default_library',
        is_customer_visible: true,
        metadata: {},
        sort_order: 2,
        created_at: '2026-05-24T00:00:00.000Z',
        updated_at: '2026-05-24T00:00:00.000Z',
      },
      {
        id: 'clause-1',
        quote_id: 'quote-1',
        section_id: 'section-1',
        clause_key: 'source_repair_excluded',
        category: 'exclusion',
        title: 'Source repair excluded',
        body: 'Leak repair is excluded from this painting quote.',
        severity: 'warning',
        source: 'default_library',
        is_customer_visible: true,
        metadata: {},
        sort_order: 1,
        created_at: '2026-05-24T00:00:00.000Z',
        updated_at: '2026-05-24T00:00:00.000Z',
      },
      {
        id: 'clause-hidden',
        quote_id: 'quote-1',
        section_id: null,
        clause_key: 'internal_note',
        category: 'exclusion',
        title: 'Internal',
        body: 'Hidden from customer.',
        severity: 'info',
        source: 'manual',
        is_customer_visible: false,
        metadata: {},
        sort_order: 0,
        created_at: '2026-05-24T00:00:00.000Z',
        updated_at: '2026-05-24T00:00:00.000Z',
      },
    ]);

    expect(clauses.map((clause) => clause.clause_key)).toEqual([
      'source_repair_excluded',
      'touch_up_colour_match_limit',
    ]);
  });
});
