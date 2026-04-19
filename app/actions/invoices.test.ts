import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redirectMock, createServerClientMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  createServerClientMock: vi.fn(),
}));
const { revalidatePathMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
}));
const {
  getActiveSubscriptionRequiredMessageMock,
  getSubscriptionSnapshotForUserMock,
} = vi.hoisted(() => ({
  getActiveSubscriptionRequiredMessageMock: vi.fn(
    (actionName: string) =>
      `Choose a paid plan to unlock ${actionName}. Finish checkout before using Coatly tools.`
  ),
  getSubscriptionSnapshotForUserMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/lib/subscription/access', () => ({
  getActiveSubscriptionRequiredMessage: getActiveSubscriptionRequiredMessageMock,
  getSubscriptionSnapshotForUser: getSubscriptionSnapshotForUserMock,
}));

import {
  createInvoice,
  getInvoiceDraftFromQuote,
  markInvoiceAsPaid,
  updateInvoice,
} from '@/app/actions/invoices';

function createFilterQuery<Result>(result: Result) {
  return {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    order: vi.fn().mockResolvedValue(result),
  };
}

describe('createInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSubscriptionSnapshotForUserMock.mockResolvedValue({
      plan: 'pro',
      status: 'active',
      active: true,
      cancelScheduled: false,
      features: {
        ai: true,
        xeroSync: true,
        jobCosting: true,
        prioritySupport: true,
        unlimitedQuotes: true,
        activeQuoteLimit: null,
      },
    });
  });

  it('returns a validation error for an invalid payload', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    });

    const result = await createInvoice({
      customer_id: '',
      quote_id: null,
      invoice_type: 'full',
      status: 'draft',
      business_abn: null,
      payment_terms: null,
      bank_details: null,
      due_date: null,
      paid_date: null,
      payment_method: null,
      notes: null,
      line_items: [],
    });

    expect(result).toEqual({ error: 'Select a customer' });
  });

  it('blocks invoice creation when there is no active subscription', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    });
    getSubscriptionSnapshotForUserMock.mockResolvedValue({
      plan: 'starter',
      status: 'none',
      active: false,
      cancelScheduled: false,
      features: {
        ai: false,
        xeroSync: false,
        jobCosting: false,
        prioritySupport: false,
        unlimitedQuotes: false,
        activeQuoteLimit: 10,
      },
    });

    const result = await createInvoice({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: null,
      invoice_type: 'full',
      status: 'draft',
      business_abn: null,
      payment_terms: null,
      bank_details: null,
      due_date: '2026-04-03',
      paid_date: null,
      payment_method: null,
      notes: null,
      line_items: [
        {
          description: 'Interior repaint',
          quantity: 2,
          unit_price_cents: 12500,
        },
      ],
    });

    expect(result).toEqual({
      error:
        'Choose a paid plan to unlock invoice creation. Finish checkout before using Coatly tools.',
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('creates an invoice and redirects to the detail page', async () => {
    const captured: {
      invoiceInsert?: Record<string, unknown>;
      lineItemsInsert?: Array<Record<string, unknown>>;
    } = {};

    const customersQuery = createFilterQuery({
      data: { id: 'customer-1' },
      error: null,
    });

    const invoiceInsertResult = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'invoice-1' },
          error: null,
        }),
      }),
    };

    const deleteQuery = {
      eq: vi.fn().mockReturnThis(),
    };

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(customersQuery),
          };
        }

        if (table === 'invoices') {
          return {
            insert: vi.fn((payload) => {
              captured.invoiceInsert = payload;
              return invoiceInsertResult;
            }),
            delete: vi.fn().mockReturnValue(deleteQuery),
          };
        }

        if (table === 'invoice_line_items') {
          return {
            insert: vi.fn(async (payload) => {
              captured.lineItemsInsert = payload;
              return { error: null };
            }),
          };
        }

        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(
              createFilterQuery({
                data: null,
                error: null,
              })
            ),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === 'generate_invoice_number') {
          return { data: 'INV-0007', error: null };
        }

        if (fn === 'calculate_invoice_totals') {
          return { data: null, error: null };
        }

        throw new Error(`Unexpected rpc ${fn}`);
      }),
    });

    const result = await createInvoice({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: null,
      invoice_type: 'full',
      status: 'draft',
      business_abn: '12345678901',
      payment_terms: 'Payment due within 7 days',
      bank_details: 'BSB: 123-456\nAccount Number: 12345678',
      due_date: '2026-04-03',
      paid_date: null,
      payment_method: null,
      notes: 'Final coat and trim',
      line_items: [
        {
          description: 'Interior repaint',
          quantity: 2,
          unit_price_cents: 12500,
        },
      ],
    });

    expect(result).toBeUndefined();
    expect(captured.invoiceInsert).toMatchObject({
      user_id: 'user-1',
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      invoice_number: 'INV-0007',
      business_abn: '12345678901',
      payment_terms: 'Payment due within 7 days',
      bank_details: 'BSB: 123-456\nAccount Number: 12345678',
      subtotal_cents: 25000,
      gst_cents: 2500,
      total_cents: 27500,
      amount_paid_cents: 0,
      due_date: '2026-04-03',
      paid_date: null,
      paid_at: null,
      payment_method: null,
    });
    expect(captured.lineItemsInsert).toEqual([
      {
        invoice_id: 'invoice-1',
        description: 'Interior repaint',
        quantity: 2,
        unit_price_cents: 12500,
        gst_cents: 2500,
        total_cents: 25000,
        sort_order: 0,
      },
    ]);
    expect(redirectMock).toHaveBeenCalledWith('/invoices/invoice-1');
  });

  it('allows creating a draft invoice without a due date', async () => {
    const captured: {
      invoiceInsert?: Record<string, unknown>;
    } = {};

    const customersQuery = createFilterQuery({
      data: { id: 'customer-1' },
      error: null,
    });

    const invoiceInsertResult = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'invoice-no-due-date' },
          error: null,
        }),
      }),
    };

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(customersQuery),
          };
        }

        if (table === 'invoices') {
          return {
            insert: vi.fn((payload) => {
              captured.invoiceInsert = payload;
              return invoiceInsertResult;
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
            }),
          };
        }

        if (table === 'invoice_line_items') {
          return {
            insert: vi.fn(async () => ({ error: null })),
          };
        }

        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(
              createFilterQuery({
                data: null,
                error: null,
              })
            ),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === 'generate_invoice_number') {
          return { data: 'INV-0009', error: null };
        }

        if (fn === 'calculate_invoice_totals') {
          return { data: null, error: null };
        }

        throw new Error(`Unexpected rpc ${fn}`);
      }),
    });

    const result = await createInvoice({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: null,
      invoice_type: 'full',
      status: 'draft',
      business_abn: null,
      payment_terms: null,
      bank_details: null,
      due_date: null,
      paid_date: null,
      payment_method: null,
      notes: 'Awaiting scheduling',
      line_items: [
        {
          description: 'Interior repaint',
          quantity: 1,
          unit_price_cents: 50000,
        },
      ],
    });

    expect(result).toBeUndefined();
    expect(captured.invoiceInsert).toMatchObject({
      due_date: null,
      subtotal_cents: 50000,
      gst_cents: 5000,
      total_cents: 55000,
    });
    expect(redirectMock).toHaveBeenCalledWith('/invoices/invoice-no-due-date');
  });

  it('rejects a quote that does not match the selected customer', async () => {
    const customersQuery = createFilterQuery({
      data: { id: 'customer-1' },
      error: null,
    });

    const quotesQuery = createFilterQuery({
      data: { id: 'quote-1', customer_id: 'different-customer', status: 'approved' },
      error: null,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(customersQuery),
          };
        }

        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(quotesQuery),
          };
        }

        if (table === 'invoices') {
          return {
            insert: vi.fn(),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(),
    });

    const result = await createInvoice({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: '550e8400-e29b-41d4-a716-446655440001',
      invoice_type: 'progress',
      status: 'draft',
      business_abn: null,
      payment_terms: null,
      bank_details: null,
      due_date: '2026-04-03',
      paid_date: null,
      payment_method: null,
      notes: null,
      line_items: [
        {
          description: 'Progress payment',
          quantity: 1,
          unit_price_cents: 50000,
        },
      ],
    });

    expect(result).toEqual({
      error: 'Quote customer does not match the selected customer.',
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('rejects a quote link when the quote is not approved', async () => {
    const customersQuery = createFilterQuery({
      data: { id: 'customer-1' },
      error: null,
    });

    const quotesQuery = createFilterQuery({
      data: { id: 'quote-1', customer_id: 'customer-1', status: 'sent' },
      error: null,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(customersQuery),
          };
        }

        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(quotesQuery),
          };
        }

        if (table === 'invoices') {
          return {
            insert: vi.fn(),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(),
    });

    const result = await createInvoice({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: '550e8400-e29b-41d4-a716-446655440001',
      invoice_type: 'progress',
      status: 'draft',
      business_abn: null,
      payment_terms: null,
      bank_details: null,
      due_date: '2026-04-03',
      paid_date: null,
      payment_method: null,
      notes: null,
      line_items: [
        {
          description: 'Progress payment',
          quantity: 1,
          unit_price_cents: 50000,
        },
      ],
    });

    expect(result).toEqual({
      error: 'Only approved quotes can be linked to invoices.',
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('rejects sent status during manual invoice creation', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    });

    const result = await createInvoice({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: null,
      invoice_type: 'deposit',
      status: 'sent',
      business_abn: null,
      payment_terms: null,
      bank_details: null,
      due_date: '2026-04-03',
      paid_date: null,
      payment_method: null,
      notes: null,
      line_items: [
        {
          description: 'Deposit claim',
          quantity: 1,
          unit_price_cents: 50000,
        },
      ],
    });

    expect(result).toEqual({
      error:
        'Save invoices as draft, paid, or cancelled here. Sent is set after the invoice email is sent, and overdue follows automatically after the due date passes.',
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('builds an invoice draft from an approved quote and selected line items', async () => {
    const quoteQuery = createFilterQuery({
      data: {
        id: 'quote-1',
        customer_id: 'customer-1',
        status: 'approved',
        title: 'Cafe repaint',
        quote_number: 'QUO-0010',
      },
      error: null,
    });
    const lineItemsQuery = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'line-1',
            name: 'Interior repaint',
            notes: 'Walls and ceiling',
            quantity: 2,
            unit_price_cents: 12500,
            is_optional: false,
            is_selected: true,
            sort_order: 0,
          },
          {
            id: 'line-2',
            name: 'Optional trim work',
            notes: null,
            quantity: 1,
            unit_price_cents: 8000,
            is_optional: true,
            is_selected: false,
            sort_order: 1,
          },
        ],
        error: null,
      }),
    };
    const businessesQuery = createFilterQuery({
      data: {
        user_id: 'user-1',
        name: 'Coatly',
        abn: '12345678901',
        address: '128 Beach Street, Manly NSW 2095',
        address_line1: '128 Beach Street',
        city: 'Manly',
        state: 'NSW',
        postcode: '2095',
        phone: '0412 555 012',
        email: 'owner@example.com',
        invoice_payment_terms: 'Payment due within 7 days',
        invoice_bank_details: 'BSB: 123-456\nAccount Number: 12345678',
        logo_url: null,
      },
      error: null,
    });
    const profilesQuery = createFilterQuery({
      data: null,
      error: null,
    });
    const linkedInvoicesQuery = {
      data: [
        {
          quote_id: 'quote-1',
          subtotal_cents: 25000,
          status: 'draft',
        },
      ],
      error: null,
      eq: vi.fn().mockReturnThis(),
    };

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(quoteQuery),
          };
        }
        if (table === 'quote_line_items') {
          return {
            select: vi.fn().mockReturnValue(lineItemsQuery),
          };
        }
        if (table === 'businesses') {
          return {
            select: vi.fn().mockReturnValue(businessesQuery),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue(profilesQuery),
          };
        }
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue(linkedInvoicesQuery),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(),
    });

    const result = await getInvoiceDraftFromQuote('quote-1');

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      customer_id: 'customer-1',
      quote_id: 'quote-1',
      invoice_type: 'full',
      status: 'draft',
      business_abn: '12345678901',
      payment_terms: 'Payment due within 7 days',
      bank_details: 'BSB: 123-456\nAccount Number: 12345678',
      due_date: null,
      paid_date: null,
      payment_method: null,
      linked_invoice_count: 1,
      has_linked_invoices: true,
      notes: 'Linked to approved quote QUO-0010 - Cafe repaint',
      line_items: [
        {
          description: 'Interior repaint\nWalls and ceiling',
          quantity: 2,
          unit_price_cents: 12500,
        },
      ],
    });
  });

  it('stores payment tracking when a paid invoice is created', async () => {
    const captured: {
      invoiceInsert?: Record<string, unknown>;
      lineItemsInsert?: Array<Record<string, unknown>>;
    } = {};

    const customersQuery = createFilterQuery({
      data: { id: 'customer-1' },
      error: null,
    });

    const invoiceInsertResult = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'invoice-paid-1' },
          error: null,
        }),
      }),
    };

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(customersQuery),
          };
        }

        if (table === 'invoices') {
          return {
            insert: vi.fn((payload) => {
              captured.invoiceInsert = payload;
              return invoiceInsertResult;
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
            }),
          };
        }

        if (table === 'invoice_line_items') {
          return {
            insert: vi.fn(async (payload) => {
              captured.lineItemsInsert = payload;
              return { error: null };
            }),
          };
        }

        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(
              createFilterQuery({
                data: null,
                error: null,
              })
            ),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === 'generate_invoice_number') {
          return { data: 'INV-0008', error: null };
        }

        if (fn === 'calculate_invoice_totals') {
          return { data: null, error: null };
        }

        throw new Error(`Unexpected rpc ${fn}`);
      }),
    });

    const result = await createInvoice({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: null,
      invoice_type: 'full',
      status: 'paid',
      business_abn: null,
      payment_terms: 'Paid on completion',
      bank_details: null,
      due_date: '2026-04-18',
      paid_date: '2026-04-09',
      payment_method: 'card',
      notes: 'Settled on site',
      line_items: [
        {
          description: 'Final invoice',
          quantity: 1,
          unit_price_cents: 50000,
        },
      ],
    });

    expect(result).toBeUndefined();
    expect(captured.invoiceInsert).toMatchObject({
      status: 'paid',
      subtotal_cents: 50000,
      gst_cents: 5000,
      total_cents: 55000,
      amount_paid_cents: 55000,
      due_date: '2026-04-18',
      paid_date: '2026-04-09',
      paid_at: '2026-04-09T12:00:00.000Z',
      payment_method: 'card',
    });
    expect(captured.lineItemsInsert).toEqual([
      {
        invoice_id: 'invoice-paid-1',
        description: 'Final invoice',
        quantity: 1,
        unit_price_cents: 50000,
        gst_cents: 5000,
        total_cents: 50000,
        sort_order: 0,
      },
    ]);
    expect(redirectMock).toHaveBeenCalledWith('/invoices/invoice-paid-1');
  });
});

