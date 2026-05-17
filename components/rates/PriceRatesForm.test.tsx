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

  it('shows quick and advanced setup warnings for zero or missing required rates', () => {
    const rates = buildDefaultRateSettings();
    rates.quick_estimate.rooms = [
      {
        id: 'quick-bedroom',
        version: 1,
        label: 'Bedroom',
        enabled_surfaces: ['walls', 'ceiling'],
        sizes: {
          small: {
            walls_cents: 120000,
            ceiling_cents: 0,
            trim_cents: 0,
          },
          medium: {
            walls_cents: 140000,
            ceiling_cents: 0,
            trim_cents: 0,
          },
          large: {
            walls_cents: 160000,
            ceiling_cents: 50000,
            trim_cents: 0,
          },
        },
        sort_order: 0,
      },
    ];
    rates.detailed_estimate_items.advanced_rooms = [
      {
        id: 'adv-missing',
        version: 1,
        label: 'Missing anchor room',
        anchor_room_type: 'Not configured',
        include_walls: true,
        include_ceiling: false,
        include_trim: false,
        default_height_m: 2.7,
        sort_order: 0,
      },
    ];
    rates.door_unit_rates.oil_2coat.standard.door_and_frame = 0;

    render(<PriceRatesForm defaultRates={rates} />);

    expect(screen.getByText(/Quick setup/i)).toBeInTheDocument();
    expect(screen.getByText(/1 room configured/i)).toBeInTheDocument();
    expect(screen.getByText(/zero priced surface/i)).toBeInTheDocument();

    expect(screen.getByText(/Advanced setup/i)).toBeInTheDocument();
    expect(screen.getByText(/1 room item/i)).toBeInTheDocument();
    expect(screen.getByText(/missing\/zero anchor/i)).toBeInTheDocument();
    expect(screen.getByText(/zero door\/window unit/i)).toBeInTheDocument();
  });
});
