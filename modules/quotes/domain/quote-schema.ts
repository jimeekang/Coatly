import { z } from 'zod';
import {
  FORBIDDEN_QUOTE_FORM_PRICE_FIELDS,
  QUOTE_CLAUSE_CATEGORIES,
  QUOTE_CLAUSE_SEVERITIES,
  QUOTE_JOB_TYPES,
  QUOTE_SCOPE_MEASUREMENT_STATUSES,
  QUOTE_SCOPE_PRICING_STATUSES,
  QUOTE_SCOPE_PRIORITIES,
  QUOTE_SCOPE_SECTION_KINDS,
  QUOTE_SCOPE_SOURCES,
  QUOTE_SCOPE_STEP_TYPES,
} from '@/config/quote-form-taxonomy';
import { PAINTING_ADJACENT_MAINTENANCE_PACK_IDS } from '@/config/maintenance-job-packs';
import { EXTERIOR_COATING_TYPES } from '@/modules/price-rates/domain/rate-settings';
import {
  MATERIAL_ITEM_CATEGORIES,
  type MaterialItemCategory,
} from '@/modules/materials/domain/types';
import {
  INTERIOR_APARTMENT_TYPES,
  INTERIOR_CONDITIONS,
  INTERIOR_DOOR_SCOPES,
  INTERIOR_DOOR_TYPES,
  INTERIOR_PAINT_SYSTEMS,
  INTERIOR_SCOPE_OPTIONS,
  INTERIOR_STOREYS,
  INTERIOR_WALL_PAINT_SYSTEMS,
  INTERIOR_WINDOW_SCOPES,
  INTERIOR_WINDOW_TYPES,
  normalizeInteriorWallPaintSystem,
} from '@/modules/quotes/domain/interior-estimates';

const optionalIsoDateString = z
  .string()
  .trim()
  .min(1, 'Date is required')
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Date must be a valid date',
  });

function containsForbiddenQuoteFormPriceField(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;

  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenQuoteFormPriceField(item));
  }

  return Object.entries(value).some(
    ([key, nested]) =>
      FORBIDDEN_QUOTE_FORM_PRICE_FIELDS.includes(
        key as (typeof FORBIDDEN_QUOTE_FORM_PRICE_FIELDS)[number]
      ) || containsForbiddenQuoteFormPriceField(nested)
  );
}

const jsonRecordSchema = z.record(z.string(), z.unknown());

export const quoteJobTypeSchema = z.enum(QUOTE_JOB_TYPES);
const maintenanceJobPackSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      PAINTING_ADJACENT_MAINTENANCE_PACK_IDS.includes(
        value as (typeof PAINTING_ADJACENT_MAINTENANCE_PACK_IDS)[number]
      ),
    {
      message: 'Select a supported painting-adjacent maintenance pack',
    }
  );

const quoteFormMetadataSchema = jsonRecordSchema
  .default({})
  .superRefine((value, ctx) => {
    if (containsForbiddenQuoteFormPriceField(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Quote form metadata cannot contain price, rate, GST, or total fields',
      });
    }
  });

export const quoteScopeStepSchema = z
  .object({
    client_id: z.string().trim().min(1).max(120).optional(),
    step_type: z.enum(QUOTE_SCOPE_STEP_TYPES).default('special_note'),
    label: z.string().trim().max(160).optional(),
    description: z
      .string()
      .trim()
      .min(1, 'Step description is required')
      .max(1000),
    prep_type: z.string().trim().max(120).optional(),
    paint_system: z.string().trim().max(160).optional(),
    coats_min: z.number().int().min(0).max(10).optional(),
    coats_max: z.number().int().min(0).max(10).optional(),
    product_name: z.string().trim().max(160).optional(),
    colour_status: z
      .enum(['confirmed', 'partial', 'to_confirm', 'not_applicable'] as const)
      .optional(),
    colour: z.string().trim().max(160).optional(),
    sheen: z.string().trim().max(80).optional(),
    requires_confirmation: z.boolean().default(false),
    is_customer_visible: z.boolean().default(true),
    sort_order: z.number().int().min(0).optional(),
    metadata: quoteFormMetadataSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.coats_min != null &&
      value.coats_max != null &&
      value.coats_max < value.coats_min
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['coats_max'],
        message: 'Maximum coats must be greater than or equal to minimum coats',
      });
    }
  });

