import { z } from 'zod';
import {
  INTERIOR_APARTMENT_TYPES,
  INTERIOR_CONDITIONS,
  INTERIOR_DOOR_SCOPES,
  INTERIOR_DOOR_TYPES,
  INTERIOR_PAINT_SYSTEMS,
  INTERIOR_ROOM_TYPES,
  INTERIOR_SCOPE_OPTIONS,
  INTERIOR_STOREYS,
  INTERIOR_WINDOW_SCOPES,
  INTERIOR_WINDOW_TYPES,
} from '@/lib/interior-estimates';
import { ratePresetSchema } from '@/lib/rate-settings';
import { isValidStorageReference } from '@/lib/supabase/storage';

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional();

const optionalPostcodeString = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d{4}$/.test(value), {
    message: 'Postcode must be 4 digits',
  })
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional();

const optionalStateString = z
  .string()
  .trim()
  .refine((value) => value === '' || /^(ACT|NSW|NT|QLD|SA|TAS|VIC|WA)$/.test(value), {
    message: 'State must be a valid Australian state',
  })
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional();

const optionalLogoReferenceString = z
  .string()
  .trim()
  .refine((value) => isValidStorageReference(value), {
    message: 'Logo reference is invalid',
  })
  .transform((value) => (value === '' ? null : value))
  .or(z.literal(''))
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional();

const optionalEmailString = z
  .string()
  .trim()
  .email('Email must be a valid email')
  .transform((value) => value.toLowerCase())
  .or(z.literal(''))
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional();

const optionalAbnString = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s/g, ''))
  .refine((value) => value === '' || /^\d{11}$/.test(value), {
    message: 'ABN must be 11 digits',
  })
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional();

export const businessUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Business name is required'),
  abn: optionalAbnString,
  addressLine1: optionalTrimmedString,
  city: optionalTrimmedString,
  state: optionalStateString,
  postcode: optionalPostcodeString,
  phone: optionalTrimmedString,
  email: optionalEmailString,
  logo_url: optionalLogoReferenceString,
});

export type BusinessUpdateInput = z.input<typeof businessUpdateSchema>;
export type BusinessUpdate = z.output<typeof businessUpdateSchema>;

const optionalUuidString = z
  .string()
  .trim()
  .uuid('Invalid selection')
  .or(z.literal(''))
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional();

export const invoiceLineItemSchema = z.object({
  description: z.string().trim().min(1, 'Line item description is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit_price_cents: z
    .number()
    .int('Unit price must be a whole number of cents')
    .min(0, 'Unit price must be zero or greater'),
});

export const invoiceCreateSchema = z.object({
  customer_id: z.string().trim().uuid('Select a customer'),
  quote_id: optionalUuidString,
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),
  invoice_type: z.enum(['full', 'deposit', 'progress', 'final']).default('full'),
  due_date: z
    .string()
    .trim()
    .or(z.literal(''))
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional()
    .refine((value) => value == null || !Number.isNaN(Date.parse(value)), {
      message: 'Due date must be a valid date',
    }),
  notes: z.string().trim().max(2000, 'Notes must be 2000 characters or less').optional(),
  line_items: z.array(invoiceLineItemSchema).min(1, 'Add at least one line item'),
});

export type InvoiceLineItemInput = z.input<typeof invoiceLineItemSchema>;
export type InvoiceLineItem = z.output<typeof invoiceLineItemSchema>;
export type InvoiceCreateInput = z.input<typeof invoiceCreateSchema>;
export type InvoiceCreate = z.output<typeof invoiceCreateSchema>;

const optionalIsoDateString = z
  .string()
  .trim()
  .min(1, 'Date is required')
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Date must be a valid date',
  });

const uuidSchema = z.string().uuid('Invalid id');
const nullableIsoDateSchema = z.string().datetime().nullable();
const nonNegativeIntegerSchema = z
  .number()
  .int('Value must be a whole number')
  .min(0, 'Value must be zero or greater');
const quoteStatusSchema = z.enum(['draft', 'sent', 'approved', 'rejected', 'expired']);
const quoteTierSchema = z.enum(['standard', 'moderate', 'complex']);
const quoteEstimateCategorySchema = z.enum(['manual', 'interior']);
const quotePropertyTypeSchema = z.enum(['apartment', 'house']);
const quoteEstimateModeSchema = z.enum(['entire_property', 'specific_areas']);
const quoteLineItemCategorySchema = z.enum([
  'entire_property',
  'room',
  'door',
  'window',
  'skirting',
  'modifier',
]);
const quoteJsonSchema: z.ZodType<
  string | number | boolean | null | { [key: string]: unknown } | unknown[]
> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.unknown()), z.record(z.string(), z.unknown())])
);

