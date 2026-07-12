import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redirectMock, revalidatePathMock, createServerClientMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  createServerClientMock: vi.fn(),
}));
const { getSubscriptionSnapshotForUserMock } = vi.hoisted(() => ({
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

vi.mock('@/modules/billing/application/access', () => ({
  getActiveSubscriptionRequiredMessage: vi.fn(),
  getSubscriptionSnapshotForUser: getSubscriptionSnapshotForUserMock,
}));

vi.mock('@/modules/settings/application/business-branding', () => ({
  getBusinessDocumentBranding: vi.fn(),
  getBusinessInvoiceDefaults: vi.fn(),
}));

vi.mock('@/lib/supabase/storage', () => ({
  createStorageObjectDataUrl: vi.fn(),
}));

vi.mock('@/lib/email/resend', () => ({
  sendInvoiceEmail: vi.fn(),
}));

vi.mock('@/lib/supabase/request-context', () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock('@/modules/invoices/infrastructure/pdf/invoice-template', () => ({
  InvoiceTemplate: vi.fn(),
}));

vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn(),
}));

import { createInvoice } from '@/modules/invoices/application/actions';

function createFilterQuery<Result>(result: Result) {
  return {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  };
}

describe('createInvoice totals recalculation', () => {
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

  it('returns the totals RPC error instead of reporting a successful save', async () => {
    const invoiceDeleteEqMock = vi.fn().mockReturnThis();
    const invoiceDeleteMock = vi.fn(() => ({ eq: invoiceDeleteEqMock }));
    const rpcMock = vi.fn(async (functionName: string) => {
      if (functionName === 'generate_invoice_number') {
        return { data: 'INV-0099', error: null };
      }

      if (functionName === 'calculate_invoice_totals') {
        return { data: null, error: { message: 'Invoice totals could not be recalculated.' } };
      }

      throw new Error(`Unexpected RPC ${functionName}`);
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
            select: vi.fn().mockReturnValue(
              createFilterQuery({ data: { id: 'customer-1' }, error: null })
            ),
          };
        }

        if (table === 'invoices') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'invoice-1' }, error: null }),
              }),
            }),
            delete: invoiceDeleteMock,
          };
        }

        if (table === 'invoice_line_items') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: rpcMock,
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
      notes: null,
      line_items: [
        {
          description: 'Interior repaint',
          quantity: 1,
          unit_price_cents: 50000,
        },
      ],
    });

    expect(result).toEqual({ error: 'Invoice totals could not be recalculated.' });
    expect(rpcMock).toHaveBeenCalledWith('calculate_invoice_totals', {
      invoice_uuid: 'invoice-1',
    });
    expect(invoiceDeleteMock).toHaveBeenCalledOnce();
    expect(invoiceDeleteEqMock).toHaveBeenNthCalledWith(1, 'id', 'invoice-1');
    expect(invoiceDeleteEqMock).toHaveBeenNthCalledWith(2, 'user_id', 'user-1');
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