export const quoteScopeSectionSchema = z
  .object({
    client_id: z.string().trim().min(1).max(120).optional(),
    section_kind: z.enum(QUOTE_SCOPE_SECTION_KINDS).default('general'),
    title: z.string().trim().min(1, 'Scope title is required').max(200),
    description: z.string().trim().max(1500).optional(),
    area_label: z.string().trim().max(200).optional(),
    surface_category: z.string().trim().max(120).optional(),
    is_optional: z.boolean().default(false),
    is_selected: z.boolean().default(true),
    pricing_status: z.enum(QUOTE_SCOPE_PRICING_STATUSES).default('unpriced'),
    measurement_status: z
      .enum(QUOTE_SCOPE_MEASUREMENT_STATUSES)
      .default('to_confirm'),
    source: z.enum(QUOTE_SCOPE_SOURCES).default('manual'),
    sort_order: z.number().int().min(0).optional(),
    metadata: quoteFormMetadataSchema.optional(),
    maintenance_job_pack: maintenanceJobPackSchema.optional(),
    visible_defects: z.array(z.string().trim().min(1).max(80)).default([]),
    priority: z.enum(QUOTE_SCOPE_PRIORITIES).optional(),
    report_context: z.boolean().default(false),
    unsupported_scope: z.string().trim().max(300).optional(),
    steps: z.array(quoteScopeStepSchema).default([]),
  })
  .superRefine((value, ctx) => {
    if (
      value.section_kind === 'maintenance' &&
      value.maintenance_job_pack == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maintenance_job_pack'],
        message: 'Select a supported painting-adjacent maintenance pack',
      });
    }
  });

export const quoteClauseItemSchema = z.object({
  client_id: z.string().trim().min(1).max(120).optional(),
  applies_to_section_client_id: z.string().trim().min(1).max(120).optional(),
  clause_key: z.string().trim().min(1, 'Clause key is required').max(120),
  category: z.enum(QUOTE_CLAUSE_CATEGORIES),
  title: z.string().trim().min(1, 'Clause title is required').max(200),
  body: z.string().trim().min(1, 'Clause body is required').max(2000),
  severity: z.enum(QUOTE_CLAUSE_SEVERITIES).default('info'),
  source: z
    .enum(['manual', 'ai', 'template', 'default_library', 'legacy_quote'] as const)
    .default('manual'),
  is_customer_visible: z.boolean().default(true),
  sort_order: z.number().int().min(0).optional(),
  metadata: quoteFormMetadataSchema.optional(),
});

export const quoteAiIntakeSnapshotSchema = z
  .object({
    job_type: quoteJobTypeSchema,
    maintenance_job_pack: maintenanceJobPackSchema.optional(),
    provider: z.string().trim().min(1, 'AI provider is required').max(120),
    model: z.string().trim().min(1, 'AI model is required').max(120),
    prompt_version: z
      .string()
      .trim()
      .min(1, 'Prompt version is required')
      .max(120),
    input_json: jsonRecordSchema.default({}),
    output_json: jsonRecordSchema.default({}),
    photo_refs: z.array(z.unknown()).default([]),
    price_rates_snapshot_id: z.string().trim().max(160).optional(),
    metadata: quoteFormMetadataSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.job_type === 'maintenance' &&
      value.maintenance_job_pack == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maintenance_job_pack'],
        message: 'Select a supported painting-adjacent maintenance pack',
      });
    }

    if (containsForbiddenQuoteFormPriceField(value.output_json)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['output_json'],
        message:
          'AI intake output cannot contain price, rate, GST, or total fields',
      });
    }
  });

