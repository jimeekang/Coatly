import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  createAdminClientMock,
  getBusinessDocumentBrandingMock,
  createStorageObjectDataUrlMock,
  renderToBufferMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  getBusinessDocumentBrandingMock: vi.fn(),
  createStorageObjectDataUrlMock: vi.fn(),
  renderToBufferMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/lib/businesses', () => ({
  getBusinessDocumentBranding: getBusinessDocumentBrandingMock,
}));

vi.mock('@/lib/supabase/storage', () => ({
  createStorageObjectDataUrl: createStorageObjectDataUrlMock,
}));

vi.mock('@react-pdf/renderer', async () => {
  const actual = await vi.importActual<typeof import('@react-pdf/renderer')>(
    '@react-pdf/renderer'
  );

  return {
    ...actual,
    renderToBuffer: renderToBufferMock,
  };
});

import { GET } from '@/app/api/pdf/invoice/route';

const INVOICE_ROW = {
  id: 'invoice-1',
  user_id: 'owner-1',
  customer_id: 'customer-1',
  quote_id: null,
  invoice_number: 'INV-0001',
  status: 'sent',
  invoice_type: 'full',
  subtotal_cents: 100000,
  gst_cents: 10000,
  total_cents: 110000,
  amount_paid_cents: 0,
  business_abn: null,
  payment_terms: 'Payment due within 7 days',
  bank_details: null,
  due_date: '2026-04-30',
  paid_date: null,
  paid_at: null,
  payment_method: null,
  notes: null,
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
  customer: {
    id: 'customer-1',
    name: 'Client One',
    email: 'client@example.com',
    phone: null,
    address_line1: '12 Test St',
    city: 'Sydney',
    state: 'NSW',
    postcode: '2000',
  },
  line_items: [
    {
      id: 'line-1',
      invoice_id: 'invoice-1',
      description: 'Interior repaint',
      quantity: 1,
      unit_price_cents: 100000,
      gst_cents: 10000,
      total_cents: 100000,
      sort_order: 0,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-01T00:00:00.000Z',
    },
  ],
};

function createInvoicePdfClient() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: INVOICE_ROW,
              error: null,
            }),
          }),
        };
      }

      return {
        select: vi.fn(),
      };
    }),
  };
}

describe('/api/pdf/invoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderToBufferMock.mockResolvedValue(Buffer.from('%PDF-1.4'));
    getBusinessDocumentBrandingMock.mockResolvedValue({
      data: {
        name: 'Paint Co',
        abn: null,
        phone: null,
        email: 'owner@example.com',
        logoPath: null,
      },
    });
    createStorageObjectDataUrlMock.mockResolvedValue(null);
  });

  it('creates an invoice PDF from a public share token without login', async () => {
    createAdminClientMock.mockReturnValue(createInvoicePdfClient());

    const response = await GET(
      new Request(
        'http://localhost/api/pdf/invoice?token=11111111-1111-4111-8111-111111111111'
      ) as NextRequest
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(createServerClientMock).not.toHaveBeenCalled();
    expect(createAdminClientMock).toHaveBeenCalledOnce();
    expect(renderToBufferMock).toHaveBeenCalledOnce();
  });

  it('rejects malformed public share tokens before creating an admin client', async () => {
    const response = await GET(
      new Request('http://localhost/api/pdf/invoice?token=not-a-token') as NextRequest
    );

    expect(response.status).toBe(404);
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });
});