describe('markInvoiceAsPaid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSubscriptionSnapshotForUserMock.mockResolvedValue({
      plan: 'pro',
      status: 'active',
      active: true,
      cancelScheduled: false,
      features: {
        ai: true,
        xeroSync: true,
        jobCosting: true,
        prioritySupport: true,
        unlimitedQuotes: true,
        activeQuoteLimit: null,
      },
    });
  });

  it('stores payment tracking and redirects back to the invoice detail page', async () => {
    let invoiceUpdatePayload: Record<string, unknown> | undefined;

    const invoiceQuery = createFilterQuery({
      data: {
        id: 'invoice-1',
        user_id: 'user-1',
        quote_id: 'quote-1',
        status: 'sent',
        total_cents: 27500,
      },
      error: null,
    });

    const updateQuery = {
      eq: vi.fn().mockReturnThis(),
    };

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue(invoiceQuery),
            update: vi.fn((payload) => {
              invoiceUpdatePayload = payload;
              return updateQuery;
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(),
    });

    const result = await markInvoiceAsPaid('invoice-1', {
      paid_date: '2026-04-13',
      payment_method: 'bank_transfer',
    });

    expect(result).toBeUndefined();
    expect(invoiceUpdatePayload).toEqual({
      status: 'paid',
      amount_paid_cents: 27500,
      paid_date: '2026-04-13',
      paid_at: '2026-04-13T12:00:00.000Z',
      payment_method: 'bank_transfer',
    });
    expect(redirectMock).toHaveBeenCalledWith('/invoices/invoice-1');
  });

  it('rejects draft invoices before updating payment tracking', async () => {
    const invoiceQuery = createFilterQuery({
      data: {
        id: 'invoice-1',
        user_id: 'user-1',
        quote_id: null,
        status: 'draft',
        total_cents: 27500,
      },
      error: null,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue(invoiceQuery),
            update: vi.fn(),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(),
    });

    const result = await markInvoiceAsPaid('invoice-1', {
      paid_date: '2026-04-13',
      payment_method: 'card',
    });

    expect(result).toEqual({
      error: 'Draft invoices must be sent before they can be marked as paid.',
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('rejects invalid paid date values before updating payment tracking', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    });

    const result = await markInvoiceAsPaid('invoice-1', {
      paid_date: 'not-a-date',
      payment_method: 'card',
    });

    expect(result).toEqual({
      error: 'Paid date must be a valid date.',
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe('updateInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSubscriptionSnapshotForUserMock.mockResolvedValue({
      plan: 'pro',
      status: 'active',
      active: true,
      cancelScheduled: false,
      features: {
        ai: true,
        xeroSync: true,
        jobCosting: true,
        prioritySupport: true,
        unlimitedQuotes: true,
        activeQuoteLimit: null,
      },
    });
  });

  it('blocks edits once an invoice has been sent', async () => {
    const existingInvoiceQuery = createFilterQuery({
      data: { id: 'invoice-1', user_id: 'user-1', status: 'sent' },
      error: null,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue(existingInvoiceQuery),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(),
    });

    const result = await updateInvoice('invoice-1', {
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: null,
      invoice_type: 'full',
      status: 'sent',
      business_abn: null,
      payment_terms: null,
      bank_details: null,
      due_date: '2026-04-18',
      paid_date: null,
      payment_method: null,
      notes: null,
      line_items: [
        {
          description: 'Final invoice',
          quantity: 1,
          unit_price_cents: 50000,
        },
      ],
    });

    expect(result).toEqual({ error: 'Only draft invoices can be edited.' });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('updates a draft invoice and preserves an optional empty due date', async () => {
    const captured: {
      invoiceUpdate?: Record<string, unknown>;
      lineItemsInsert?: Array<Record<string, unknown>>;
    } = {};

    const existingInvoiceQuery = createFilterQuery({
      data: { id: 'invoice-1', user_id: 'user-1', status: 'draft' },
      error: null,
    });
    const customersQuery = createFilterQuery({
      data: { id: 'customer-1' },
      error: null,
    });

    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@example.com' } },
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue(existingInvoiceQuery),
            update: vi.fn((payload) => {
              captured.invoiceUpdate = payload;
              return {
                eq: vi.fn().mockReturnThis(),
              };
            }),
          };
        }

        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnValue(customersQuery),
          };
        }

        if (table === 'invoice_line_items') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
            insert: vi.fn(async (payload) => {
              captured.lineItemsInsert = payload;
              return { error: null };
            }),
          };
        }

        if (table === 'quotes') {
          return {
            select: vi.fn().mockReturnValue(
              createFilterQuery({
                data: null,
                error: null,
              })
            ),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: vi.fn(async (fn: string) => {
        if (fn === 'calculate_invoice_totals') {
          return { data: null, error: null };
        }

        throw new Error(`Unexpected rpc ${fn}`);
      }),
    });

    const result = await updateInvoice('invoice-1', {
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      quote_id: null,
      invoice_type: 'progress',
      status: 'draft',
      business_abn: null,
      payment_terms: 'Payment on completion',
      bank_details: null,
      due_date: null,
      paid_date: null,
      payment_method: null,
      notes: 'Second stage invoice',
      line_items: [
        {
          description: 'Progress payment',
          quantity: 1.5,
          unit_price_cents: 20000,
        },
      ],
    });

    expect(result).toBeUndefined();
    expect(captured.invoiceUpdate).toMatchObject({
      invoice_type: 'progress',
      due_date: null,
      subtotal_cents: 30000,
      gst_cents: 3000,
      total_cents: 33000,
    });
    expect(captured.lineItemsInsert).toEqual([
      {
        invoice_id: 'invoice-1',
        description: 'Progress payment',
        quantity: 1.5,
        unit_price_cents: 20000,
        gst_cents: 3000,
        total_cents: 30000,
        sort_order: 0,
      },
    ]);
    expect(redirectMock).toHaveBeenCalledWith('/invoices/invoice-1');
  });
});
