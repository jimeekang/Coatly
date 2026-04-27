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
            complexity: 'standard',
            subtotal_cents: 100000,
            gst_cents: 10000,
            total_cents: 110000,
            estimate_category: 'manual',
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
            status: 'approved',
            valid_until: '2026-04-15',
            complexity: 'complex',
            subtotal_cents: 200000,
            gst_cents: 20000,
            total_cents: 220000,
            estimate_category: 'interior',
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

    fireEvent.change(screen.getByPlaceholderText(/Search quotes/i), {
      target: { value: 'Mark' },
    });

    expect(screen.getByText('Mark Johnson')).toBeInTheDocument();
    expect(screen.getByText('QUO-0012')).toBeInTheDocument();
    expect(screen.queryByText('Shara Studio')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Approved' }));

    expect(screen.getByText('No quotes match this search.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Search quotes/i), {
      target: { value: '' },
    });

    expect(screen.getByText('Shara Studio')).toBeInTheDocument();
    expect(screen.queryByText('Mark Johnson')).not.toBeInTheDocument();
  });

  it('wraps filters and keeps cards fluid on small mobile screens', () => {
    const { container } = render(
      <QuoteTable
        quotes={[
          {
            id: 'quote-1',
            user_id: 'user-1',
            customer_id: 'customer-1',
            quote_number: 'QUO-0012-LONG',
            title: 'Long living room repaint title that should stay inside the card',
            status: 'sent',
            valid_until: '2026-04-10',
            complexity: 'standard',
            subtotal_cents: 100000,
            gst_cents: 10000,
            total_cents: 110000,
            estimate_category: 'manual',
            created_at: '2026-03-01T00:00:00.000Z',
            updated_at: '2026-03-01T00:00:00.000Z',
            customer: {
              id: 'customer-1',
              name: 'Mark Johnson',
              company_name: 'Very Long Painting Company Name',
              email: null,
              phone: null,
              address: null,
            },
            room_count: 1,
            surface_count: 2,
          },
        ]}
      />
    );

    const filters = container.querySelectorAll('.flex-wrap');
    expect(filters.length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('.overflow-x-auto')).not.toBeInTheDocument();
    expect(screen.getByText('Very Long Painting Company Name')).toHaveClass('truncate');
  });
});
