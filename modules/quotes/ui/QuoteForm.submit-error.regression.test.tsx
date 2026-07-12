import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuoteForm } from '@/modules/quotes/ui/QuoteForm';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
  }),
}));

describe('QuoteForm submit error regression', () => {
  it('shows a rejected submit error instead of leaving the form pending', async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error('Quote service unavailable.'));

    render(
      <QuoteForm
        customers={[
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Sarah Johnson',
            company_name: 'Harbor Cafe',
            email: 'sarah@example.com',
            emails: ['sarah@example.com'],
            phone: null,
            address: '128 Beach Street, Manly, NSW 2095',
            properties: [],
          },
        ]}
        defaultValues={{
          customer_id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Harbor Cafe repaint',
          status: 'draft',
          valid_until: '2026-12-31',
          notes: '',
          internal_notes: '',
          rooms: [],
          pricing_method: 'manual',
          pricing_method_inputs: {
            method: 'manual',
            inputs: { labor_cents: 10000, material_cents: 5000 },
          },
        }}
        onSubmit={onSubmit}
      />
    );

    const saveButton = screen.getByRole('button', { name: 'Save Quote' });
    expect(saveButton).not.toBeDisabled();
    await user.click(saveButton);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Quote service unavailable.')).toBeVisible();
    await waitFor(() => expect(saveButton).toBeEnabled());
  });
});
