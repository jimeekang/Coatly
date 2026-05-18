import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PriceRatesForm } from '@/components/rates/PriceRatesForm';
import { buildDefaultRateSettings } from '@/lib/rate-settings';

vi.mock('@/app/actions/settings', () => ({
  updateRateSettingsAction: vi.fn(),
}));

describe('PriceRatesForm advanced room presets', () => {
  it('removes legacy room anchor compatibility from the price rates UI', () => {
    render(<PriceRatesForm defaultRates={buildDefaultRateSettings()} />);

    expect(screen.queryByText('Detailed Estimate Anchors')).not.toBeInTheDocument();
    expect(screen.queryByText(/Legacy room anchor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Add Room Anchor/i)).not.toBeInTheDocument();
  });

  it('lets advanced room presets select a Room Price Library template and default size', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();
    rates.quick_estimate.rooms = [
      {
        id: 'quick-bedroom',
        version: 2,
        label: 'Bedroom',
        enabled_surfaces: ['walls', 'ceiling', 'trim'],
        sizes: {
          small: { walls_cents: 90000, ceiling_cents: 30000, trim_cents: 10000 },
          medium: { walls_cents: 120000, ceiling_cents: 45000, trim_cents: 15000 },
          large: { walls_cents: 150000, ceiling_cents: 60000, trim_cents: 20000 },
        },
        sort_order: 0,
      },
    ];

    render(<PriceRatesForm defaultRates={rates} />);

    expect(screen.getByText('Advanced Room Presets')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Add Advanced Room Preset' })
    ).toHaveLength(1);

    await user.click(
      screen.getByRole('button', { name: 'Add Advanced Room Preset' })
    );

    expect(screen.getByDisplayValue('New advanced room')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2.7')).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(/Room Price Library source/i),
      'quick-bedroom'
    );
    await user.selectOptions(screen.getByLabelText(/Default size/i), 'large');

    expect(screen.getByLabelText(/Room Price Library source/i)).toHaveValue(
      'quick-bedroom'
    );
    expect(screen.getByLabelText(/Default size/i)).toHaveValue('large');
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
        default_size: 'medium',
        include_walls: true,
        include_ceiling: false,
        include_trim: false,
        default_height_m: 2.7,
        sort_order: 0,
      },
    ];
    rates.door_unit_rates.oil_2coat.standard.door_and_frame = 0;

    render(<PriceRatesForm defaultRates={rates} />);

    expect(screen.getByText(/Room Price Library setup/i)).toBeInTheDocument();
    expect(screen.getByText(/1 room template/i)).toBeInTheDocument();
    expect(screen.getByText(/zero priced surface/i)).toBeInTheDocument();

    expect(screen.getByText(/Advanced setup/i)).toBeInTheDocument();
    expect(screen.getByText(/1 room item/i)).toBeInTheDocument();
    expect(screen.getByText(/missing\/zero room source/i)).toBeInTheDocument();
    expect(screen.getByText(/zero door\/window unit/i)).toBeInTheDocument();
  });
});
