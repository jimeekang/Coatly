import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  createAdminClientMock,
  getBusinessDocumentBrandingMock,
  createStorageObjectDataUrlMock,
  renderToBufferMock,
  quoteTemplateMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  getBusinessDocumentBrandingMock: vi.fn(),
  createStorageObjectDataUrlMock: vi.fn(),
  renderToBufferMock: vi.fn(),
  quoteTemplateMock: vi.fn(() => ({ type: 'QuoteTemplate' })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/modules/settings/infrastructure/businesses', () => ({
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

vi.mock('@/lib/pdf/quote-template', () => ({
  QuoteTemplate: quoteTemplateMock,
}));

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
  manual_adjustment_cents: 0,
  discount_cents: 0,
  deposit_percent: 10,
  working_days: 2,
  job_type: 'maintenance',
  estimate_category: 'manual',
  property_type: null,
  estimate_mode: null,
  estimate_context: {},
  pricing_snapshot: {},
  pricing_method: 'day_rate',
  pricing_method_inputs: {
    method: 'day_rate',
    inputs: {
      days: 1,
      daily_rate_cents: 10000,
      material_method: 'flat',
      material_flat_cents: 0,
    },
  },
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

      if (table === 'quote_estimate_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'estimate-1',
                    quote_id: 'quote-1',
                    category: 'quick_estimate',
                    label: 'Bedroom ceiling repaint',
                    quantity: 1,
                    unit: 'job',
                    unit_price_cents: 10000,
                    total_cents: 10000,
                    metadata: {},
                    sort_order: 0,
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'quote_scope_sections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'scope-1',
                    quote_id: 'quote-1',
                    section_kind: 'maintenance',
                    title: 'Water damage repaint',
                    description: 'Stain block and repaint affected ceiling.',
                    area_label: 'Bedroom ceiling',
                    surface_category: 'ceiling',
                    is_optional: false,
                    is_selected: true,
                    pricing_status: 'to_confirm',
                    measurement_status: 'photo_hint',
                    source: 'manual',
                    metadata: {
                      maintenance_job_pack: 'water_damage_repaint',
                      report_context: true,
                    },
                    sort_order: 0,
                    created_at: '2026-04-27T00:00:00.000Z',
                    updated_at: '2026-04-27T00:00:00.000Z',
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'quote_scope_steps') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'step-1',
                    section_id: 'scope-1',
                    step_type: 'prep',
                    label: 'Prepare stain',
                    description: 'Apply stain blocker before repainting.',
                    prep_type: null,
                    paint_system: null,
                    coats_min: 1,
                    coats_max: 1,
                    product_name: null,
                    colour_status: null,
                    colour: null,
                    sheen: null,
                    requires_confirmation: false,
                    is_customer_visible: true,
                    metadata: {},
                    sort_order: 0,
                    created_at: '2026-04-27T00:00:00.000Z',
                    updated_at: '2026-04-27T00:00:00.000Z',
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'quote_clause_items') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'clause-1',
                    quote_id: 'quote-1',
                    section_id: 'scope-1',
                    clause_key: 'source_repair_excluded',
                    category: 'exclusion',
                    title: 'Source repair excluded',
                    body: 'Leak repair is excluded from this quote.',
                    severity: 'warning',
                    source: 'default_library',
                    is_customer_visible: true,
                    metadata: {},
                    sort_order: 0,
                    created_at: '2026-04-27T00:00:00.000Z',
                    updated_at: '2026-04-27T00:00:00.000Z',
                  },
                ],
                error: null,
              }),
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
        abn: '12345678901',
        phone: '0412 000 111',
        email: 'owner@example.com',
        logoPath: null,
        address: '8 Painter Lane, Sydney, NSW, 2000',
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
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="quote-QUO-0001.pdf"'
    );
    expect(createAdminClientMock).toHaveBeenCalledOnce();
    expect(renderToBufferMock).toHaveBeenCalledOnce();
  });

  it('passes estimate rows, scope sections, clauses, and document branding to the PDF template', async () => {
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
    expect(quoteTemplateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        businessName: 'Paint Co',
        abn: '12345678901',
        phone: '0412 000 111',
        email: 'owner@example.com',
        businessAddress: '8 Painter Lane, Sydney, NSW, 2000',
        quote: expect.objectContaining({
          quote_number: 'QUO-0001',
          customer: expect.objectContaining({
            name: 'Client One',
            address: '12 Test St',
            email: 'client@example.com',
          }),
          estimate_items: [
            expect.objectContaining({
              label: 'Bedroom ceiling repaint',
              total_cents: 10000,
            }),
          ],
          scope_sections: [
            expect.objectContaining({
              title: 'Water damage repaint',
              report_context: true,
              steps: [
                expect.objectContaining({
                  description: 'Apply stain blocker before repainting.',
                }),
              ],
            }),
          ],
          clause_items: [
            expect.objectContaining({
              clause_key: 'source_repair_excluded',
            }),
          ],
        }),
      })
    );
  });
});
