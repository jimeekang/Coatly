import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  getBusinessRateSettingsMock,
  getLinkedInvoicesForQuoteMock,
  getQuoteMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getBusinessRateSettingsMock: vi.fn(),
  getLinkedInvoicesForQuoteMock: vi.fn(),
  getQuoteMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/modules/settings/infrastructure/businesses', () => ({
  getBusinessRateSettings: getBusinessRateSettingsMock,
}));

vi.mock('@/modules/invoices/application/actions', () => ({
  getLinkedInvoicesForQuote: getLinkedInvoicesForQuoteMock,
}));

vi.mock('@/modules/jobs/application/actions', () => ({
  createJobFromQuote: vi.fn(),
}));

vi.mock('@/modules/quotes/application/actions', () => ({
  getQuote: getQuoteMock,
  setQuoteOptionalLineItemSelection: vi.fn(),
}));

vi.mock('@/modules/quotes/ui/ProfitabilityCard', () => ({
  ProfitabilityCard: () => null,
}));

vi.mock('@/modules/quotes/ui/QuoteActions', () => ({
  QuoteActions: () => null,
}));

import QuoteDetailPage from './page';

describe('QuoteDetailPage estimate rows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    });
    getBusinessRateSettingsMock.mockResolvedValue({ data: null, error: null });
    getLinkedInvoicesForQuoteMock.mockResolvedValue({
      data: { invoices: [], summary: null },
      error: null,
    });
    getQuoteMock.mockResolvedValue({
      data: {
        id: 'quote-1',
        quote_number: 'QUO-0001',
        title: 'Cafe repaint',
        status: 'sent',
        public_share_token: 'public-token',
        approved_at: null,
        approved_by_name: null,
        approved_by_email: null,
        approval_signature: null,
        has_linked_invoices: false,
        customer_email: 'client@example.com',
        labour_margin_percent: 0,
        material_margin_percent: 0,
        subtotal_cents: 125000,
        gst_cents: 12500,
        total_cents: 137500,
        valid_until: '2026-05-30',
        created_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-01T00:00:00.000Z',
        notes: null,
        internal_notes: null,
        rooms: [],
        estimate_items: [
          {
            id: 'estimate-1',
            quote_id: 'quote-1',
            category: 'quick_estimate',
            label: 'Master Bedroom (with ensuite)',
            quantity: 1,
            unit: 'room',
            unit_price_cents: 125000,
            total_cents: 125000,
            sort_order: 0,
            metadata: {},
          },
        ],
        line_items: [],
        customer: {
          id: 'customer-1',
          name: 'Sarah Johnson',
          company_name: 'Harbor Cafe',
          email: 'client@example.com',
          phone: null,
          address: '128 Beach Street, Manly NSW 2095',
        },
      },
      error: null,
    });
  });

  it('shows priced estimate rows when no room or custom rows exist', async () => {
    render(
      await QuoteDetailPage({
        params: Promise.resolve({ id: 'quote-1' }),
      })
    );

    expect(screen.getByText('Master Bedroom (with ensuite)')).toBeInTheDocument();
  });
});
