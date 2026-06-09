import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateRateSettingsAction } from '@/modules/settings/application/settings-actions';
import {
  createMaterialItem,
  importMaterialItems,
} from '@/modules/materials/application/actions';
import { PriceRatesForm } from '@/modules/price-rates/ui/PriceRatesForm';
import { buildDefaultRateSettings } from '@/modules/price-rates/domain/rate-settings';

vi.mock('@/modules/settings/application/settings-actions', () => ({
  updateRateSettingsAction: vi.fn(),
}));

vi.mock('@/modules/materials/application/actions', () => ({
  createMaterialItem: vi.fn(),
  importMaterialItems: vi.fn(),
}));

describe('PriceRatesForm pricing setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.mocked(createMaterialItem).mockResolvedValue({
      data: {
        id: 'manual-default',
        user_id: 'user-1',
        name: 'Manual default',
        category: 'service',
        unit: 'each',
        unit_price_cents: 10000,
        notes: null,
        is_active: true,
        sort_order: 0,
        created_at: '2026-06-03T00:00:00.000Z',
        updated_at: '2026-06-03T00:00:00.000Z',
      },
    });
    vi.mocked(importMaterialItems).mockResolvedValue({ data: [] });
  });

  it('opens on Manual price book setup before advanced rate warnings', () => {
    render(<PriceRatesForm defaultRates={buildDefaultRateSettings()} />);

    expect(screen.getByRole('tab', { name: /Manual/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(
      screen.getByRole('button', { name: /Add Price Item/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Download Template/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Room Price Library setup/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Detailed setup/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Save Rates/i })
    ).not.toBeInTheDocument();
  });

  it('shows advanced setup warnings only after opening an advanced rate tab', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();

    render(<PriceRatesForm defaultRates={rates} />);

    await user.click(screen.getByRole('tab', { name: /Quick Estimate/i }));

    expect(screen.getByText(/Room Price Library setup/i)).toBeInTheDocument();
    expect(screen.getByText(/Detailed setup/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Rates/i })).toBeInTheDocument();
  });

  it('lets painters configure whole-property quick presets with bed bath and sqm anchors', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'detailed_quick';

    render(<PriceRatesForm defaultRates={rates} />);

    await user.click(screen.getByRole('tab', { name: /Quick Estimate/i }));

    expect(
      screen.getByText('Interior Whole Property Presets (1)')
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('2 Bed 2 Bath Apartment')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Bedrooms for 2 Bed 2 Bath Apartment')
    ).toHaveValue(2);
    expect(
      screen.getByLabelText('Bathrooms for 2 Bed 2 Bath Apartment')
    ).toHaveValue(2);
    expect(screen.getByLabelText('Sqm for 2 Bed 2 Bath Apartment')).toHaveValue(
      89
    );
    expect(
      screen.getByLabelText('Wall price share for 2 Bed 2 Bath Apartment')
    ).toHaveValue(55);
    expect(
      screen.getByLabelText('Ceiling price share for 2 Bed 2 Bath Apartment')
    ).toHaveValue(25);
    expect(
      screen.getByLabelText('Trim price share for 2 Bed 2 Bath Apartment')
    ).toHaveValue(20);
    expect(screen.getByText('100% total')).toBeInTheDocument();
    expect(
      screen.getByText('How this price is calculated')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Starts from your Detailed Estimate whole-property base price/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/scope, condition, wall coating, and trim base/i)
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Sqm for 2 Bed 2 Bath Apartment'));
    await user.type(
      screen.getByLabelText('Sqm for 2 Bed 2 Bath Apartment'),
      '94'
    );
    await user.selectOptions(
      screen.getByLabelText('Property type for 2 Bed 2 Bath Apartment'),
      'house'
    );

    expect(screen.getByLabelText('Sqm for 2 Bed 2 Bath Apartment')).toHaveValue(
      94
    );
    expect(
      screen.getByLabelText('Storeys for 2 Bed 2 Bath Apartment')
    ).toHaveValue('1_storey');
  });

  it('saves user-defined surface price shares for whole-property quick presets', async () => {
    const user = userEvent.setup();
    vi.mocked(updateRateSettingsAction).mockResolvedValue({
      error: null,
    });
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'detailed_quick';

    render(<PriceRatesForm defaultRates={rates} />);

    await user.click(screen.getByRole('tab', { name: /Quick Estimate/i }));

    await user.clear(
      screen.getByLabelText('Wall price share for 2 Bed 2 Bath Apartment')
    );
    await user.type(
      screen.getByLabelText('Wall price share for 2 Bed 2 Bath Apartment'),
      '60'
    );
    await user.clear(
      screen.getByLabelText('Ceiling price share for 2 Bed 2 Bath Apartment')
    );
    await user.type(
      screen.getByLabelText('Ceiling price share for 2 Bed 2 Bath Apartment'),
      '20'
    );
    await user.clear(
      screen.getByLabelText('Trim price share for 2 Bed 2 Bath Apartment')
    );
    await user.type(
      screen.getByLabelText('Trim price share for 2 Bed 2 Bath Apartment'),
      '20'
    );
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

  it('keeps Quick Estimate editable for saved rate settings without property presets', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'detailed_quick';
    delete (rates.quick_estimate as Partial<typeof rates.quick_estimate>)
      .property_presets;

    render(<PriceRatesForm defaultRates={rates} />);

    await user.click(screen.getByRole('tab', { name: /Quick Estimate/i }));

    expect(
      screen.getByText('Interior Whole Property Presets (1)')
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('2 Bed 2 Bath Apartment')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '+ Apartment preset' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Room Price Library (10)' })
    ).toBeInTheDocument();
  });

  it('removes legacy room anchor compatibility from the price rates UI', () => {
    render(<PriceRatesForm defaultRates={buildDefaultRateSettings()} />);

    expect(
      screen.queryByText('Detailed Estimate Anchors')
    ).not.toBeInTheDocument();
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
          small: {
            walls_cents: 90000,
            ceiling_cents: 30000,
            trim_cents: 10000,
          },
          medium: {
            walls_cents: 120000,
            ceiling_cents: 45000,
            trim_cents: 15000,
          },
          large: {
            walls_cents: 150000,
            ceiling_cents: 60000,
            trim_cents: 20000,
          },
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
    expect(
      screen.queryByDisplayValue('Bedroom repaint shortcut')
    ).not.toBeInTheDocument();
  });

  it('lets painters edit a Room Price Library item name by clicking it', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'detailed_quick';

    render(<PriceRatesForm defaultRates={rates} />);

    await user.click(screen.getByRole('tab', { name: /Quick Estimate/i }));

    await user.click(screen.getByRole('button', { name: 'Edit Bedroom name' }));
    const nameInput = screen.getByLabelText('Room Price Library item name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Bedroom repaint');
    await user.tab();

    expect(
      screen.getByRole('button', { name: 'Edit Bedroom repaint name' })
    ).toBeInTheDocument();
  });

  it('stores separate Oil Base and Water Base trim prices in the Room Price Library', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'detailed_quick';

    render(<PriceRatesForm defaultRates={rates} />);

    await user.click(screen.getByRole('tab', { name: /Quick Estimate/i }));

    await user.click(
      screen.getByRole('button', { name: 'Expand Bedroom prices' })
    );
    const oilInput = screen.getByLabelText(
      'Bedroom Medium Trim Oil Base price'
    );
    const waterInput = screen.getByLabelText(
      'Bedroom Medium Trim Water Base price'
    );

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

    await user.click(screen.getByRole('tab', { name: /Quick Estimate/i }));

    await user.click(
      screen.getByRole('button', { name: 'Expand Bedroom prices' })
    );

    const wallArea = screen.getByLabelText('Bedroom Medium Wall area sqm');
    const ceilingArea = screen.getByLabelText(
      'Bedroom Medium Ceiling area sqm'
    );
    const trimLength = screen.getByLabelText(
      'Bedroom Medium Trim length metres'
    );

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

  it('shows quick and advanced setup warnings for zero or missing required rates', async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByRole('tab', { name: /Quick Estimate/i }));

    expect(screen.getByText(/Room Price Library setup/i)).toBeInTheDocument();
    expect(screen.getByText(/1 room template/i)).toBeInTheDocument();
    expect(screen.getByText(/zero priced surface/i)).toBeInTheDocument();

    expect(screen.getByText(/Detailed setup/i)).toBeInTheDocument();
    expect(screen.queryByText(/room item/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/missing\/zero room source/i)
    ).not.toBeInTheDocument();
    expect(screen.getByText(/zero door\/window unit/i)).toBeInTheDocument();
  });

  it('shows Excel CSV template import and export controls in Manual pricing', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'manual';

    render(
      <PriceRatesForm
        defaultRates={rates}
        manualItems={[
          {
            id: 'service-1',
            user_id: 'user-1',
            name: 'Door repaint',
            category: 'service',
            unit: 'each',
            unit_price_cents: 25000,
            notes: null,
            is_active: true,
            sort_order: 0,
            created_at: '2026-06-03T00:00:00.000Z',
            updated_at: '2026-06-03T00:00:00.000Z',
          },
        ]}
      />
    );

    await user.click(screen.getByRole('tab', { name: /Manual/i }));

    expect(
      screen.getByRole('button', { name: /Import Excel CSV/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Download Template/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Export Excel CSV/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Door repaint')).toBeInTheDocument();
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('downloads the blank Manual CSV template with the supported headers', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'manual';
    let exportedBlob: Blob | null = null;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => {
        exportedBlob = blob;
        return 'blob:manual-template';
      }),
      revokeObjectURL: vi.fn(),
    });

    render(<PriceRatesForm defaultRates={rates} manualItems={[]} />);

    await user.click(screen.getByRole('tab', { name: /Manual/i }));
    await user.click(
      screen.getByRole('button', { name: /Download Template/i })
    );

    expect(clickSpy).toHaveBeenCalled();
    await expect(exportedBlob?.text()).resolves.toBe(
      'Service / Item,Unit,Price,Category,Customer Description'
    );
    expect(
      screen.getByText('Downloaded the manual price book template.')
    ).toBeInTheDocument();
  });

  it('reviews valid CSV rows before importing them', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'manual';
    vi.mocked(importMaterialItems).mockResolvedValue({
      data: [
        {
          id: 'import-1',
          user_id: 'user-1',
          name: 'Wall painting',
          category: 'service',
          unit: 'sqm',
          unit_price_cents: 1850,
          notes: 'Two coats',
          is_active: true,
          sort_order: 0,
          created_at: '2026-06-03T00:00:00.000Z',
          updated_at: '2026-06-03T00:00:00.000Z',
        },
      ],
    });

    render(<PriceRatesForm defaultRates={rates} manualItems={[]} />);

    await user.click(screen.getByRole('tab', { name: /Manual/i }));
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    await user.upload(
      fileInput,
      new File(
        [
          [
            'Service / Item,Unit,Price,Category,Customer Description',
            'Wall painting,sqm,18.50,,Two coats',
          ].join('\n'),
        ],
        'manual-price-book.csv',
        { type: 'text/csv' }
      )
    );

    expect(importMaterialItems).not.toHaveBeenCalled();
    expect(screen.getByText('Review 1 item before import')).toBeInTheDocument();
    expect(screen.getByText('Wall painting')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Import items/i }));

    await waitFor(() =>
      expect(importMaterialItems).toHaveBeenCalledWith([
        {
          category: 'service',
          name: 'Wall painting',
          unit: 'sqm',
          unit_price_cents: 1850,
          notes: 'Two coats',
          is_active: true,
        },
      ])
    );
    expect(
      await screen.findByText('Imported 1 item from CSV.')
    ).toBeInTheDocument();
  });

  it('blocks invalid CSV import rows before calling the server action', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'manual';

    render(<PriceRatesForm defaultRates={rates} manualItems={[]} />);

    await user.click(screen.getByRole('tab', { name: /Manual/i }));
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    await user.upload(
      fileInput,
      new File(
        [
          ['Service / Item,Unit,Price', 'Door repaint,linear metre,100'].join(
            '\n'
          ),
        ],
        'bad-price-book.csv',
        { type: 'text/csv' }
      )
    );

    expect(importMaterialItems).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Line 2: Unit must be one of each, sqm, lm, room, hour, day, fixed'
      )
    ).toBeInTheDocument();
  });

  it('blocks CSV rows that duplicate existing manual price book items', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'manual';

    render(
      <PriceRatesForm
        defaultRates={rates}
        manualItems={[
          {
            id: 'existing-1',
            user_id: 'user-1',
            name: 'Wall painting',
            category: 'service',
            unit: 'sqm',
            unit_price_cents: 1800,
            notes: null,
            is_active: true,
            sort_order: 0,
            created_at: '2026-06-03T00:00:00.000Z',
            updated_at: '2026-06-03T00:00:00.000Z',
          },
        ]}
      />
    );

    await user.click(screen.getByRole('tab', { name: /Manual/i }));
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    await user.upload(
      fileInput,
      new File(
        [['Service / Item,Unit,Price', 'Wall painting,sqm,18.50'].join('\n')],
        'duplicate-price-book.csv',
        { type: 'text/csv' }
      )
    );

    expect(importMaterialItems).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Line 2: Wall painting / sqm already exists in your manual price book.'
      )
    ).toBeInTheDocument();
  });

  it('lets painters add a manual price item directly before using CSV', async () => {
    const user = userEvent.setup();
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'manual';
    vi.mocked(createMaterialItem).mockResolvedValue({
      data: {
        id: 'manual-1',
        user_id: 'user-1',
        name: 'Wall painting',
        category: 'service',
        unit: 'sqm',
        unit_price_cents: 1850,
        notes: 'Two coats',
        is_active: true,
        sort_order: 0,
        created_at: '2026-06-03T00:00:00.000Z',
        updated_at: '2026-06-03T00:00:00.000Z',
      },
    });

    render(<PriceRatesForm defaultRates={rates} manualItems={[]} />);

    await user.click(screen.getByRole('tab', { name: /Manual/i }));
    await user.click(screen.getByRole('button', { name: /Add Price Item/i }));
    await user.type(screen.getByLabelText('Service / Item'), 'Wall painting');
    await user.selectOptions(screen.getByLabelText('Unit'), 'sqm');
    await user.clear(screen.getByLabelText('Price'));
    await user.type(screen.getByLabelText('Price'), '18.50');
    await user.type(screen.getByLabelText('Customer Description'), 'Two coats');
    await user.click(screen.getByRole('button', { name: /Save Price Item/i }));

    await waitFor(() =>
      expect(createMaterialItem).toHaveBeenCalledWith({
        category: 'service',
        name: 'Wall painting',
        unit: 'sqm',
        unit_price_cents: 1850,
        notes: 'Two coats',
        is_active: true,
      })
    );

    expect(await screen.findByText('Wall painting')).toBeInTheDocument();
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });
});
