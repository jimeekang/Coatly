import { z } from 'zod';
import { ratePresetSchema } from '@/modules/price-rates/domain/rate-settings';
import {
  MATERIAL_ITEM_CATEGORIES,
  MATERIAL_ITEM_CATEGORY_LABELS,
  materialItemUpsertSchema,
  type MaterialItem,
  type MaterialItemCategory,
  type MaterialItemUpsert,
  type MaterialItemUpsertInput,
} from '@/modules/materials/domain/types';
import {
  invoiceCreateSchema,
  invoiceLineItemSchema,
  type InvoiceCreate,
  type InvoiceCreateInput,
  type InvoiceLineItem,
  type InvoiceLineItemInput,
} from '@/modules/invoices/domain/invoice-schema';
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
  paymentTerms: z
    .string()
    .trim()
    .max(1000, 'Payment terms must be 1000 characters or less')
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
  bankDetails: z
    .string()
    .trim()
    .max(2000, 'Bank details must be 2000 characters or less')
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
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

export { invoiceCreateSchema, invoiceLineItemSchema };
export type {
  InvoiceCreate,
  InvoiceCreateInput,
  InvoiceLineItem,
  InvoiceLineItemInput,
};

export {
  interiorEstimateSchema,
  quoteAiIntakeSnapshotSchema,
  quoteClauseItemSchema,
  quoteCreateSchema,
  quoteLineItemFormSchema,
  quoteRoomSchema,
  quoteScopeSectionSchema,
  quoteScopeStepSchema,
  quoteSurfaceSchema,
} from '@/modules/quotes/domain/quote-schema';
export type {
  InteriorEstimate,
  InteriorEstimateInput,
  QuoteCreate,
  QuoteCreateInput,
  QuoteLineItemFormDraft,
  QuoteLineItemFormInput,
  QuoteRoom,
  QuoteRoomInput,
  QuoteSurface,
  QuoteSurfaceInput,
} from '@/modules/quotes/domain/quote-schema';

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
export type RatePresetInput = z.input<typeof ratePresetSchema>;
export type RatePreset = z.output<typeof ratePresetSchema>;

export { ratePresetSchema };

export const jobStatusSchema = z.enum([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);

const jobDateSchema = z
  .string()
  .trim()
  .min(1, 'Schedule date is required')
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Schedule date must use YYYY-MM-DD',
  })
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Schedule date must be a valid date',
  });

export const jobRecordSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  customer_id: uuidSchema,
  quote_id: uuidSchema.nullable(),
  title: z.string().trim().min(1, 'Job title is required'),
  status: jobStatusSchema,
  scheduled_date: jobDateSchema,
  notes: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const jobInsertSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  customer_id: uuidSchema,
  quote_id: optionalUuidString,
  title: z.string().trim().min(1, 'Job title is required').max(200),
  status: jobStatusSchema.optional(),
  scheduled_date: jobDateSchema,
  notes: z.string().trim().max(2000).nullable().optional(),
  created_at: nullableIsoDateSchema.optional(),
  updated_at: nullableIsoDateSchema.optional(),
});

export const jobUpdateSchema = jobInsertSchema.partial();

export const jobUpsertSchema = z.object({
  customer_id: uuidSchema,
  quote_id: optionalUuidString,
  title: z.string().trim().min(1, 'Job title is required').max(200),
  status: jobStatusSchema.default('scheduled'),
  scheduled_date: jobDateSchema,
  notes: z.string().trim().max(2000, 'Notes must be 2000 characters or less').optional(),
});

export type JobRecordInput = z.input<typeof jobRecordSchema>;
export type JobRecord = z.output<typeof jobRecordSchema>;
export type JobInsertInput = z.input<typeof jobInsertSchema>;
export type JobInsert = z.output<typeof jobInsertSchema>;
export type JobUpdateInput = z.input<typeof jobUpdateSchema>;
export type JobUpdate = z.output<typeof jobUpdateSchema>;
export type JobUpsertInput = z.input<typeof jobUpsertSchema>;
export type JobUpsert = z.output<typeof jobUpsertSchema>;

const googleCalendarIdSchema = z
  .string()
  .trim()
  .min(1, 'Choose a calendar')
  .max(255, 'Calendar id is too long');

export const googleCalendarSettingsSchema = z.object({
  display_calendar_id: googleCalendarIdSchema,
  availability_calendar_id: googleCalendarIdSchema,
  event_destination_calendar_id: googleCalendarIdSchema,
  timezone: z.string().trim().min(1, 'Timezone is required').max(100),
});

export type GoogleCalendarSettingsInput = z.input<typeof googleCalendarSettingsSchema>;
export type GoogleCalendarSettings = z.output<typeof googleCalendarSettingsSchema>;

// ─── Material Items ───────────────────────────────────────────────────────────

export {
  MATERIAL_ITEM_CATEGORIES,
  MATERIAL_ITEM_CATEGORY_LABELS,
  materialItemUpsertSchema,
};
export type {
  MaterialItem,
  MaterialItemCategory,
  MaterialItemUpsert,
  MaterialItemUpsertInput,
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
  is_optional: boolean;
  is_selected: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
