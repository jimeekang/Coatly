import { z } from 'zod';

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
  'room_anchor',
  'door',
  'window',
  'trim',
  'skirting',
  'quick_estimate',
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
  customer_email: z.string().nullable(),
  customer_address: z.string().nullable(),
  approved_at: z.string().datetime().nullable().optional(),
  approved_by_name: z.string().nullable().optional(),
  approved_by_email: z.string().nullable().optional(),
  approval_signature: z.string().nullable().optional(),
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
  customer_email: z.string().trim().email().nullable().optional(),
  customer_address: z.string().trim().nullable().optional(),
  approved_at: nullableIsoDateSchema.optional(),
  approved_by_name: z.string().trim().nullable().optional(),
  approved_by_email: z.string().trim().email().nullable().optional(),
  approval_signature: z.string().trim().nullable().optional(),
  quote_number: z.string().trim().min(1, 'Quote number is required'),
  title: z.string().trim().min(1).nullable().optional(),
  status: quoteStatusSchema.optional(),
  working_days: z.number().int().min(1).max(30).nullable().optional(),
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