export const quoteRecordSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  customer_id: uuidSchema,
  quote_number: z.string().trim().min(1, 'Quote number is required'),
  title: z.string().nullable(),
  status: quoteStatusSchema,
  notes: z.string().nullable(),
  internal_notes: z.string().nullable(),
  labour_margin_percent: nonNegativeIntegerSchema,
  material_margin_percent: nonNegativeIntegerSchema,
  subtotal_cents: nonNegativeIntegerSchema,
  gst_cents: nonNegativeIntegerSchema,
  total_cents: nonNegativeIntegerSchema,
  manual_adjustment_cents: z.number().int('Adjustment must be a whole number of cents').default(0),
  valid_until: z.string().nullable(),
  tier: quoteTierSchema.nullable(),
  estimate_category: quoteEstimateCategorySchema,
  property_type: quotePropertyTypeSchema.nullable(),
  estimate_mode: quoteEstimateModeSchema.nullable(),
  estimate_context: quoteJsonSchema,
  pricing_snapshot: quoteJsonSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const quoteInsertSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  customer_id: uuidSchema,
  quote_number: z.string().trim().min(1, 'Quote number is required'),
  title: z.string().trim().min(1).nullable().optional(),
  status: quoteStatusSchema.optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  internal_notes: z.string().trim().max(2000).nullable().optional(),
  labour_margin_percent: nonNegativeIntegerSchema.optional(),
  material_margin_percent: nonNegativeIntegerSchema.optional(),
  subtotal_cents: nonNegativeIntegerSchema.optional(),
  gst_cents: nonNegativeIntegerSchema.optional(),
  total_cents: nonNegativeIntegerSchema.optional(),
  manual_adjustment_cents: z.number().int().optional(),
  valid_until: z.string().nullable().optional(),
  tier: quoteTierSchema.nullable().optional(),
  estimate_category: quoteEstimateCategorySchema.optional(),
  property_type: quotePropertyTypeSchema.nullable().optional(),
  estimate_mode: quoteEstimateModeSchema.nullable().optional(),
  estimate_context: quoteJsonSchema.optional(),
  pricing_snapshot: quoteJsonSchema.optional(),
  created_at: nullableIsoDateSchema.optional(),
  updated_at: nullableIsoDateSchema.optional(),
});

export const quoteUpdateSchema = quoteInsertSchema.partial();

