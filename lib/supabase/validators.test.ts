import { describe, expect, it } from 'vitest';
import {
  interiorEstimateSchema,
  quoteCreateSchema,
  quoteLineItemFormSchema,
} from '@/modules/quotes/domain/quote-schema';
import { quoteLineItemInsertSchema } from '@/modules/quotes/domain/quote-validators';
import { ratePresetSchema } from '@/modules/price-rates/domain/rate-settings';

describe('interiorEstimateSchema', () => {
  it('requires at least one room for specific-area estimates', () => {
    const parsed = interiorEstimateSchema.safeParse({
      property_type: 'apartment',
      estimate_mode: 'specific_areas',
      condition: 'fair',
      scope: ['walls'],
      property_details: {},
      rooms: [],
      opening_items: [],
      trim_items: [],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe('Add at least one room');
  });

  it('requires door-specific fields for door opening items', () => {
    const parsed = interiorEstimateSchema.safeParse({
      property_type: 'apartment',
      estimate_mode: 'specific_areas',
      condition: 'fair',
      scope: ['walls'],
      property_details: {},
      rooms: [
        {
          name: 'Living Room',
          anchor_room_type: 'Living Room',
          room_type: 'interior',
          include_walls: true,
          include_ceiling: false,
          include_trim: false,
        },
      ],
      opening_items: [
        {
          opening_type: 'door',
          paint_system: 'oil_2coat',
          quantity: 1,
        },
      ],
      trim_items: [],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.message)).toEqual([
      'Select the door type',
      'Select the door scope',
    ]);
  });

  it('accepts house specific-area estimates without whole-property details', () => {
    const parsed = interiorEstimateSchema.safeParse({
      property_type: 'house',
      estimate_mode: 'specific_areas',
      condition: 'fair',
      scope: ['walls'],
      property_details: {
        apartment_type: null,
        sqm: null,
        bedrooms: null,
        bathrooms: null,
        storeys: null,
      },
      rooms: [
        {
          name: 'Living Room',
          anchor_room_type: 'Living Room',
          room_type: 'interior',
          include_walls: true,
          include_ceiling: false,
          include_trim: false,
        },
      ],
      opening_items: [],
      trim_items: [],
    });

    expect(parsed.success).toBe(true);
  });

  it('normalizes legacy wall paint system values', () => {
    const parsed = interiorEstimateSchema.safeParse({
      property_type: 'apartment',
      estimate_mode: 'entire_property',
      condition: 'fair',
      scope: ['walls'],
      wall_paint_system: 'touch_up_2coat',
      property_details: {
        apartment_type: 'studio',
      },
      rooms: [],
      opening_items: [],
      trim_items: [],
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.wall_paint_system).toBe('refresh_1coat');
  });

  it('preserves advanced room library source metadata in room snapshots', () => {
    const parsed = interiorEstimateSchema.safeParse({
      property_type: 'apartment',
      estimate_mode: 'specific_areas',
      condition: 'fair',
      scope: ['walls'],
      property_details: {},
      rooms: [
        {
          name: 'Bedroom repaint',
          anchor_room_type: 'Bedroom 1',
          room_type: 'interior',
          length_m: null,
          width_m: null,
          height_m: 2.7,
          include_walls: true,
          include_ceiling: true,
          include_trim: false,
          source_rate_item_id: 'adv-bedroom-repaint',
          source_rate_item_version: 2,
          source_rate_item_label: 'Bedroom repaint',
          rate_snapshot_version: 1,
        },
      ],
      opening_items: [],
      trim_items: [],
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.rooms[0]).toMatchObject({
      source_rate_item_id: 'adv-bedroom-repaint',
      source_rate_item_version: 2,
      source_rate_item_label: 'Bedroom repaint',
      rate_snapshot_version: 1,
    });
  });
});

describe('quoteCreateSchema', () => {
  it('accepts interior estimate quotes without manual rooms', () => {
    const parsed = quoteCreateSchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Apartment repaint',
      status: 'draft',
      valid_until: '2026-04-10',
      tier: 'better',
      labour_margin_percent: 10,
      material_margin_percent: 5,
      notes: '',
      internal_notes: '',
      rooms: [],
      interior_estimate: {
        property_type: 'apartment',
        estimate_mode: 'entire_property',
        condition: 'fair',
        scope: ['walls', 'ceiling', 'trim'],
        property_details: {
          apartment_type: '2_bedroom_standard',
        },
        rooms: [],
        opening_items: [],
        trim_items: [],
      },
    });

    expect(parsed.success).toBe(true);
  });

  it('accepts optional customer-selectable quote line items', () => {
    const parsed = quoteCreateSchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Optional extras quote',
      status: 'draft',
      valid_until: '2026-04-10',
      labour_margin_percent: 0,
      material_margin_percent: 0,
      notes: '',
      internal_notes: '',
      rooms: [
        {
          name: 'Living Room',
          room_type: 'interior',
          length_m: 5,
          width_m: 4,
          height_m: 2.7,
          surfaces: [
            {
              surface_type: 'walls',
              area_m2: 35,
              coating_type: 'repaint_2coat',
              rate_per_m2_cents: 1800,
            },
          ],
        },
      ],
      line_items: [
        {
          material_item_id: null,
          name: 'Feature wall upgrade',
          category: 'service',
          unit: 'job',
          quantity: 1,
          unit_price_cents: 15000,
          is_optional: true,
          is_selected: false,
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it('accepts price-free maintenance scope sections and AI intake snapshots', () => {
    const parsed = quoteCreateSchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      job_type: 'maintenance',
      title: 'Water damage repaint',
      status: 'draft',
      valid_until: '2026-04-10',
      labour_margin_percent: 0,
      material_margin_percent: 0,
      notes: '',
      internal_notes: '',
      rooms: [],
      pricing_method: 'day_rate',
      pricing_method_inputs: {
        method: 'day_rate',
        inputs: {
          days: 1,
          daily_rate_cents: 85000,
          material_method: 'flat',
          material_flat_cents: 12000,
        },
      },
      scope_sections: [
        {
          client_id: 'section-water-damage',
          section_kind: 'maintenance',
          title: 'Water damage repaint',
          description: 'Stain block and repaint affected wall area.',
          area_label: 'Bedroom wall',
          surface_category: 'walls',
          pricing_status: 'to_confirm',
          measurement_status: 'photo_hint',
          source: 'ai',
          maintenance_job_pack: 'water_damage_repaint',
          visible_defects: ['staining', 'flaking_paint'],
          priority: 'soon',
          report_context: true,
          steps: [
            {
              step_type: 'prep',
              label: 'Prepare affected area',
              description: 'Scrape loose paint and sand affected area.',
              requires_confirmation: false,
            },
          ],
        },
      ],
      clause_items: [
        {
          clause_key: 'source_repair_excluded',
          category: 'exclusion',
          title: 'Source repair excluded',
          body: 'This quote excludes plumbing or waterproofing repairs.',
          severity: 'warning',
          applies_to_section_client_id: 'section-water-damage',
          source: 'default_library',
        },
      ],
      ai_intake_snapshot: {
        job_type: 'maintenance',
        maintenance_job_pack: 'water_damage_repaint',
        provider: 'alibaba-qwen',
        model: 'qwen3-vl-flash',
        prompt_version: 'quote-form-v1',
        input_json: {
          site_notes: 'Water staining visible after leak was repaired.',
        },
        output_json: {
          scope_sections: [],
          clauses: [],
          questions_for_user: ['Confirm the leak has been repaired.'],
        },
        photo_refs: [],
        price_rates_snapshot_id: 'rates-2026-05-23',
      },
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.job_type).toBe('maintenance');
    expect(parsed.data?.scope_sections?.[0]).toMatchObject({
      section_kind: 'maintenance',
      maintenance_job_pack: 'water_damage_repaint',
      priority: 'soon',
    });
    expect(parsed.data?.clause_items?.[0]).toMatchObject({
      clause_key: 'source_repair_excluded',
      applies_to_section_client_id: 'section-water-damage',
    });
  });

  it('rejects unsupported maintenance packs and price fields in AI output', () => {
    const parsed = quoteCreateSchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      job_type: 'maintenance',
      title: 'Unsupported maintenance quote',
      status: 'draft',
      valid_until: '2026-04-10',
      labour_margin_percent: 0,
      material_margin_percent: 0,
      notes: '',
      internal_notes: '',
      rooms: [],
      pricing_method: 'manual',
      pricing_method_inputs: {
        method: 'manual',
        inputs: {
          labor_cents: 0,
          material_cents: 0,
        },
      },
      scope_sections: [
        {
          section_kind: 'maintenance',
          title: 'Plumbing repair',
          pricing_status: 'to_confirm',
          measurement_status: 'to_confirm',
          maintenance_job_pack: 'plumbing_repair',
        },
      ],
      ai_intake_snapshot: {
        job_type: 'maintenance',
        maintenance_job_pack: 'plumbing_repair',
        provider: 'alibaba-qwen',
        model: 'qwen3-vl-flash',
        prompt_version: 'quote-form-v1',
        input_json: {},
        output_json: {
          total_cents: 99000,
        },
        photo_refs: [],
      },
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Select a supported painting-adjacent maintenance pack',
        'AI intake output cannot contain price, rate, GST, or total fields',
      ])
    );
  });

  it('rejects decimal quantities for paint line items', () => {
    const parsed = quoteCreateSchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Paint quantity validation',
      status: 'draft',
      valid_until: '2026-04-10',
      labour_margin_percent: 0,
      material_margin_percent: 0,
      notes: '',
      internal_notes: '',
      rooms: [
        {
          name: 'Living Room',
          room_type: 'interior',
          length_m: 5,
          width_m: 4,
          height_m: 2.7,
          surfaces: [
            {
              surface_type: 'walls',
              area_m2: 35,
              coating_type: 'repaint_2coat',
              rate_per_m2_cents: 1800,
            },
          ],
        },
      ],
      line_items: [
        {
          material_item_id: null,
          name: 'Premium wash & wear',
          category: 'paint',
          unit: 'tin',
          quantity: 1.5,
          unit_price_cents: 10000,
          is_optional: false,
          is_selected: true,
        },
      ],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe('Paint quantity must be a whole number');
  });
});

describe('quoteLineItemFormSchema', () => {
  it('rejects decimal quantities for paint items', () => {
    const parsed = quoteLineItemFormSchema.safeParse({
      material_item_id: null,
      name: 'Premium wash & wear',
      category: 'paint',
      unit: 'tin',
      quantity: 1.5,
      unit_price_cents: 10000,
      is_optional: false,
      is_selected: true,
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe('Paint quantity must be a whole number');
  });
});

describe('quoteLineItemInsertSchema', () => {
  it('accepts quote estimate items used as quote line items', () => {
    const parsed = quoteLineItemInsertSchema.safeParse({
      quote_id: '550e8400-e29b-41d4-a716-446655440000',
      category: 'room',
      label: 'Living room walls',
      quantity: 32.5,
      unit: 'm2',
      unit_price_cents: 1800,
      total_cents: 58500,
      metadata: { room_index: 0 },
      sort_order: 0,
    });

    expect(parsed.success).toBe(true);
  });
});

describe('ratePresetSchema', () => {
  it('requires non-negative integer rate values for every configured surface and coating', () => {
    const parsed = ratePresetSchema.safeParse({
      walls: {
        refresh_1coat: 1200,
        repaint_2coat: 1800,
        new_plaster_3coat: 2800,
      },
      ceiling: {
        refresh_1coat: 1400,
        repaint_2coat: 2000,
        new_plaster_3coat: 3000,
      },
      trim: {
        refresh_1coat: 2500,
        repaint_2coat: 3500,
        new_plaster_3coat: 5000,
      },
      doors: {
        refresh_1coat: 3000,
        repaint_2coat: 4500,
        new_plaster_3coat: 6000,
      },
      windows: {
        refresh_1coat: 3500,
        repaint_2coat: 5000,
        new_plaster_3coat: 7000,
      },
    });

    expect(parsed.success).toBe(true);
  });
});
