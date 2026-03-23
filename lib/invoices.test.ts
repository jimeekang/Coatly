import { describe, expect, it } from 'vitest';
import {
  calculateInvoiceTotals,
  formatCustomerAddress,
  parseInvoiceCreateInput,
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

  it('parses and normalizes invoice create input', () => {
    const parsed = parseInvoiceCreateInput({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: '',
      status: 'draft',
      invoice_type: 'full',
      due_date: '2026-04-05',
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
        due_date: '2026-04-05',
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
});