export const quoteSurfaceSchema = z.object({
  surface_type: z.enum(['walls', 'ceiling', 'trim', 'doors', 'windows']),
  area_m2: z.number().positive('Area must be greater than zero'),
  coating_type: z
    .enum([
      'refresh_1coat',
      'touch_up_1coat',
      'repaint_2coat',
      'new_plaster_3coat',
      'stain',
      'specialty',
    ])
    .transform((value) =>
      value === 'touch_up_1coat' ? 'refresh_1coat' : value
    ),
  rate_per_m2_cents: z
    .number()
    .int('Rate must be a whole number of cents')
    .min(0, 'Rate must be zero or greater'),
  notes: z
    .string()
    .trim()
    .max(500, 'Surface notes must be 500 characters or less')
    .optional(),
});

export const quoteRoomSchema = z.object({
  name: z.string().trim().min(1, 'Room name is required'),
  room_type: z.enum(['interior', 'exterior']).default('interior'),
  length_m: z
    .number()
    .positive('Length must be greater than zero')
    .nullable()
    .optional(),
  width_m: z
    .number()
    .positive('Width must be greater than zero')
    .nullable()
    .optional(),
  height_m: z
    .number()
    .positive('Height must be greater than zero')
    .nullable()
    .optional(),
  surfaces: z.array(quoteSurfaceSchema).min(1, 'Add at least one surface'),
});

const interiorScopeSchema = z
  .array(z.enum(INTERIOR_SCOPE_OPTIONS))
  .min(1, 'Select at least one scope item');

const interiorWallPaintSystemSchema = z
  .enum([...INTERIOR_WALL_PAINT_SYSTEMS, 'touch_up_2coat'] as const)
  .transform(
    (value) => normalizeInteriorWallPaintSystem(value) ?? 'repaint_2coat'
  );

const interiorSourceAnchorRangeSchema = z.object({
  min: z.number().int().min(0),
  median: z.number().int().min(0),
  max: z.number().int().min(0),
});

const interiorRoomTemplateSurfacePricesSchema = z.object({
  walls_cents: z.number().int().min(0),
  ceiling_cents: z.number().int().min(0),
  trim_cents: z.number().int().min(0),
});

const interiorEstimateRoomSchema = z.object({
  name: z.string().trim().min(1, 'Room name is required'),
  anchor_room_type: z.string().trim().min(1),
  room_type: z.enum(['interior', 'exterior']).default('interior'),
  length_m: z
    .number()
    .positive('Length must be greater than zero')
    .nullable()
    .optional(),
  width_m: z
    .number()
    .positive('Width must be greater than zero')
    .nullable()
    .optional(),
  height_m: z
    .number()
    .positive('Height must be greater than zero')
    .nullable()
    .optional(),
  pricing_model: z.enum(['anchor', 'measured']).optional(),
  wall_area_m2: z.number().min(0).nullable().optional(),
  ceiling_area_m2: z.number().min(0).nullable().optional(),
  trim_linear_m: z.number().min(0).nullable().optional(),
  include_walls: z.boolean(),
  include_ceiling: z.boolean(),
  include_trim: z.boolean(),
  source_rate_item_id: z.string().optional(),
  source_rate_item_version: z.number().int().min(1).optional(),
  source_rate_item_label: z.string().optional(),
  source_room_template_id: z.string().trim().min(1).optional(),
  source_room_template_version: z.number().int().min(1).optional(),
  source_room_template_label: z.string().trim().min(1).optional(),
  source_room_template_size: z.enum(['small', 'medium', 'large']).optional(),
  source_room_template_surface_prices_cents:
    interiorRoomTemplateSurfacePricesSchema.optional(),
  source_room_template_coating_multiplier_pct: z.number().min(0).optional(),
  source_room_template_condition_multiplier_pct: z.number().min(0).optional(),
  rate_snapshot_version: z.literal(1).optional(),
  source_anchor_range_cents: interiorSourceAnchorRangeSchema.optional(),
  source_wall_rate_cents_per_m2: z.number().int().min(0).optional(),
  source_ceiling_rate_cents_per_m2: z.number().int().min(0).optional(),
  source_trim_rate_cents_per_m: z.number().int().min(0).optional(),
  source_condition_multiplier_pct: z.number().min(0).optional(),
  source_surface_rate_multiplier: z.number().min(0).optional(),
  source_scope_multiplier: z.number().min(0).optional(),
  source_condition: z.enum(INTERIOR_CONDITIONS).optional(),
  source_wall_paint_system: interiorWallPaintSystemSchema.optional(),
  source_trim_paint_system: z.enum(INTERIOR_PAINT_SYSTEMS).optional(),
});

