import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CustomerForm } from '@/components/customers/CustomerForm';

const backMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: backMock,
  }),
}));

vi.mock('@/app/actions/customers', () => ({
  createCustomer: vi.fn(),
}));

describe('CustomerForm', () => {
  it('submits added properties and exits the saving state when the action returns without redirecting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    render(
      <CustomerForm
        defaultValues={{
          name: 'Mark Johnson',
          email: 'mark@example.com',
          phone: '0412 345 678',
          properties: [
            {
              label: 'Home',
              address_line1: '12 Harbor St',
              address_line2: '',
              city: 'Manly',
              state: 'NSW',
              postcode: '2095',
              notes: '',
            },
          ],
        }}
        onSubmit={onSubmit}
        onSuccess={onSuccess}
        submitLabel="Save Changes"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add Property' }));
    await user.clear(screen.getAllByPlaceholderText('e.g. Home, Rental, Beach house')[1]);
    await user.type(screen.getAllByPlaceholderText('e.g. Home, Rental, Beach house')[1], 'Rental');
    await user.type(screen.getAllByPlaceholderText('e.g. 12 Harbor St')[1], '8 Beach Rd');
    await user.type(screen.getAllByPlaceholderText('e.g. Unit 3')[1], 'Unit 2');
    await user.type(screen.getAllByPlaceholderText('e.g. Manly')[1], 'Freshwater');
    await user.selectOptions(screen.getAllByRole('combobox')[1], 'NSW');
    await user.type(screen.getAllByPlaceholderText('e.g. 2095')[1], '2096');

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.properties).toHaveLength(2);
    expect(payload.properties[1]).toEqual(
      expect.objectContaining({
        label: 'Rental',
        address_line1: '8 Beach Rd',
        address_line2: 'Unit 2',
        city: 'Freshwater',
        state: 'NSW',
        postcode: '2096',
      })
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled()
    );
  });
});
