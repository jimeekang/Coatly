import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuoteTable } from '@/components/quotes/QuoteTable';

describe('QuoteTable', () => {
  it('filters quotes by search query and status', () => {
    render(
      <QuoteTable
        quotes={[
          {
            id: 'quote-1',
            user_id: 'user-1',
            customer_id: 'customer-1',
            quote_number: 'QUO-0012',
            title: 'Mark living room repaint',
            status: 'sent',
            valid_until: '2026-04-10',
            tier: 'better',
            subtotal_cents: 100000,
            gst_cents: 10000,
            total_cents: 110000,
            created_at: '2026-03-01T00:00:00.000Z',
            updated_at: '2026-03-01T00:00:00.000Z',
            customer: {
              id: 'customer-1',
              name: 'Mark Johnson',
              company_name: null,
              email: null,
              phone: null,
              address: null,
            },
            room_count: 1,
            surface_count: 2,
          },
          {
            id: 'quote-2',
            user_id: 'user-1',
            customer_id: 'customer-2',
            quote_number: 'QUO-0013',
            title: 'Shara studio exterior',
            status: 'accepted',
            valid_until: '2026-04-15',
            tier: 'best',
            subtotal_cents: 200000,
            gst_cents: 20000,
            total_cents: 220000,
            created_at: '2026-03-02T00:00:00.000Z',
            updated_at: '2026-03-02T00:00:00.000Z',
            customer: {
              id: 'customer-2',
              name: 'Shara Adams',
              company_name: 'Shara Studio',
              email: null,
              phone: null,
              address: null,
            },
            room_count: 2,
            surface_count: 4,
          },
        ]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Search by quote number/i), {
      target: { value: 'Mark' },
    });

    expect(screen.getAllByText('QUO-0012').length).toBeGreaterThan(0);
    expect(screen.queryByText('QUO-0013')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Filter by quote status/i), {
      target: { value: 'accepted' },
    });

    expect(screen.getByText('No quotes match this search.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Search by quote number/i), {
      target: { value: '' },
    });

    expect(screen.getAllByText('QUO-0013').length).toBeGreaterThan(0);
    expect(screen.queryByText('QUO-0012')).not.toBeInTheDocument();
  });
});