export const quoteRoomRecordSchema = z.object({
  id: uuidSchema,
  quote_id: uuidSchema,
  name: z.string().trim().min(1, 'Room name is required'),
  room_type: z.enum(['interior', 'exterior']),
  length_m: z.number().positive().nullable(),
  width_m: z.number().positive().nullable(),
  height_m: z.number().positive().nullable(),
  sort_order: nonNegativeIntegerSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const quoteRoomInsertSchema = z.object({
  id: uuidSchema.optional(),
  quote_id: uuidSchema,
  name: z.string().trim().min(1, 'Room name is required'),
  room_type: z.enum(['interior', 'exterior']).optional(),
  length_m: z.number().positive().nullable().optional(),
  width_m: z.number().positive().nullable().optional(),
  height_m: z.number().positive().nullable().optional(),
  sort_order: nonNegativeIntegerSchema.optional(),
  created_at: nullableIsoDateSchema.optional(),
  updated_at: nullableIsoDateSchema.optional(),
});

export const quoteRoomUpdateSchema = quoteRoomInsertSchema.partial();

export const quoteLineItemRecordSchema = z.object({
  id: uuidSchema,
  quote_id: uuidSchema,
  category: quoteLineItemCategorySchema,
  label: z.string().trim().min(1, 'Label is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit: z.string().trim().min(1, 'Unit is required'),
  unit_price_cents: nonNegativeIntegerSchema,
  total_cents: nonNegativeIntegerSchema,
  metadata: z.record(z.string(), z.unknown()),
  sort_order: nonNegativeIntegerSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const quoteLineItemInsertSchema = z.object({
  id: uuidSchema.optional(),
  quote_id: uuidSchema,
  category: quoteLineItemCategorySchema,
  label: z.string().trim().min(1, 'Label is required'),
  quantity: z.number().positive('Quantity must be greater than zero').optional(),
  unit: z.string().trim().min(1, 'Unit is required').optional(),
  unit_price_cents: nonNegativeIntegerSchema.optional(),
  total_cents: nonNegativeIntegerSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sort_order: nonNegativeIntegerSchema.optional(),
  created_at: nullableIsoDateSchema.optional(),
  updated_at: nullableIsoDateSchema.optional(),
});

export const quoteLineItemUpdateSchema = quoteLineItemInsertSchema.partial();

export const quoteSurfaceSchema = z.object({
  surface_type: z.enum(['walls', 'ceiling', 'trim', 'doors', 'windows']),
  area_m2: z.number().positive('Area must be greater than zero'),
  coating_type: z.enum([
    'touch_up_1coat',
    'repaint_2coat',
    'new_plaster_3coat',
    'stain',
    'specialty',
  ]),
  rate_per_m2_cents: z
    .number()
    .int('Rate must be a whole number of cents')
    .min(0, 'Rate must be zero or greater'),
  notes: z.string().trim().max(500, 'Surface notes must be 500 characters or less').optional(),
});

export const quoteRoomSchema = z.object({
  name: z.string().trim().min(1, 'Room name is required'),
  room_type: z.enum(['interior', 'exterior']).default('interior'),
  length_m: z.number().positive('Length must be greater than zero').nullable().optional(),
  width_m: z.number().positive('Width must be greater than zero').nullable().optional(),
  height_m: z.number().positive('Height must be greater than zero').nullable().optional(),
  surfaces: z.array(quoteSurfaceSchema).min(1, 'Add at least one surface'),
});

const interiorScopeSchema = z
  .array(z.enum(INTERIOR_SCOPE_OPTIONS))
  .min(1, 'Select at least one scope item');

const interiorEstimateRoomSchema = z.object({
  name: z.string().trim().min(1, 'Room name is required'),
  anchor_room_type: z.enum(INTERIOR_ROOM_TYPES),
  room_type: z.enum(['interior', 'exterior']).default('interior'),
  length_m: z.number().positive('Length must be greater than zero').nullable().optional(),
  width_m: z.number().positive('Width must be greater than zero').nullable().optional(),
  height_m: z.number().positive('Height must be greater than zero').nullable().optional(),
  include_walls: z.boolean(),
  include_ceiling: z.boolean(),
  include_trim: z.boolean(),
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
});

export const interiorEstimateSchema = z
  .object({
    property_type: z.enum(['apartment', 'house']),
    estimate_mode: z.enum(['entire_property', 'specific_areas']),
    condition: z.enum(INTERIOR_CONDITIONS),
    scope: interiorScopeSchema,
    property_details: z.object({
      apartment_type: z.enum(INTERIOR_APARTMENT_TYPES).nullable().optional(),
      sqm: z.number().positive('Size must be greater than zero').nullable().optional(),
      bedrooms: z.number().int('Bedrooms must be a whole number').min(1).nullable().optional(),
      bathrooms: z.number().int('Bathrooms must be a whole number').min(1).nullable().optional(),
      storeys: z.enum(INTERIOR_STOREYS).nullable().optional(),
    }),
    rooms: z.array(interiorEstimateRoomSchema).default([]),
    opening_items: z.array(interiorOpeningItemSchema).default([]),
    trim_items: z.array(interiorTrimItemSchema).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.property_type === 'apartment' && value.estimate_mode === 'entire_property') {
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

    if (value.property_type === 'house' && value.property_details.storeys == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['property_details', 'storeys'],
        message: 'Select the number of storeys',
      });
    }

    if (value.property_type === 'house' && value.estimate_mode === 'entire_property') {
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

export const quoteCreateSchema = z.object({
  customer_id: z.string().trim().uuid('Select a customer'),
  title: z.string().trim().min(1, 'Quote title is required'),
  status: z.enum(['draft', 'sent', 'approved', 'rejected', 'expired']).default('draft'),
  valid_until: optionalIsoDateString,
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
  notes: z.string().trim().max(2000, 'Notes must be 2000 characters or less').optional(),
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
  rooms: z.array(quoteRoomSchema).default([]),
  interior_estimate: interiorEstimateSchema.optional(),
  line_items: z.array(z.object({
    material_item_id: z.string().uuid().nullable().optional(),
    name: z.string().trim().min(1, 'Item name is required').max(200),
    category: z.enum(['paint', 'primer', 'supply', 'service', 'other'] as const).default('other'),
    unit: z.string().trim().min(1, 'Unit is required').max(50).default('item'),
    quantity: z.number().positive('Quantity must be greater than zero').multipleOf(0.01),
    unit_price_cents: z.number().int('Price must be a whole number of cents').min(0, 'Price must be zero or greater'),
    notes: z.string().trim().max(500).optional().transform((v) => v ?? null),
  })).default([]),
  pricing_method: z
    .enum(['day_rate', 'sqm_rate', 'room_rate', 'manual', 'hybrid'])
    .default('hybrid'),
  pricing_method_inputs: z.discriminatedUnion('method', [
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
        rooms: z.array(z.object({
          name: z.string(),
          room_type: z.enum(['bedroom', 'bathroom', 'living', 'kitchen', 'hallway', 'other']),
          size: z.enum(['small', 'medium', 'large']),
          rate_cents: z.number().int().min(0),
        })),
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
  ]).optional(),
}).superRefine((value, ctx) => {
  if (value.interior_estimate && value.rooms.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Choose manual rooms or an interior estimate, not both',
      path: ['rooms'],
    });
  }

  // day_rate / room_rate / manual methods don't need rooms or interior_estimate
  const methodNeedsRooms = ['sqm_rate', 'hybrid'].includes(value.pricing_method);
  if (methodNeedsRooms && !value.interior_estimate && value.rooms.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Add at least one room',
      path: ['rooms'],
    });
  }
});

export type QuoteSurfaceInput = z.input<typeof quoteSurfaceSchema>;
export type QuoteSurface = z.output<typeof quoteSurfaceSchema>;
export type QuoteRoomInput = z.input<typeof quoteRoomSchema>;
export type QuoteRoom = z.output<typeof quoteRoomSchema>;
export type QuoteRecordInput = z.input<typeof quoteRecordSchema>;
export type QuoteRecord = z.output<typeof quoteRecordSchema>;
export type QuoteInsertInput = z.input<typeof quoteInsertSchema>;
export type QuoteInsert = z.output<typeof quoteInsertSchema>;
export type QuoteUpdateInput = z.input<typeof quoteUpdateSchema>;
export type QuoteUpdate = z.output<typeof quoteUpdateSchema>;
export type QuoteRoomRecordInput = z.input<typeof quoteRoomRecordSchema>;
export type QuoteRoomRecord = z.output<typeof quoteRoomRecordSchema>;
export type QuoteRoomInsertInput = z.input<typeof quoteRoomInsertSchema>;
export type QuoteRoomInsert = z.output<typeof quoteRoomInsertSchema>;
export type QuoteRoomUpdateInput = z.input<typeof quoteRoomUpdateSchema>;
export type QuoteRoomUpdate = z.output<typeof quoteRoomUpdateSchema>;
export type QuoteLineItemInput = z.input<typeof quoteLineItemRecordSchema>;
export type QuoteLineItem = z.output<typeof quoteLineItemRecordSchema>;
export type QuoteLineItemInsertInput = z.input<typeof quoteLineItemInsertSchema>;
export type QuoteLineItemInsert = z.output<typeof quoteLineItemInsertSchema>;
export type QuoteLineItemUpdateInput = z.input<typeof quoteLineItemUpdateSchema>;
export type QuoteLineItemUpdate = z.output<typeof quoteLineItemUpdateSchema>;
export type InteriorEstimateInput = z.input<typeof interiorEstimateSchema>;
export type InteriorEstimate = z.output<typeof interiorEstimateSchema>;
export type QuoteCreateInput = z.input<typeof quoteCreateSchema>;
export type QuoteCreate = z.output<typeof quoteCreateSchema>;
export type RatePresetInput = z.input<typeof ratePresetSchema>;
export type RatePreset = z.output<typeof ratePresetSchema>;

export { ratePresetSchema };

// ─── Material Items ───────────────────────────────────────────────────────────

export const MATERIAL_ITEM_CATEGORIES = ['paint', 'primer', 'supply', 'service', 'other'] as const;
export type MaterialItemCategory = (typeof MATERIAL_ITEM_CATEGORIES)[number];

export const MATERIAL_ITEM_CATEGORY_LABELS: Record<MaterialItemCategory, string> = {
  paint: 'Paint',
  primer: 'Primer',
  supply: 'Supply',
  service: 'Service',
  other: 'Other',
};

export const materialItemUpsertSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name must be 200 characters or less'),
  category: z.enum(MATERIAL_ITEM_CATEGORIES).default('other'),
  unit: z.string().trim().min(1, 'Unit is required').max(50, 'Unit must be 50 characters or less').default('item'),
  unit_price_cents: z
    .number()
    .int('Price must be a whole number of cents')
    .min(0, 'Price must be zero or greater'),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes must be 500 characters or less')
    .optional()
    .transform((v) => v ?? null),
  is_active: z.boolean().default(true),
});

export type MaterialItemUpsertInput = z.input<typeof materialItemUpsertSchema>;
export type MaterialItemUpsert = z.output<typeof materialItemUpsertSchema>;

export type MaterialItem = {
  id: string;
  user_id: string;
  name: string;
  category: MaterialItemCategory;
  unit: string;
  unit_price_cents: number;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// ─── Quote Line Items ─────────────────────────────────────────────────────────

export const quoteLineItemFormSchema = z.object({
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
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v ?? null),
});

export type QuoteLineItemFormInput = z.input<typeof quoteLineItemFormSchema>;
export type QuoteLineItemFormDraft = z.output<typeof quoteLineItemFormSchema> & {
  total_cents: number;
};

export type QuoteLineItemRecord = {
  id: string;
  quote_id: string;
  material_item_id: string | null;
  name: string;
  category: MaterialItemCategory;
  unit: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
