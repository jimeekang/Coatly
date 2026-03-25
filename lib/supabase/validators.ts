import { z } from 'zod';
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

export const quoteCreateSchema = z.object({
  customer_id: z.string().trim().uuid('Select a customer'),
  title: z.string().trim().min(1, 'Quote title is required'),
  status: z.enum(['draft', 'sent', 'accepted', 'declined', 'expired']).default('draft'),
  valid_until: optionalIsoDateString,
  tier: z.enum(['good', 'better', 'best']).default('better'),
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
  rooms: z.array(quoteRoomSchema).min(1, 'Add at least one room'),
});

export type QuoteSurfaceInput = z.input<typeof quoteSurfaceSchema>;
export type QuoteSurface = z.output<typeof quoteSurfaceSchema>;
export type QuoteRoomInput = z.input<typeof quoteRoomSchema>;
export type QuoteRoom = z.output<typeof quoteRoomSchema>;
export type QuoteCreateInput = z.input<typeof quoteCreateSchema>;
export type QuoteCreate = z.output<typeof quoteCreateSchema>;
