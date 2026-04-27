import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CustomerTable } from '@/components/customers/CustomerTable';

describe('CustomerTable', () => {
  it('wraps sort controls and truncates long mobile card content', () => {
    const { container } = render(
      <CustomerTable
        customers={[
          {
            id: 'customer-1',
            name: 'Mark Johnson',
            company_name: 'Very Long Painting Company Name For Mobile Layout',
            email: 'mark@example.com',
            emails: ['mark@example.com'],
            phone: '0412 555 012',
            phones: ['0412 555 012'],
            address_line1: '123 Very Long Residential Street Name',
            address_line2: null,
            city: 'Bondi Junction',
            state: 'NSW',
            postcode: '2022',
            properties: [],
            billing_same_as_site: true,
            billing_address_line1: null,
            billing_address_line2: null,
            billing_city: null,
            billing_state: null,
            billing_postcode: null,
            notes: null,
            created_at: '2026-03-01T00:00:00.000Z',
          },
        ]}
        recentJobs={{
          'customer-1': {
            id: 'quote-1',
            type: 'quote',
            number: 'QUO-0012-LONG',
            title: 'Very long exterior repaint job name that should stay inside',
            status: 'sent',
            created_at: '2026-03-02T00:00:00.000Z',
          },
        }}
      />
    );

    expect(container.querySelector('.flex-wrap')).toBeInTheDocument();
    expect(container.querySelector('.overflow-x-auto')).not.toBeInTheDocument();
    expect(screen.getByText('Very Long Painting Company Name For Mobile Layout')).toHaveClass(
      'truncate'
    );
    expect(screen.getByText(/QUO-0012-LONG/)).toHaveClass('truncate');
  });
});
