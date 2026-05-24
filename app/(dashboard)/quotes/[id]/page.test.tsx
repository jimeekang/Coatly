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

vi.mock('@/lib/businesses', () => ({
  getBusinessRateSettings: getBusinessRateSettingsMock,
}));

vi.mock('@/app/actions/invoices', () => ({
  getLinkedInvoicesForQuote: getLinkedInvoicesForQuoteMock,
}));

vi.mock('@/app/actions/quotes', () => ({
  getQuote: getQuoteMock,
  setQuoteOptionalLineItemSelection: vi.fn(),
}));

vi.mock('@/components/quotes/ProfitabilityCard', () => ({
  ProfitabilityCard: () => <div data-testid="profitability-card" />,
}));

vi.mock('@/components/quotes/QuoteActions', () => ({
  QuoteActions: () => <div data-testid="quote-actions" />,
}));

import QuoteDetailPage from './page';

const QUOTE_DETAIL = {
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
  customer_email: 'accounts@example.com',
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
  line_items: [],
  customer: {
    id: 'customer-1',
    name: 'Sarah Johnson',
    company_name: 'Harbor Cafe',
    email: 'client@example.com',
    phone: null,
    address: '128 Beach Street, Manly NSW 2095',
  },
};

describe('QuoteDetailPage', () => {
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
    getQuoteMock.mockResolvedValue({ data: QUOTE_DETAIL, error: null });
  });

  it('shows the sent email success banner after the send quote redirect', async () => {
    render(
      await QuoteDetailPage({
        params: Promise.resolve({ id: 'quote-1' }),
        searchParams: Promise.resolve({
          emailSent: '1',
        }),
      })
    );

    expect(
      screen.getByText('Quote email sent to accounts@example.com.')
    ).toBeInTheDocument();
  });
});
