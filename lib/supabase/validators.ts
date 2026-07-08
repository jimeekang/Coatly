import { z } from 'zod';
import {
  MATERIAL_ITEM_CATEGORIES,
  MATERIAL_ITEM_CATEGORY_LABELS,
  materialItemUpsertSchema,
  type MaterialItem,
  type MaterialItemCategory,
  type MaterialItemUpsert,
  type MaterialItemUpsertInput,
} from '@/modules/materials/domain/types';
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

const uuidSchema = z.string().uuid('Invalid id');
const nullableIsoDateSchema = z.string().datetime().nullable();

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
