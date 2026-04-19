import { describe, expect, it } from 'vitest';
import {
  calculateInvoiceLineItemTotals,
  buildQuoteInvoiceLinkStateMap,
  buildQuoteInvoiceStageMap,
  calculateInvoiceTotals,
  formatCustomerAddress,
  parseInvoiceCreateInput,
  resolveInvoiceStatus,
} from '@/lib/invoices';

describe('lib/invoices', () => {
  it('calculates subtotal, gst, and total from line items', () => {
    const totals = calculateInvoiceTotals([
      {
        description: 'Walls',
        quantity: 2,
        unit_price_cents: 12500,
      },
      {
        description: 'Ceiling',
        quantity: 1,
        unit_price_cents: 8000,
      },
    ]);

    expect(totals).toEqual({
      subtotal_cents: 33000,
      gst_cents: 3300,
      total_cents: 36300,
    });
  });

  it('returns calculated line items with GST stored separately', () => {
    const calculated = calculateInvoiceLineItemTotals([
      {
        description: 'Walls',
        quantity: 1.5,
        unit_price_cents: 10000,
      },
    ]);

    expect(calculated).toEqual({
      line_items: [
        {
          description: 'Walls',
          quantity: 1.5,
          unit_price_cents: 10000,
          total_cents: 15000,
          gst_cents: 1500,
          sort_order: 0,
        },
      ],
      subtotal_cents: 15000,
      gst_cents: 1500,
      total_cents: 16500,
    });
  });

  it('parses and normalizes invoice create input', () => {
    const parsed = parseInvoiceCreateInput({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: '',
      status: 'draft',
      invoice_type: 'full',
      business_abn: '',
      payment_terms: '  Payment due within 7 days  ',
      bank_details: '  BSB: 123-456  ',
      due_date: '2026-04-05',
      paid_date: '',
      payment_method: '',
      notes: '  Paint entry hallway  ',
      line_items: [
        {
          description: '  Prep and paint  ',
          quantity: 1,
          unit_price_cents: 42000,
        },
      ],
    });

    expect(parsed).toEqual({
      success: true,
      data: {
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
        quote_id: null,
        status: 'draft',
        invoice_type: 'full',
        business_abn: null,
        payment_terms: 'Payment due within 7 days',
        bank_details: 'BSB: 123-456',
        due_date: '2026-04-05',
        paid_date: null,
        payment_method: null,
        notes: 'Paint entry hallway',
        line_items: [
          {
            description: 'Prep and paint',
            quantity: 1,
            unit_price_cents: 42000,
          },
        ],
      },
    });
  });

  it('requires a paid date when status is paid', () => {
    const parsed = parseInvoiceCreateInput({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: '',
      status: 'paid',
      invoice_type: 'full',
      business_abn: '',
      payment_terms: '',
      bank_details: '',
      due_date: '2026-04-05',
      paid_date: '',
      payment_method: 'card',
      notes: '',
      line_items: [
        {
          description: 'Prep and paint',
          quantity: 1,
          unit_price_cents: 42000,
        },
      ],
    });

    expect(parsed).toEqual({
      success: false,
      error: 'Paid date is required when status is paid',
    });
  });

  it('requires a payment method when status is paid', () => {
    const parsed = parseInvoiceCreateInput({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: '',
      status: 'paid',
      invoice_type: 'full',
      business_abn: '',
      payment_terms: '',
      bank_details: '',
      due_date: '2026-04-05',
      paid_date: '2026-04-05',
      payment_method: '',
      notes: '',
      line_items: [
        {
          description: 'Prep and paint',
          quantity: 1,
          unit_price_cents: 42000,
        },
      ],
    });

    expect(parsed).toEqual({
      success: false,
      error: 'Payment method is required when status is paid',
    });
  });

  it('accepts a blank due date for draft invoices', () => {
    const parsed = parseInvoiceCreateInput({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: '',
      status: 'draft',
      invoice_type: 'full',
      business_abn: '',
      payment_terms: '',
      bank_details: '',
      due_date: '',
      paid_date: '',
      payment_method: '',
      notes: '',
      line_items: [
        {
          description: 'Prep and paint',
          quantity: 1,
          unit_price_cents: 42000,
        },
      ],
    });

    expect(parsed).toEqual({
      success: true,
      data: {
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
        quote_id: null,
        status: 'draft',
        invoice_type: 'full',
        business_abn: null,
        payment_terms: null,
        bank_details: null,
        due_date: null,
        paid_date: null,
        payment_method: null,
        notes: null,
        line_items: [
          {
            description: 'Prep and paint',
            quantity: 1,
            unit_price_cents: 42000,
          },
        ],
      },
    });
  });

  it('formats a customer address from either summary or split fields', () => {
    expect(
      formatCustomerAddress({
        address: '12 Harbour St, Manly, NSW 2095',
      })
    ).toBe('12 Harbour St, Manly, NSW 2095');

    expect(
      formatCustomerAddress({
        id: '1',
        name: 'Client',
        email: null,
        phone: null,
        address_line1: '12 Harbour St',
        city: 'Manly',
        state: 'NSW',
        postcode: '2095',
      })
    ).toBe('12 Harbour St, Manly, NSW, 2095');
  });

  it('builds quote-linked invoice state including edit-lock count and billed subtotal', () => {
    const stateByQuoteId = buildQuoteInvoiceLinkStateMap([
      {
        quote_id: 'quote-1',
        subtotal_cents: 40000,
        total_cents: 44000,
        status: 'draft',
      },
      {
        quote_id: 'quote-1',
        subtotal_cents: 10000,
        total_cents: 11000,
        status: 'cancelled',
      },
      {
        quote_id: 'quote-2',
        subtotal_cents: 25000,
        total_cents: 27500,
        status: 'sent',
      },
    ]);

    expect(stateByQuoteId.get('quote-1')).toEqual({
      linked_invoice_count: 2,
      has_linked_invoices: true,
      billed_subtotal_cents: 40000,
      billed_total_cents: 44000,
    });
    expect(stateByQuoteId.get('quote-2')).toEqual({
      linked_invoice_count: 1,
      has_linked_invoices: true,
      billed_subtotal_cents: 25000,
      billed_total_cents: 27500,
    });
  });

  it('builds stage labels for quote-linked invoices in creation order', () => {
    const stageByInvoiceId = buildQuoteInvoiceStageMap([
      {
        id: 'invoice-2',
        quote_id: 'quote-1',
        created_at: '2026-04-11T10:00:00.000Z',
      },
      {
        id: 'invoice-1',
        quote_id: 'quote-1',
        created_at: '2026-04-10T10:00:00.000Z',
      },
      {
        id: 'invoice-3',
        quote_id: 'quote-2',
        created_at: '2026-04-12T10:00:00.000Z',
      },
    ]);

    expect(stageByInvoiceId.get('invoice-1')).toBe('1/2');
    expect(stageByInvoiceId.get('invoice-2')).toBe('2/2');
    expect(stageByInvoiceId.get('invoice-3')).toBe('1/1');
  });

  it('automatically resolves sent invoices past the due date as overdue', () => {
    expect(
      resolveInvoiceStatus('sent', '2026-04-10', null, new Date('2026-04-13T09:00:00.000Z'))
    ).toBe('overdue');
  });

  it('keeps sent invoices as sent when the due date has not passed yet', () => {
    expect(
      resolveInvoiceStatus('sent', '2026-04-15', null, new Date('2026-04-13T09:00:00.000Z'))
    ).toBe('sent');
  });
});
