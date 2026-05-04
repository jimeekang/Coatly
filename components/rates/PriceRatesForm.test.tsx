import { render, screen } from '@testing-library/react';
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
});
