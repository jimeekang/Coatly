import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BusinessProfileForm from '@/modules/settings/ui/BusinessProfileForm';

const { saveBusinessProfileMock } = vi.hoisted(() => ({
  saveBusinessProfileMock: vi.fn(),
}));

vi.mock('@/modules/settings/application/business-actions', () => ({
  saveBusinessProfile: saveBusinessProfileMock,
}));

describe('BusinessProfileForm submission exception handling', () => {
  it('shows a rejected save error and exits the saving state', async () => {
    const user = userEvent.setup();
    saveBusinessProfileMock.mockRejectedValue(
      new Error('Business profile service unavailable.')
    );

    render(
      <BusinessProfileForm
        defaultValues={{
          name: 'Harbor Cafe',
          abn: '12345678901',
          addressLine1: '128 Beach Street',
          city: 'Manly',
          state: 'NSW',
          postcode: '2095',
          phone: '0412 555 012',
          email: 'sarah@example.com',
          paymentTerms: 'Payment due within 7 days',
          bankDetails: 'BSB: 123-456\nAccount: 12345678',
          logoUrl: '',
          logoPreviewUrl: '',
        }}
      />
    );

    const saveButton = screen.getByRole('button', {
      name: 'Save Business Details',
    });
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Business profile service unavailable.'
    );
    await waitFor(() => expect(saveButton).toBeEnabled());
    expect(saveBusinessProfileMock).toHaveBeenCalledTimes(1);
  });
});
