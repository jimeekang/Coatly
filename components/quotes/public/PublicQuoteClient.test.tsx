import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PublicQuoteClient } from '@/components/quotes/public/PublicQuoteClient';
import type { PublicQuoteDetail } from '@/lib/quotes';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

function buildQuote(overrides: Partial<PublicQuoteDetail> = {}): PublicQuoteDetail {
  return {
    approved_at: '2026-04-02T10:00:00.000Z',
    approved_by_name: 'Sarah Johnson',
    approved_by_email: 'sarah@example.com',
    approval_signature: 'Sarah Johnson',
    quote_number: 'QUO-0004',
    title: 'Cafe repaint',
    status: 'approved',
    valid_until: '2026-04-30',
    notes: null,
    subtotal_cents: 120000,
    gst_cents: 11000,
    total_cents: 126000,
    discount_cents: 10000,
    manual_adjustment_cents: 5000,
    working_days: 3,
    customer: {
      id: 'customer-1',
      name: 'Sarah Johnson',
      company_name: 'Harbor Cafe',
      email: 'sarah@example.com',
      phone: null,
      address: '128 Beach Street, Manly, NSW 2095',
    },
    rooms: [],
    estimate_items: [],
    line_items: [
      {
        id: 'line-1',
        name: 'Selected trim upgrade',
        category: 'service',
        unit: 'job',
        quantity: 1,
        unit_price_cents: 20000,
        total_cents: 20000,
        notes: null,
        is_optional: true,
        is_selected: true,
      },
      {
        id: 'line-2',
        name: 'Unselected garage door',
        category: 'service',
        unit: 'job',
        quantity: 1,
        unit_price_cents: 30000,
        total_cents: 30000,
        notes: null,
        is_optional: true,
        is_selected: false,
      },
    ],
    ...overrides,
  };
}

describe('PublicQuoteClient', () => {
  it('shows canonical public totals with discount, adjustment, and selected add-ons', () => {
    render(
      <PublicQuoteClient
        token="11111111-1111-1111-1111-111111111111"
        quote={buildQuote()}
        business={null}
      />
    );

    expect(screen.getAllByText('$1,200.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-$100.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$110.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+$50.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$1,260.00').length).toBeGreaterThan(0);
  });
});
