import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PriceRatesForm } from '@/components/rates/PriceRatesForm';
import { buildDefaultRateSettings } from '@/lib/rate-settings';

vi.mock('@/app/actions/settings', () => ({
  updateRateSettingsAction: vi.fn(),
}));

describe('PriceRatesForm detailed estimate anchors', () => {
  it('shows detailed estimate anchor settings separately from room flat rate presets', () => {
    render(<PriceRatesForm defaultRates={buildDefaultRateSettings()} />);

    expect(screen.getByText('Detailed Estimate Anchors')).toBeInTheDocument();
    expect(
      screen.getByText(/Room flat rate presets stay separate/i)
    ).toBeInTheDocument();
  });

  it('lets users add advanced room library items inside detailed estimate settings', async () => {
    const user = userEvent.setup();
    render(<PriceRatesForm defaultRates={buildDefaultRateSettings()} />);

    expect(screen.getByText('Advanced Room Items')).toBeInTheDocument();

    await user.click(
      screen.getAllByRole('button', { name: 'Add Advanced Room Item' })[0]
    );

    expect(screen.getByDisplayValue('New advanced room')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2.7')).toBeInTheDocument();
  });
});