const interiorOpeningItemSchema = z
  .object({
    opening_type: z.enum(['door', 'window']),
    paint_system: z.enum(INTERIOR_PAINT_SYSTEMS),
    quantity: z
      .number()
      .int('Opening quantity must be a whole number')
      .min(1, 'Opening quantity must be at least 1'),
    room_index: z.number().int().min(0).nullable().optional(),
    door_type: z.enum(INTERIOR_DOOR_TYPES).optional(),
    door_scope: z.enum(INTERIOR_DOOR_SCOPES).optional(),
    window_type: z.enum(INTERIOR_WINDOW_TYPES).optional(),
    window_scope: z.enum(INTERIOR_WINDOW_SCOPES).optional(),
    rate_snapshot_version: z.literal(1).optional(),
    source_unit_price_cents: z.number().int().min(0).optional(),
    source_quantity_scale_factor: z.number().min(0).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.opening_type === 'door') {
      if (value.door_type == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['door_type'],
          message: 'Select the door type',
        });
      }
      if (value.door_scope == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['door_scope'],
          message: 'Select the door scope',
        });
      }
    }

    if (value.opening_type === 'window') {
      if (value.window_type == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['window_type'],
          message: 'Select the window type',
        });
      }
      if (value.window_scope == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['window_scope'],
          message: 'Select the window scope',
        });
      }
    }
  });

const interiorTrimItemSchema = z.object({
  trim_type: z.literal('skirting'),
  paint_system: z.enum(INTERIOR_PAINT_SYSTEMS),
  quantity: z
    .number()
    .min(0, 'Skirting must be zero or greater')
    .refine((value) => Number.isFinite(value), {
      message: 'Skirting value must be a number',
    }),
  room_index: z.number().int().min(0).nullable().optional(),
  rate_snapshot_version: z.literal(1).optional(),
  source_unit_price_cents: z.number().int().min(0).optional(),
});

export const interiorEstimateSchema = z
  .object({
    property_type: z.enum(['apartment', 'house']),
    estimate_mode: z.enum(['entire_property', 'specific_areas']),
    condition: z.enum(INTERIOR_CONDITIONS),
    scope: interiorScopeSchema,
    wall_paint_system: interiorWallPaintSystemSchema.default('repaint_2coat'),
    trim_paint_system: z.enum(INTERIOR_PAINT_SYSTEMS).default('oil_2coat'),
    property_details: z.object({
      apartment_type: z.enum(INTERIOR_APARTMENT_TYPES).nullable().optional(),
      sqm: z
        .number()
        .positive('Size must be greater than zero')
        .nullable()
        .optional(),
      bedrooms: z
        .number()
        .int('Bedrooms must be a whole number')
        .min(1)
        .nullable()
        .optional(),
      bathrooms: z
        .number()
        .int('Bathrooms must be a whole number')
        .min(1)
        .nullable()
        .optional(),
      storeys: z.enum(INTERIOR_STOREYS).nullable().optional(),
    }),
    rooms: z.array(interiorEstimateRoomSchema).default([]),
    opening_items: z.array(interiorOpeningItemSchema).default([]),
    trim_items: z.array(interiorTrimItemSchema).default([]),
  })
  .superRefine((value, ctx) => {
    if (
      value.property_type === 'apartment' &&
      value.estimate_mode === 'entire_property'
    ) {
      if (
        value.property_details.apartment_type == null &&
        value.property_details.sqm == null
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['property_details', 'apartment_type'],
          message: 'Choose an apartment type or enter sqm',
        });
      }
    }

    if (
      value.property_type === 'house' &&
      value.estimate_mode === 'entire_property' &&
      value.property_details.storeys == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['property_details', 'storeys'],
        message: 'Select the number of storeys',
      });
    }

    if (
      value.property_type === 'house' &&
      value.estimate_mode === 'entire_property'
    ) {
      if (
        value.property_details.bedrooms == null &&
        value.property_details.sqm == null
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['property_details', 'bedrooms'],
          message: 'Enter bedrooms or sqm to price the house',
        });
      }
      if (
        value.property_details.bedrooms != null &&
        value.property_details.bathrooms == null
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['property_details', 'bathrooms'],
          message: 'Enter bathrooms for house pricing',
        });
      }
    }

    if (value.estimate_mode === 'specific_areas' && value.rooms.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rooms'],
        message: 'Add at least one room',
      });
    }

    value.opening_items.forEach((item, index) => {
      if (item.room_index != null && item.room_index >= value.rooms.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['opening_items', index, 'room_index'],
          message: 'Opening item room reference is invalid',
        });
      }
    });

    value.trim_items.forEach((item, index) => {
      if (item.room_index != null && item.room_index >= value.rooms.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['trim_items', index, 'room_index'],
          message: 'Trim item room reference is invalid',
        });
      }
    });
  });

