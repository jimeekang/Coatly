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

import { GET } from '@/app/api/pdf/quote/route';

const QUOTE_ROW = {
  id: 'quote-1',
  user_id: 'owner-1',
  customer_id: 'customer-1',
  customer_email: 'client@example.com',
  customer_address: '12 Test St',
  quote_number: 'QUO-0001',
  title: 'Exterior repaint',
  status: 'sent',
  valid_until: '2026-05-27',
  tier: null,
  notes: null,
  internal_notes: null,
  labour_margin_percent: 0,
  material_margin_percent: 0,
  subtotal_cents: 10000,
  gst_cents: 1000,
  total_cents: 11000,
  created_at: '2026-04-27T00:00:00.000Z',
  updated_at: '2026-04-27T00:00:00.000Z',
  customer: {
    id: 'customer-1',
    name: 'Client One',
    company_name: null,
    email: 'client@example.com',
    phone: null,
    address_line1: '12 Test St',
    address_line2: null,
    city: 'Sydney',
    state: 'NSW',
    postcode: '2000',
  },
};

function createQuotePdfClient() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'quotes') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: QUOTE_ROW,
              error: null,
            }),
          }),
        };
      }

      if (table === 'quote_rooms') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }

      if (table === 'quote_line_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
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

describe('/api/pdf/quote', () => {
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

  it('creates a quote PDF from a public share token without login', async () => {
    createAdminClientMock.mockReturnValue(createQuotePdfClient());
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const response = await GET(
      new Request(
        'http://localhost/api/pdf/quote?token=11111111-1111-4111-8111-111111111111'
      ) as NextRequest
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(createAdminClientMock).toHaveBeenCalledOnce();
    expect(renderToBufferMock).toHaveBeenCalledOnce();
  });
});
