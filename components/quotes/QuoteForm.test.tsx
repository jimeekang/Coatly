import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteForm } from '@/components/quotes/QuoteForm';

const backMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: backMock,
  }),
}));

describe('QuoteForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits a DB-compatible payload from the filled form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <QuoteForm
        customers={[
          {
            id: 'customer-1',
            name: 'Sarah Johnson',
            company_name: 'Harbor Cafe',
            email: 'sarah@example.com',
            phone: '0412 555 012',
            address: '128 Beach Street, Manly, NSW 2095',
          },
        ]}
        onSubmit={onSubmit}
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), 'customer-1');
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Harbor Cafe repaint' },
    });
    fireEvent.change(screen.getByLabelText('Valid Until'), {
      target: { value: '2026-04-10' },
    });
    fireEvent.change(screen.getByLabelText('Room Name'), {
      target: { value: 'Living Room' },
    });
    fireEvent.change(screen.getByLabelText('Area (m²)'), {
      target: { value: '35' },
    });
    fireEvent.change(screen.getByPlaceholderText('Visible notes for the client'), {
      target: { value: 'Client note' },
    });
    await user.click(screen.getByRole('button', { name: 'Save Quote' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      customer_id: 'customer-1',
      title: 'Harbor Cafe repaint',
      status: 'draft',
      valid_until: '2026-04-10',
      tier: 'better',
      labour_margin_percent: 10,
      material_margin_percent: 5,
      notes: 'Client note',
      internal_notes: '',
      rooms: [
        {
          name: 'Living Room',
          room_type: 'interior',
          length_m: null,
          width_m: null,
          height_m: 2.7,
          surfaces: [
            {
              surface_type: 'walls',
              coating_type: 'repaint_2coat',
              area_m2: 35,
              rate_per_m2_cents: 1800,
              notes: '',
            },
          ],
        },
      ],
    });
  });

  it('shows the calculated total while editing', () => {
    render(
      <QuoteForm
        customers={[
          {
            id: 'customer-1',
            name: 'Sarah Johnson',
            company_name: null,
            email: null,
            phone: null,
            address: null,
          },
        ]}
      />
    );

    fireEvent.change(screen.getByLabelText('Room Name'), {
      target: { value: 'Living Room' },
    });
    fireEvent.change(screen.getByLabelText('Area (m²)'), {
      target: { value: '35' },
    });

    expect(screen.getAllByText('$796.95').length).toBeGreaterThan(0);
  });
});