const quoteCreateLineItemSchema = z
  .object({
    material_item_id: z.string().uuid().nullable().optional(),
    name: z.string().trim().min(1, 'Item name is required').max(200),
    category: z
      .enum(['paint', 'primer', 'supply', 'service', 'other'] as const)
      .default('other'),
    unit: z.string().trim().min(1, 'Unit is required').max(50).default('item'),
    quantity: z
      .number()
      .positive('Quantity must be greater than zero')
      .multipleOf(0.01),
    unit_price_cents: z
      .number()
      .int('Price must be a whole number of cents')
      .min(0, 'Price must be zero or greater'),
    is_optional: z.boolean().default(false),
    is_selected: z.boolean().default(true),
    notes: z.string().trim().max(500).optional(),
    pricing_scope_key: z.string().trim().min(1).max(160).optional(),
    pricing_role: z
      .enum(['priced_scope', 'addon', 'material', 'optional_addon'] as const)
      .optional(),
  })
  .superRefine((item, ctx) => {
    if (item.category === 'paint' && !Number.isInteger(item.quantity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Paint quantity must be a whole number',
        path: ['quantity'],
      });
    }
  });

export const quoteCreateSchema = z
  .object({
    customer_id: z.string().trim().uuid('Select a customer'),
    customer_email: z
      .string()
      .trim()
      .email('Select a valid customer email')
      .optional(),
    customer_address: z
      .string()
      .trim()
      .max(500, 'Customer address must be 500 characters or less')
      .optional(),
    quote_number: z.string().trim().min(1).optional(),
    job_type: quoteJobTypeSchema.optional(),
    title: z.string().trim().min(1, 'Quote title is required'),
    status: z
      .enum(['draft', 'sent', 'approved', 'rejected', 'expired'])
      .default('draft'),
    valid_until: optionalIsoDateString,
    working_days: z
      .number()
      .int('Booking duration must be a whole number of days')
      .min(1, 'Booking duration must be at least 1 day')
      .max(30, 'Booking duration cannot exceed 30 days')
      .default(1),
    complexity: z.enum(['standard', 'moderate', 'complex']).default('standard'),
    labour_margin_percent: z
      .number()
      .int('Labour margin must be a whole number')
      .min(0, 'Labour margin must be zero or greater')
      .max(100, 'Labour margin must be 100 or less')
      .default(0),
    material_margin_percent: z
      .number()
      .int('Material margin must be a whole number')
      .min(0, 'Material margin must be zero or greater')
      .max(100, 'Material margin must be 100 or less')
      .default(0),
    notes: z
      .string()
      .trim()
      .max(2000, 'Notes must be 2000 characters or less')
      .optional(),
    internal_notes: z
      .string()
      .trim()
      .max(2000, 'Internal notes must be 2000 characters or less')
      .optional(),
    manual_adjustment_cents: z
      .number()
      .int('Adjustment must be a whole number of cents')
      .min(-10_000_00, 'Adjustment cannot exceed -$10,000')
      .max(10_000_00, 'Adjustment cannot exceed $10,000')
      .default(0),
    discount_cents: z
      .number()
      .int('Discount must be a whole number of cents')
      .min(0, 'Discount must be zero or greater')
      .max(1_000_000_00, 'Discount cannot exceed $1,000,000')
      .default(0),
    deposit_percent: z
      .number()
      .int('Deposit must be a whole number percent')
      .min(0, 'Deposit must be zero or greater')
      .max(100, 'Deposit cannot exceed 100%')
      .default(0),
    rooms: z.array(quoteRoomSchema).default([]),
    scope_sections: z.array(quoteScopeSectionSchema).default([]),
    clause_items: z.array(quoteClauseItemSchema).default([]),
    ai_intake_snapshot: quoteAiIntakeSnapshotSchema.optional(),
    interior_estimate: interiorEstimateSchema.optional(),
    exterior_estimate: z
      .object({
        coating: z.enum(EXTERIOR_COATING_TYPES),
        surfaces: z
          .object({
            ext_walls: z.number().min(0).optional(),
            eaves: z.number().min(0).optional(),
            fascia: z.number().min(0).optional(),
            gutters: z.number().min(0).optional(),
          })
          .optional(),
        custom_surfaces: z.record(z.string(), z.number().min(0)).optional(),
        custom_labels: z
          .object({
            ext_walls: z.string().optional(),
            eaves: z.string().optional(),
            fascia: z.string().optional(),
            gutters: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
    line_items: z.array(quoteCreateLineItemSchema).default([]),
    pricing_method: z
      .enum(['day_rate', 'sqm_rate', 'room_rate', 'manual', 'hybrid', 'detailed_quick'])
      .default('hybrid'),
    pricing_method_inputs: z
      .discriminatedUnion('method', [
        z.object({
          method: z.literal('day_rate'),
          inputs: z.object({
            days: z.number().positive(),
            daily_rate_cents: z.number().int().min(0),
            material_method: z.enum(['percentage', 'flat']),
            material_percent: z.number().int().min(0).max(100).optional(),
            material_flat_cents: z.number().int().min(0).optional(),
          }),
        }),
        z.object({
          method: z.literal('room_rate'),
          inputs: z.object({
            rooms: z.array(
              z.object({
                name: z.string(),
                room_type: z.enum([
                  'bedroom',
                  'bathroom',
                  'living',
                  'kitchen',
                  'hallway',
                  'other',
                ]),
                size: z.enum(['small', 'medium', 'large']),
                rate_cents: z.number().int().min(0),
              })
            ),
          }),
        }),
        z.object({
          method: z.literal('manual'),
          inputs: z.object({
            labor_cents: z.number().int().min(0),
            material_cents: z.number().int().min(0),
          }),
        }),
        z.object({
          method: z.literal('sqm_rate'),
          inputs: z.null(),
        }),
        z.object({
          method: z.literal('hybrid'),
          inputs: z.null(),
        }),
        z.object({
          method: z.literal('detailed_quick'),
          inputs: z.object({
            property_preset: z
              .object({
                estimate_category: z.literal('interior').optional(),
                preset_id: z.string(),
                source_rate_item_id: z.string().optional(),
                source_rate_item_version: z.number().int().min(1).optional(),
                source_rate_item_label: z.string().optional(),
                rate_snapshot_version: z.literal(1).optional(),
                label: z.string(),
                property_type: z.enum(['apartment', 'house']),
                apartment_type: z
                  .enum([
                    'studio',
                    '1_bedroom',
                    '2_bedroom_standard',
                    '2_bedroom_large',
                    '3_bedroom',
                  ])
                  .nullable()
                  .optional(),
                bedrooms: z.number().int().min(0).nullable().optional(),
                bathrooms: z.number().int().min(0).nullable().optional(),
                storeys: z
                  .enum(['1_storey', '2_storey', '3_storey'])
                  .nullable()
                  .optional(),
                sqm: z.number().positive().nullable().optional(),
                condition: z.enum(['excellent', 'fair', 'poor']),
                scope: z.array(z.enum(['walls', 'ceiling', 'trim'])).min(1),
                surface_price_share: z
                  .object({
                    walls_pct: z.number().min(0),
                    ceiling_pct: z.number().min(0),
                    trim_pct: z.number().min(0),
                  })
                  .optional(),
                wall_paint_system: z.enum([
                  'refresh_1coat',
                  'repaint_2coat',
                  'new_plaster_3coat',
                ]),
                trim_paint_system: z.enum(INTERIOR_PAINT_SYSTEMS).optional(),
                subtotal_cents: z.number().int().min(0),
                gst_cents: z.number().int().min(0),
                total_cents: z.number().int().min(0),
              })
              .nullable()
              .optional(),
            rooms: z.array(
              z.object({
                room_id: z.string(),
                source_rate_item_id: z.string().optional(),
                source_rate_item_version: z.number().int().min(1).optional(),
                source_rate_item_label: z.string().optional(),
                rate_snapshot_version: z.literal(1).optional(),
                label: z.string(),
                size: z.enum(['small', 'medium', 'large']),
                selected_surfaces: z.array(z.enum(['walls', 'ceiling', 'trim'])),
                trim_paint_system: z.enum(INTERIOR_PAINT_SYSTEMS).optional(),
                notes: z.string().optional(),
                walls_cents: z.number().int().min(0),
                ceiling_cents: z.number().int().min(0),
                trim_cents: z.number().int().min(0),
                coating_multiplier_pct: z.number().min(0),
                condition_multiplier_pct: z.number().min(0),
                total_cents: z.number().int().min(0),
              })
            ),
            global_coating: z.enum([
              'one_coat_refresh',
              'two_coats_repaint',
              'three_coats_new_plaster',
            ]),
            global_condition: z.enum(['good', 'average', 'poor']),
            global_trim_paint_system: z.enum(INTERIOR_PAINT_SYSTEMS).optional(),
          }),
        }),
      ])
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.interior_estimate && value.rooms.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Choose manual rooms or an interior estimate, not both',
        path: ['rooms'],
      });
    }

    const methodNeedsRooms = ['sqm_rate', 'hybrid'].includes(
      value.pricing_method
    );
    if (
      methodNeedsRooms &&
      !value.interior_estimate &&
      !value.exterior_estimate &&
      value.rooms.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Add at least one room',
        path: ['rooms'],
      });
    }
  });

