import { z } from 'zod';

const optionalUuidString = z
  .string()
  .trim()
  .uuid('Invalid selection')
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

const optionalPaymentMethodSchema = z
  .enum(['bank_transfer', 'cash', 'card', 'cheque', 'other'])
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

export const invoiceCreateSchema = z
  .object({
    customer_id: z.string().trim().uuid('Select a customer'),
    quote_id: optionalUuidString,
    status: z
      .enum(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
      .default('draft'),
    invoice_type: z
      .enum(['full', 'deposit', 'progress', 'final'])
      .default('full'),
    business_abn: optionalAbnString,
    payment_terms: z
      .string()
      .trim()
      .max(1000, 'Payment terms must be 1000 characters or less')
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .optional(),
    bank_details: z
      .string()
      .trim()
      .max(2000, 'Bank details must be 2000 characters or less')
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .optional(),
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
    paid_date: z
      .string()
      .trim()
      .or(z.literal(''))
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .optional()
      .refine((value) => value == null || !Number.isNaN(Date.parse(value)), {
        message: 'Paid date must be a valid date',
      }),
    payment_method: optionalPaymentMethodSchema,
    notes: z
      .string()
      .trim()
      .max(2000, 'Notes must be 2000 characters or less')
      .optional(),
    line_items: z
      .array(invoiceLineItemSchema)
      .min(1, 'Add at least one line item'),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'paid' && !value.paid_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Paid date is required when status is paid',
        path: ['paid_date'],
      });
    }

    if (value.status === 'paid' && !value.payment_method) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Payment method is required when status is paid',
        path: ['payment_method'],
      });
    }
  });

export type InvoiceLineItemInput = z.input<typeof invoiceLineItemSchema>;
export type InvoiceLineItem = z.output<typeof invoiceLineItemSchema>;
export type InvoiceCreateInput = z.input<typeof invoiceCreateSchema>;
export type InvoiceCreate = z.output<typeof invoiceCreateSchema>;
