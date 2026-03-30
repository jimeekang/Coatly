import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteForm } from '@/components/quotes/QuoteForm';

const backMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: backMock,
  }),
}));

const CUSTOMER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Sarah Johnson',
  company_name: 'Harbor Cafe',
  email: 'sarah@example.com',
  phone: '0412 555 012',
  address: '128 Beach Street, Manly, NSW 2095',
};

describe('QuoteForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits a quick-mode payload when a room preset is added and form submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<QuoteForm customers={[CUSTOMER]} onSubmit={onSubmit} />);

    // Fill basic details
    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Harbor Cafe repaint');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-04-10');

    // Add a Living Room via the room preset grid
    await user.click(screen.getByRole('button', { name: /Living Room/i }));

    // Submit
    await user.click(screen.getByRole('button', { name: 'Save Quote' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.customer_id).toBe(CUSTOMER.id);
    expect(payload.title).toBe('Harbor Cafe repaint');
    expect(payload.rooms).toEqual([]);
    expect(payload.interior_estimate).toBeDefined();
    expect(payload.interior_estimate.estimate_mode).toBe('specific_areas');
    expect(payload.interior_estimate.rooms).toHaveLength(1);
    expect(payload.interior_estimate.rooms[0].anchor_room_type).toBe('Living Room');
    expect(typeof payload.manual_adjustment_cents).toBe('number');
  });

  it('switches to advanced mode and shows InteriorEstimateBuilder', async () => {
    const user = userEvent.setup();

    render(<QuoteForm customers={[CUSTOMER]} />);

    await user.click(screen.getByRole('button', { name: /Advanced/i }));

    // Advanced mode renders property-type toggle buttons from InteriorEstimateBuilder
    expect(screen.getByRole('button', { name: 'Apartment' })).toBeInTheDocument();
  });

  it('pre-fills advanced mode when defaultValues has rooms', () => {
    render(
      <QuoteForm
        customers={[CUSTOMER]}
        defaultValues={{
          customer_id: CUSTOMER.id,
          title: 'Living room repaint',
          status: 'draft',
          valid_until: '2026-04-24',
          notes: '',
          internal_notes: '',
          rooms: [
            {
              name: 'Living Room',
              room_type: 'interior',
              length_m: 5,
              width_m: 4,
              height_m: 2.7,
            },
          ],
        }}
      />
    );

    // Should be in advanced mode with the room pre-filled
    expect(screen.getByLabelText('Room Name')).toHaveValue('Living Room');
  });

  it('shows the estimate total', () => {
    render(<QuoteForm customers={[CUSTOMER]} />);

    expect(screen.getByText('Estimate Total')).toBeInTheDocument();
  });
});