export const quoteLineItemFormSchema = z
  .object({
    material_item_id: z.string().uuid().nullable().optional(),
    name: z.string().trim().min(1, 'Item name is required').max(200),
    category: z.enum(MATERIAL_ITEM_CATEGORIES).default('other'),
    unit: z.string().trim().min(1, 'Unit is required').max(50).default('item'),
    quantity: z
      .number()
      .positive('Quantity must be greater than zero')
      .multipleOf(0.01),
    unit_price_cents: z
      .number()
      .int('Price must be a whole number of cents')
      .min(0, 'Price must be zero or greater'),
    is_optional: z.boolean().default(false),
    is_selected: z.boolean().default(true),
    notes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((value) => value ?? null),
  })
  .superRefine((value, ctx) => {
    if (value.category === 'paint' && !Number.isInteger(value.quantity)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Paint quantity must be a whole number',
        path: ['quantity'],
      });
    }
  });

export type QuoteSurfaceInput = z.input<typeof quoteSurfaceSchema>;
export type QuoteSurface = z.output<typeof quoteSurfaceSchema>;
export type QuoteRoomInput = z.input<typeof quoteRoomSchema>;
export type QuoteRoom = z.output<typeof quoteRoomSchema>;
export type InteriorEstimateInput = z.input<typeof interiorEstimateSchema>;
export type InteriorEstimate = z.output<typeof interiorEstimateSchema>;
export type QuoteCreateInput = z.input<typeof quoteCreateSchema>;
export type QuoteCreate = z.output<typeof quoteCreateSchema>;
export type QuoteLineItemFormInput = z.input<typeof quoteLineItemFormSchema>;
export type QuoteLineItemFormDraft = z.output<typeof quoteLineItemFormSchema> & {
  total_cents: number;
};
export type { MaterialItemCategory };
