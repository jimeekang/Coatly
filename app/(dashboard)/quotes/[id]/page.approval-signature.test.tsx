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

const SIGNATURE_DATA_URL = 'data:image/png;base64,c2lnbmF0dXJl';

describe('QuoteDetailPage approval signature', () => {
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
        status: 'approved',
        public_share_token: 'public-token',
        approved_at: '2026-05-02T00:00:00.000Z',
        approved_by_name: 'Sarah Johnson',
        approved_by_email: 'client@example.com',
        approval_signature: SIGNATURE_DATA_URL,
        has_linked_invoices: false,
        customer_email: 'client@example.com',
        labour_margin_percent: 0,
        material_margin_percent: 0,
        subtotal_cents: 100000,
        gst_cents: 10000,
        total_cents: 110000,
        valid_until: '2026-05-30',
        created_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-01T00:00:00.000Z',
        notes: null,
        internal_notes: null,
        rooms: [],
        estimate_items: [],
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

  it('renders a saved data URL signature as an image', async () => {
    render(
      await QuoteDetailPage({
        params: Promise.resolve({ id: 'quote-1' }),
      })
    );

    expect(
      screen.getByRole('img', { name: 'Signature by Sarah Johnson' })
    ).toHaveAttribute('src', SIGNATURE_DATA_URL);
  });
});
