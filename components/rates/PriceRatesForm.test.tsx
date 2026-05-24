import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { updateRateSettingsAction } from '@/app/actions/settings';
import { PriceRatesForm } from '@/components/rates/PriceRatesForm';
import { buildDefaultRateSettings } from '@/lib/rate-settings';

vi.mock('@/app/actions/settings', () => ({
  updateRateSettingsAction: vi.fn(),
}));

describe('PriceRatesForm pricing setup', () => {
  it('lets painters configure whole-property quick presets with bed bath and sqm anchors', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'detailed_quick';

    render(<PriceRatesForm defaultRates={rates} />);

    expect(
      screen.getByText('Interior Whole Property Presets (1)')
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('2 Bed 2 Bath Apartment')).toBeInTheDocument();
    expect(screen.getByLabelText('Bedrooms for 2 Bed 2 Bath Apartment')).toHaveValue(2);
    expect(screen.getByLabelText('Bathrooms for 2 Bed 2 Bath Apartment')).toHaveValue(2);
    expect(screen.getByLabelText('Sqm for 2 Bed 2 Bath Apartment')).toHaveValue(89);
    expect(screen.getByLabelText('Wall price share for 2 Bed 2 Bath Apartment')).toHaveValue(55);
    expect(screen.getByLabelText('Ceiling price share for 2 Bed 2 Bath Apartment')).toHaveValue(25);
    expect(screen.getByLabelText('Trim price share for 2 Bed 2 Bath Apartment')).toHaveValue(20);
    expect(screen.getByText('100% total')).toBeInTheDocument();
    expect(screen.getByText('How this price is calculated')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Starts from your Detailed Estimate whole-property base price/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /scope, condition, wall coating, and trim base/i
      )
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Sqm for 2 Bed 2 Bath Apartment'));
    await user.type(screen.getByLabelText('Sqm for 2 Bed 2 Bath Apartment'), '94');
    await user.selectOptions(
      screen.getByLabelText('Property type for 2 Bed 2 Bath Apartment'),
      'house'
    );

    expect(screen.getByLabelText('Sqm for 2 Bed 2 Bath Apartment')).toHaveValue(94);
    expect(screen.getByLabelText('Storeys for 2 Bed 2 Bath Apartment')).toHaveValue('1_storey');
  });

  it('saves user-defined surface price shares for whole-property quick presets', async () => {
    const user = userEvent.setup();
    vi.mocked(updateRateSettingsAction).mockResolvedValue({
      error: null,
    });
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'detailed_quick';

    render(<PriceRatesForm defaultRates={rates} />);

    await user.clear(screen.getByLabelText('Wall price share for 2 Bed 2 Bath Apartment'));
    await user.type(screen.getByLabelText('Wall price share for 2 Bed 2 Bath Apartment'), '60');
    await user.clear(screen.getByLabelText('Ceiling price share for 2 Bed 2 Bath Apartment'));
    await user.type(screen.getByLabelText('Ceiling price share for 2 Bed 2 Bath Apartment'), '20');
    await user.clear(screen.getByLabelText('Trim price share for 2 Bed 2 Bath Apartment'));
    await user.type(screen.getByLabelText('Trim price share for 2 Bed 2 Bath Apartment'), '20');
    await user.click(screen.getByRole('button', { name: /Save Rates/i }));

    expect(updateRateSettingsAction).toHaveBeenCalledWith(
      expect.objectContaining({
        quick_estimate: expect.objectContaining({
          property_presets: [
            expect.objectContaining({
              surface_price_share: {
                walls_pct: 60,
                ceiling_pct: 20,
                trim_pct: 20,
              },
            }),
          ],
        }),
      })
    );
  });

  it('keeps Quick Estimate editable for saved rate settings without property presets', () => {
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'detailed_quick';
    delete (rates.quick_estimate as Partial<typeof rates.quick_estimate>)
      .property_presets;

    render(<PriceRatesForm defaultRates={rates} />);

    expect(
      screen.getByText('Interior Whole Property Presets (1)')
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('2 Bed 2 Bath Apartment')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '+ Apartment preset' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Room Price Library (10)' })
    ).toBeInTheDocument();
  });

  it('removes legacy room anchor compatibility from the price rates UI', () => {
    render(<PriceRatesForm defaultRates={buildDefaultRateSettings()} />);

    expect(screen.queryByText('Detailed Estimate Anchors')).not.toBeInTheDocument();
    expect(screen.queryByText(/Legacy room anchor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Add Room Anchor/i)).not.toBeInTheDocument();
  });

  it('keeps advanced room preset shortcuts out of the price rates UI', () => {
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
    rates.detailed_estimate_items.advanced_rooms = [
      {
        id: 'legacy-shortcut',
        version: 1,
        label: 'Bedroom repaint shortcut',
        anchor_room_type: 'Bedroom',
        source_room_template_id: 'quick-bedroom',
        source_room_template_version: 2,
        default_size: 'medium',
        include_walls: true,
        include_ceiling: true,
        include_trim: false,
        default_height_m: 2.7,
        sort_order: 0,
      },
    ];

    render(<PriceRatesForm defaultRates={rates} />);

    expect(screen.queryByText('Advanced Room Presets')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add Advanced Room Preset' })
    ).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Bedroom repaint shortcut')).not.toBeInTheDocument();
  });

  it('lets painters edit a Room Price Library item name by clicking it', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'detailed_quick';

    render(<PriceRatesForm defaultRates={rates} />);

    await user.click(screen.getByRole('button', { name: 'Edit Bedroom name' }));
    const nameInput = screen.getByLabelText('Room Price Library item name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Bedroom repaint');
    await user.tab();

    expect(screen.getByRole('button', { name: 'Edit Bedroom repaint name' })).toBeInTheDocument();
  });

  it('stores separate Oil Base and Water Base trim prices in the Room Price Library', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'detailed_quick';

    render(<PriceRatesForm defaultRates={rates} />);

    await user.click(screen.getByRole('button', { name: 'Expand Bedroom prices' }));
    const oilInput = screen.getByLabelText('Bedroom Medium Trim Oil Base price');
    const waterInput = screen.getByLabelText('Bedroom Medium Trim Water Base price');

    await user.clear(oilInput);
    await user.type(oilInput, '200.00');
    await user.clear(waterInput);
    await user.type(waterInput, '420.00');
    await user.tab();

    expect(oilInput).toHaveValue(200);
    expect(waterInput).toHaveValue(420);
  });

  it('lets painters set measured defaults for Room Price Library sizes', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'detailed_quick';

    render(<PriceRatesForm defaultRates={rates} />);

    await user.click(screen.getByRole('button', { name: 'Expand Bedroom prices' }));

    const wallArea = screen.getByLabelText('Bedroom Medium Wall area sqm');
    const ceilingArea = screen.getByLabelText('Bedroom Medium Ceiling area sqm');
    const trimLength = screen.getByLabelText('Bedroom Medium Trim length metres');

    await user.clear(wallArea);
    await user.type(wallArea, '40');
    await user.clear(ceilingArea);
    await user.type(ceilingArea, '12');
    await user.clear(trimLength);
    await user.type(trimLength, '18');
    await user.tab();

    expect(wallArea).toHaveValue(40);
    expect(ceilingArea).toHaveValue(12);
    expect(trimLength).toHaveValue(18);
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

    expect(screen.getByText(/Detailed setup/i)).toBeInTheDocument();
    expect(screen.queryByText(/room item/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/missing\/zero room source/i)).not.toBeInTheDocument();
    expect(screen.getByText(/zero door\/window unit/i)).toBeInTheDocument();
  });
});
