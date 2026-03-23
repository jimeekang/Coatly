import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redirectMock, createServerClientMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  createServerClientMock: vi.fn(),
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

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/lib/subscription/access', () => ({
  getActiveSubscriptionRequiredMessage: getActiveSubscriptionRequiredMessageMock,
  getSubscriptionSnapshotForUser: getSubscriptionSnapshotForUserMock,
}));

import { createInvoice } from '@/app/actions/invoices';

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
      due_date: null,
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
      due_date: '2026-04-03',
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
      due_date: '2026-04-03',
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
      subtotal_cents: 25000,
      gst_cents: 2500,
      total_cents: 27500,
      amount_paid_cents: 0,
      due_date: '2026-04-03',
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

  it('rejects a quote that does not match the selected customer', async () => {
    const customersQuery = createFilterQuery({
      data: { id: 'customer-1' },
      error: null,
    });

    const quotesQuery = createFilterQuery({
      data: { id: 'quote-1', customer_id: 'different-customer' },
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
      status: 'sent',
      due_date: '2026-04-03',
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
});
