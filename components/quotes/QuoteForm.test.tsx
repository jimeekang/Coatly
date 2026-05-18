import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateQuickQuotePreview } from '@/components/quotes/QuickQuoteBuilder';
import { QuoteForm } from '@/components/quotes/QuoteForm';
import { calculateQuoteTotals } from '@/lib/quotes';
import { buildDefaultRateSettings } from '@/lib/rate-settings';

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
  emails: ['sarah@example.com', 'accounts@example.com'],
  phone: '0412 555 012',
  address: '128 Beach Street, Manly, NSW 2095',
  properties: [
    {
      label: 'Cafe',
      address_line1: '128 Beach Street',
      address_line2: '',
      city: 'Manly',
      state: 'NSW',
      postcode: '2095',
      notes: '',
      address: '128 Beach Street, Manly, NSW, 2095',
    },
    {
      label: 'Warehouse',
      address_line1: '9 Storage Lane',
      address_line2: 'Unit 4',
      city: 'Brookvale',
      state: 'NSW',
      postcode: '2100',
      notes: 'Use rear entry',
      address: '9 Storage Lane, Unit 4, Brookvale, NSW, 2100',
    },
  ],
};

const CUSTOMER_WITHOUT_EMAIL = {
  ...CUSTOMER,
  id: '550e8400-e29b-41d4-a716-446655440099',
  email: null,
  emails: [],
};

const LIBRARY_ITEM = {
  id: 'material-1',
  user_id: 'user-1',
  name: 'Premium wash & wear',
  category: 'paint' as const,
  unit: 'tin',
  unit_price_cents: 10000,
  notes: null,
  is_active: true,
  sort_order: 0,
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
};

const SERVICE_ITEM = {
  id: 'service-1',
  user_id: 'user-1',
  name: 'Ceiling repaint',
  category: 'service' as const,
  unit: 'room',
  unit_price_cents: 22500,
  notes: 'Two-coat ceiling repaint service',
  is_active: true,
  sort_order: 1,
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
};

function parseAudTextToCents(value: string) {
  return Math.round(Number(value.replace(/[$,]/g, '')) * 100);
}

function getEstimateTotalsCents() {
  return Array.from(
    new Set(
      screen.getAllByText('Estimate Total').map((label) => {
        const value =
          label.parentElement?.querySelectorAll('p')[1]?.textContent;
        if (!value) {
          throw new Error('Estimate total value not found');
        }

        return parseAudTextToCents(value);
      })
    )
  );
}

function getEstimateTotalsKey() {
  return getEstimateTotalsCents().sort((a, b) => a - b).join(',');
}

async function addLibraryItemToQuote(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Add Item' }));
  await user.click(
    screen.getByRole('button', { name: /Premium wash & wear/i })
  );
  await user.click(screen.getByRole('button', { name: 'Add to Quote' }));
}

async function addDetailedSpecificRoom(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('tab', { name: /Detailed/i }));
  await user.click(screen.getByRole('button', { name: 'Add Room' }));
}

describe('QuoteForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits a detailed interior payload when form submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<QuoteForm customers={[CUSTOMER]} onSubmit={onSubmit} />);

    // Fill basic details
    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Harbor Cafe repaint');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-04-10');
    await addDetailedSpecificRoom(user);

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
    expect(payload.interior_estimate.rooms[0].anchor_room_type).toBe(
      'Living Room'
    );
    expect(typeof payload.manual_adjustment_cents).toBe('number');
  });

  it('submits the configured booking duration for client date booking', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<QuoteForm customers={[CUSTOMER]} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Four-day repaint');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-04-10');
    await user.clear(screen.getByLabelText('Booking Duration'));
    await user.type(screen.getByLabelText('Booking Duration'), '4');
    await addDetailedSpecificRoom(user);
    await user.click(screen.getByRole('button', { name: 'Save Quote' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        working_days: 4,
      })
    );
  });

  it('opens a send confirmation dialog and passes the selected email', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <QuoteForm
        customers={[CUSTOMER]}
        onSubmit={onSubmit}
        showSendQuoteButton
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Email-ready quote');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-04-10');
    await addDetailedSpecificRoom(user);
    await user.click(
      screen.getByRole('button', { name: 'Send Quote to Client' })
    );

    expect(
      screen.getByRole('heading', { name: 'Review before sending' })
    ).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText('Send to'),
      'accounts@example.com'
    );
    await user.click(screen.getByRole('button', { name: 'Send Quote' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][1]).toBe('send_email');
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        customer_email: 'accounts@example.com',
      })
    );
  });

  it('disables send quote button when the selected customer has no email', async () => {
    const user = userEvent.setup();

    render(
      <QuoteForm customers={[CUSTOMER_WITHOUT_EMAIL]} showSendQuoteButton />
    );

    await user.selectOptions(
      screen.getByLabelText('Customer'),
      CUSTOMER_WITHOUT_EMAIL.id
    );
    expect(
      screen.getByRole('button', { name: 'Send Quote to Client' })
    ).toBeDisabled();
  });

  it('aligns the fixed action footer with the dashboard content area', () => {
    render(<QuoteForm customers={[CUSTOMER]} showSendQuoteButton />);

    const sendButton = screen.getByRole('button', {
      name: 'Send Quote to Client',
    });
    const footer = sendButton.closest('.fixed');
    const footerContent = sendButton.closest('.mx-auto');

    expect(footer).toHaveClass('bottom-[calc(4rem+env(safe-area-inset-bottom))]');
    expect(footer).toHaveClass('pb-[calc(0.75rem+env(safe-area-inset-bottom))]');
    expect(footer).toHaveClass('px-3', 'sm:px-4', 'md:px-6');
    expect(footer).toHaveClass('md:left-60', 'lg:left-64');
    expect(footerContent).toHaveClass('max-w-lg', 'xl:max-w-6xl');
  });

  it('lets users pick a customer property for the quote snapshot', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<QuoteForm customers={[CUSTOMER]} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.selectOptions(screen.getByLabelText('Property'), '1');
    await user.type(screen.getByLabelText('Title'), 'Warehouse repaint');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-04-10');
    await addDetailedSpecificRoom(user);
    await user.click(screen.getByRole('button', { name: 'Save Quote' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        customer_address: '9 Storage Lane, Unit 4, Brookvale, NSW, 2100',
      })
    );
  });

  it('shows detailed estimate directly without the nested quick advanced switcher', async () => {
    const user = userEvent.setup();

    render(<QuoteForm customers={[CUSTOMER]} />);

    await user.click(screen.getByRole('tab', { name: /Detailed/i }));

    expect(
      screen.getByRole('button', { name: 'Apartment' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Quick$/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Advanced$/i })
    ).not.toBeInTheDocument();
  });

  it('submits a quick whole-property preset snapshot', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const rateSettings = buildDefaultRateSettings();
    rateSettings.pricing.preferred_pricing_method = 'detailed_quick';

    render(
      <QuoteForm
        customers={[CUSTOMER]}
        onSubmit={onSubmit}
        rateSettings={rateSettings}
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Two bed apartment repaint');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-06-10');
    await user.click(
      screen.getByRole('button', { name: /2 Bed 2 Bath Apartment/i })
    );
    await user.click(screen.getByRole('button', { name: 'Save Quote' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];

    expect(payload.pricing_method).toBe('detailed_quick');
    expect(payload.pricing_method_inputs.inputs.property_preset).toEqual(
      expect.objectContaining({
        estimate_category: 'interior',
        label: '2 Bed 2 Bath Apartment',
        property_type: 'apartment',
        apartment_type: '2_bedroom_standard',
        bedrooms: 2,
        bathrooms: 2,
        sqm: 89,
        trim_paint_system: 'oil_2coat',
        subtotal_cents: 495650,
        total_cents: 545215,
      })
    );
  });

  it('applies the selected Quick Estimate trim base to room snapshots', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const rateSettings = buildDefaultRateSettings();
    rateSettings.pricing.preferred_pricing_method = 'detailed_quick';
    rateSettings.quick_estimate.property_presets = [];
    rateSettings.quick_estimate.rooms = [
      {
        id: 'quick-bedroom',
        version: 2,
        label: 'Bedroom',
        enabled_surfaces: ['trim'],
        sizes: {
          small: {
            walls_cents: 0,
            ceiling_cents: 0,
            trim_cents: 18000,
            trim_oil_cents: 18000,
            trim_water_cents: 36000,
          },
          medium: {
            walls_cents: 0,
            ceiling_cents: 0,
            trim_cents: 20000,
            trim_oil_cents: 20000,
            trim_water_cents: 42000,
          },
          large: {
            walls_cents: 0,
            ceiling_cents: 0,
            trim_cents: 24000,
            trim_oil_cents: 24000,
            trim_water_cents: 50000,
          },
        },
        sort_order: 0,
      },
    ];

    render(
      <QuoteForm
        customers={[CUSTOMER]}
        onSubmit={onSubmit}
        rateSettings={rateSettings}
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Water base trim quote');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-06-10');
    await user.click(screen.getByRole('button', { name: 'Water Base' }));
    await user.click(screen.getByRole('button', { name: '+ Bedroom' }));
    await user.click(screen.getByRole('button', { name: 'Save Quote' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];

    expect(payload.pricing_method_inputs.inputs.global_trim_paint_system).toBe(
      'water_3coat_white_finish'
    );
    expect(payload.pricing_method_inputs.inputs.rooms[0]).toEqual(
      expect.objectContaining({
        label: 'Bedroom',
        selected_surfaces: ['trim'],
        trim_paint_system: 'water_3coat_white_finish',
        trim_cents: 42000,
        total_cents: 42000,
      })
    );
  });

  it('copies advanced room library items into the quote snapshot', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const rateSettings = buildDefaultRateSettings();
    rateSettings.quick_estimate.rooms = [
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
    rateSettings.detailed_estimate_items.advanced_rooms = [
      {
        id: 'adv-bedroom-repaint',
        version: 2,
        label: 'Bedroom repaint',
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

    render(
      <QuoteForm
        customers={[CUSTOMER]}
        onSubmit={onSubmit}
        rateSettings={rateSettings}
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Bedroom repaint quote');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-04-10');
    await user.click(screen.getByRole('tab', { name: /Detailed/i }));
    await user.click(screen.getByRole('button', { name: 'Bedroom repaint' }));

    expect(screen.getByLabelText('Room Name')).toHaveValue('Bedroom repaint');

    await user.click(screen.getByRole('button', { name: 'Save Quote' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.interior_estimate.rooms).toEqual([
      expect.objectContaining({
        name: 'Bedroom repaint',
        anchor_room_type: 'Bedroom',
        height_m: null,
        include_walls: true,
        include_ceiling: true,
        include_trim: false,
        source_rate_item_id: 'adv-bedroom-repaint',
        source_rate_item_version: 2,
        source_rate_item_label: 'Bedroom repaint',
        source_room_template_id: 'quick-bedroom',
        source_room_template_version: 2,
        source_room_template_label: 'Bedroom',
        source_room_template_size: 'medium',
        source_room_template_surface_prices_cents: {
          walls_cents: 120000,
          ceiling_cents: 45000,
          trim_cents: 0,
        },
        rate_snapshot_version: 1,
        source_anchor_range_cents: {
          min: 120000,
          median: 165000,
          max: 210000,
        },
        source_surface_rate_multiplier: 1,
        source_scope_multiplier: 1,
        source_condition: 'fair',
        source_wall_paint_system: 'repaint_2coat',
      }),
    ]);
  });

  it('removes room-level door and window toggles from advanced room surfaces', async () => {
    const user = userEvent.setup();

    render(<QuoteForm customers={[CUSTOMER]} />);

    await user.click(screen.getByRole('tab', { name: /Detailed/i }));
    await user.click(screen.getByRole('button', { name: 'Add Room' }));

    expect(
      screen.getAllByRole('button', { name: 'Walls' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Ceiling' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Trim' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole('button', { name: /^Doors$/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Windows$/i })
    ).not.toBeInTheDocument();
  });

  it('starts detailed specific areas empty at zero dollars', async () => {
    const user = userEvent.setup();

    render(<QuoteForm customers={[CUSTOMER]} />);

    await user.click(screen.getByRole('tab', { name: /Detailed/i }));

    expect(getEstimateTotalsKey()).toBe('0');
    expect(screen.queryByLabelText('Room Name')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Walls' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Refresh (1 coat)' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Water Base' })
    ).not.toBeInTheDocument();
  });

  it('applies detailed specific-area pricing controls per room', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const rateSettings = buildDefaultRateSettings();

    render(
      <QuoteForm
        customers={[CUSTOMER]}
        onSubmit={onSubmit}
        rateSettings={rateSettings}
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Per-room detailed quote');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-06-10');
    await user.click(screen.getByRole('tab', { name: /Detailed/i }));
    await user.click(screen.getByRole('button', { name: 'Add Room' }));
    await user.selectOptions(screen.getByLabelText('Condition for Room 1'), 'poor');
    await user.click(screen.getByRole('button', { name: 'Trim' }));
    await user.click(screen.getByRole('button', { name: 'New Plaster (3 coats)' }));
    await user.click(screen.getByRole('button', { name: 'Water Base' }));
    await user.click(screen.getByRole('button', { name: 'Save Quote' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const room = onSubmit.mock.calls[0][0].interior_estimate.rooms[0];

    expect(room).toEqual(
      expect.objectContaining({
        include_trim: true,
        source_condition: 'poor',
        source_wall_paint_system: 'new_plaster_3coat',
        source_trim_paint_system: 'water_3coat_white_finish',
        source_surface_rate_multiplier: expect.any(Number),
      })
    );
  });

  it('keeps specific-area room trim base and dimensions out of the way until needed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<QuoteForm customers={[CUSTOMER]} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Room repaint quote');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-06-10');
    await user.click(screen.getByRole('tab', { name: /Detailed/i }));
    await user.click(screen.getByRole('button', { name: 'Add Room' }));

    expect(screen.queryByLabelText('Length (m)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Width (m)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Height (m)')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Oil Base' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Water Base' })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Trim' }));

    expect(screen.getByRole('button', { name: 'Oil Base' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Water Base' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save Quote' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const room = onSubmit.mock.calls[0][0].interior_estimate.rooms[0];

    expect(room).toEqual(
      expect.objectContaining({
        length_m: null,
        width_m: null,
        height_m: null,
      })
    );
  });

  it('hides whole-property fields in detailed specific areas', async () => {
    const user = userEvent.setup();

    render(<QuoteForm customers={[CUSTOMER]} />);

    await user.click(screen.getByRole('tab', { name: /Detailed/i }));

    expect(screen.queryByLabelText('Apartment Type')).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Apartment Size (sqm)')
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'House' }));

    expect(screen.queryByLabelText('Bedrooms')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Bathrooms')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Storeys')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('House Size (sqm)')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Entire Property' }));

    expect(screen.getByLabelText('Bedrooms')).toBeInTheDocument();
    expect(screen.getByLabelText('Bathrooms')).toBeInTheDocument();
    expect(screen.getByLabelText('Storeys')).toBeInTheDocument();
    expect(screen.getByLabelText('House Size (sqm)')).toBeInTheDocument();
  });

  it('submits detailed specific areas without whole-property details', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<QuoteForm customers={[CUSTOMER]} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Partial house repaint');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-06-10');
    await user.click(screen.getByRole('tab', { name: /Detailed/i }));
    await user.click(screen.getByRole('button', { name: 'House' }));
    await user.click(screen.getByRole('button', { name: 'Add Room' }));
    await user.click(screen.getByRole('button', { name: 'Save Quote' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    expect(onSubmit.mock.calls[0][0].interior_estimate.property_details).toEqual(
      {
        apartment_type: null,
        sqm: null,
        bedrooms: null,
        bathrooms: null,
        storeys: null,
      }
    );
  });

  it('updates detailed estimate total when switching estimate modes', async () => {
    const user = userEvent.setup();
    const rateSettings = buildDefaultRateSettings();

    render(<QuoteForm customers={[CUSTOMER]} rateSettings={rateSettings} />);

    await user.click(screen.getByRole('tab', { name: /Detailed/i }));

    const specificAreasTotal = getEstimateTotalsKey();

    await user.click(screen.getByRole('button', { name: 'Entire Property' }));

    await waitFor(() => {
      expect(getEstimateTotalsKey()).not.toBe(specificAreasTotal);
    });

    const entirePropertyTotal = getEstimateTotalsKey();

    await user.click(screen.getByRole('button', { name: 'Specific Areas' }));

    await waitFor(() => {
      expect(getEstimateTotalsKey()).toBe(specificAreasTotal);
    });
    expect(entirePropertyTotal).not.toBe(specificAreasTotal);
  });

  it('blocks quote submit when a selected quick source resolves to zero dollars', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const rateSettings = buildDefaultRateSettings();
    rateSettings.pricing.preferred_pricing_method = 'detailed_quick';
    rateSettings.quick_estimate.rooms = [
      {
        id: 'quick-bedroom',
        version: 1,
        label: 'Bedroom',
        enabled_surfaces: ['walls'],
        sizes: {
          small: { walls_cents: 0, ceiling_cents: 0, trim_cents: 0 },
          medium: { walls_cents: 0, ceiling_cents: 0, trim_cents: 0 },
          large: { walls_cents: 0, ceiling_cents: 0, trim_cents: 0 },
        },
        sort_order: 0,
      },
    ];

    render(
      <QuoteForm
        customers={[CUSTOMER]}
        onSubmit={onSubmit}
        rateSettings={rateSettings}
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Zero quick quote');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-06-10');
    await user.click(screen.getByRole('button', { name: '+ Bedroom' }));

    expect(screen.getByText(/Bedroom walls is A\$0/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save Quote' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks advanced submit when all room surfaces are deselected', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<QuoteForm customers={[CUSTOMER]} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Invalid advanced quote');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-06-10');
    await user.click(screen.getByRole('tab', { name: /Detailed/i }));
    await user.click(screen.getByRole('button', { name: 'Add Room' }));
    await user.click(screen.getByRole('button', { name: 'Walls' }));
    await user.click(screen.getByRole('button', { name: 'Ceiling' }));

    expect(
      screen.getByText(/Select at least one surface for Room 1/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save Quote' }));

    expect(onSubmit).not.toHaveBeenCalled();
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

  it('pre-fills advanced estimate coating from interior estimate defaults', () => {
    render(
      <QuoteForm
        customers={[CUSTOMER]}
        defaultValues={{
          customer_id: CUSTOMER.id,
          title: 'New plaster quote',
          status: 'draft',
          valid_until: '2026-04-24',
          notes: '',
          internal_notes: '',
          rooms: [],
          interior_estimate: {
            property_type: 'apartment',
            estimate_mode: 'specific_areas',
            condition: 'fair',
            scope: ['walls', 'ceiling'],
            wall_paint_system: 'new_plaster_3coat',
            property_details: {
              apartment_type: '2_bedroom_standard',
              sqm: null,
              bedrooms: null,
              bathrooms: null,
              storeys: null,
            },
            rooms: [
              {
                name: 'Living Room',
                anchor_room_type: 'Living Room',
                room_type: 'interior',
                length_m: null,
                width_m: null,
                height_m: null,
                include_walls: true,
                include_ceiling: true,
                include_trim: false,
              },
            ],
            opening_items: [],
            trim_items: [],
          },
        }}
      />
    );

    expect(
      screen.getByRole('button', { name: 'New Plaster (3 coats)' })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies the selected detailed trim base to specific-area room trim', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const rateSettings = buildDefaultRateSettings();

    render(
      <QuoteForm
        customers={[CUSTOMER]}
        onSubmit={onSubmit}
        rateSettings={rateSettings}
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Water base detailed trim');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-06-10');
    await user.click(screen.getByRole('tab', { name: /Detailed/i }));
    await user.click(screen.getByRole('button', { name: 'Add Room' }));
    await user.click(screen.getByRole('button', { name: 'Trim' }));
    await user.click(screen.getByRole('button', { name: 'Water Base' }));
    await user.click(screen.getByRole('button', { name: 'Save Quote' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];

    expect(payload.interior_estimate.rooms[0]).toEqual(
      expect.objectContaining({
        include_trim: true,
        source_trim_paint_system: 'water_3coat_white_finish',
        source_surface_rate_multiplier: expect.any(Number),
      })
    );
    expect(
      payload.interior_estimate.rooms[0].source_surface_rate_multiplier
    ).toBeGreaterThan(1);
  });

  it('ignores invalid saved interior estimate defaults instead of crashing edit mode', () => {
    render(
      <QuoteForm
        customers={[CUSTOMER]}
        defaultValues={{
          customer_id: CUSTOMER.id,
          title: 'Legacy quote',
          status: 'draft',
          valid_until: '2026-04-24',
          notes: '',
          internal_notes: '',
          rooms: [],
          interior_estimate: {} as never,
        }}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Apartment' })
    ).toBeInTheDocument();
  });

  it('shows the estimate total', () => {
    render(<QuoteForm customers={[CUSTOMER]} />);

    expect(screen.getAllByText('Estimate Total').length).toBeGreaterThan(0);
  });

  it('shows the provided quote number preview', () => {
    render(<QuoteForm customers={[CUSTOMER]} quoteNumberPreview="QUO-0042" />);

    expect(screen.getAllByText('QUO-0042').length).toBeGreaterThan(0);
  });

  it('treats sqm_rate as the detailed estimate default in the quote form', () => {
    const rateSettings = buildDefaultRateSettings();
    rateSettings.pricing.preferred_pricing_method = 'sqm_rate';

    render(<QuoteForm customers={[CUSTOMER]} rateSettings={rateSettings} />);

    expect(screen.getByRole('tab', { name: /Detailed/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Apartment' })).toBeInTheDocument();
    expect(screen.getByLabelText('Labour Markup')).toBeInTheDocument();
  });

  it('shows that detailed estimate uses anchors from Price Rates', () => {
    render(<QuoteForm customers={[CUSTOMER]} />);

    expect(
      screen.getByText(/Using Detailed Estimate Anchors from Price Rates/i)
    ).toBeInTheDocument();
  });

  it('adds a saved room preset to a room-rate quote and submits it', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const rateSettings = buildDefaultRateSettings();
    rateSettings.pricing.preferred_pricing_method = 'room_rate';
    rateSettings.room_rate_presets = [
      {
        id: 'preset-bedroom',
        title: 'Master Bedroom',
        sqm: 18,
        rate_cents: 45000,
      },
    ];

    render(
      <QuoteForm
        customers={[CUSTOMER]}
        onSubmit={onSubmit}
        rateSettings={rateSettings}
      />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Preset-based room quote');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-04-12');

    await user.click(screen.getByRole('button', { name: /Master Bedroom/i }));
    expect(
      screen.getByDisplayValue('Master Bedroom (18 sqm)')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save Quote' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.pricing_method).toBe('room_rate');
    expect(payload.pricing_method_inputs?.method).toBe('room_rate');
    expect(payload.pricing_method_inputs?.inputs?.rooms).toHaveLength(1);
    expect(payload.pricing_method_inputs?.inputs?.rooms[0]).toMatchObject({
      name: 'Master Bedroom (18 sqm)',
      rate_cents: 45000,
    });
  });

  it('hides markup controls when day rate pricing is selected', async () => {
    const user = userEvent.setup();

    render(<QuoteForm customers={[CUSTOMER]} />);

    expect(screen.getByLabelText('Labour Markup')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /By day.*Labour.*days/i }));
    expect(screen.queryByLabelText('Labour Markup')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Materials Markup')).not.toBeInTheDocument();
  });

  it('includes line items in day-rate preview totals', async () => {
    const user = userEvent.setup();

    render(<QuoteForm customers={[CUSTOMER]} libraryItems={[LIBRARY_ITEM]} />);

    await user.click(screen.getByRole('tab', { name: /By day.*Labour.*days/i }));

    expect(getEstimateTotalsCents()).toEqual([114400]);

    await addLibraryItemToQuote(user);

    expect(getEstimateTotalsCents()).toEqual([125400]);
    expect(screen.getAllByText('Materials & Services').length).toBeGreaterThan(
      0
    );
  });

  it('matches canonical server totals for a known day-rate fixture', () => {
    const expected = calculateQuoteTotals({
      base_subtotal_cents: 250000,
      discount_cents: 10000,
      line_items: [
        {
          quantity: 1,
          unit_price_cents: 30000,
          is_optional: false,
          is_selected: true,
        },
        {
          quantity: 1,
          unit_price_cents: 40000,
          is_optional: true,
          is_selected: false,
        },
      ],
    });

    render(
      <QuoteForm
        customers={[CUSTOMER]}
        defaultValues={{
          customer_id: CUSTOMER.id,
          title: 'Canonical fixture quote',
          status: 'draft',
          valid_until: '2026-04-10',
          notes: '',
          internal_notes: '',
          rooms: [],
          pricing_method: 'day_rate',
          pricing_method_inputs: {
            method: 'day_rate',
            inputs: {
              days: 2,
              daily_rate_cents: 100000,
              material_method: 'percentage',
              material_percent: 25,
            },
          },
          discount_cents: 10000,
          line_items: [
            {
              name: 'Feature wall upgrade',
              category: 'service',
              unit: 'item',
              quantity: 1,
              unit_price_cents: 30000,
              is_optional: false,
              is_selected: true,
            },
            {
              name: 'Optional garage door',
              category: 'service',
              unit: 'item',
              quantity: 1,
              unit_price_cents: 40000,
              is_optional: true,
              is_selected: false,
            },
          ],
        }}
      />
    );

    expect(getEstimateTotalsCents()).toEqual([expected.total_cents]);
    expect(screen.getAllByText('$2,800.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-$100.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+$270.00').length).toBeGreaterThan(0);
  });

  it('includes line items in hybrid preview totals', async () => {
    const user = userEvent.setup();

    render(<QuoteForm customers={[CUSTOMER]} libraryItems={[LIBRARY_ITEM]} />);

    const before = getEstimateTotalsCents()[0];

    await addLibraryItemToQuote(user);

    expect(getEstimateTotalsCents()).toEqual([before + 11000]);
    expect(screen.getAllByText('Materials & Services').length).toBeGreaterThan(
      0
    );
  });

  it('keeps paint quantities editable while enforcing whole numbers', async () => {
    const user = userEvent.setup();

    render(<QuoteForm customers={[CUSTOMER]} libraryItems={[LIBRARY_ITEM]} />);

    await user.click(screen.getByRole('button', { name: 'Add Item' }));
    await user.click(
      screen.getByRole('button', { name: /Premium wash & wear/i })
    );

    const pickerQuantityInput = screen.getByLabelText(
      'Premium wash & wear quantity'
    );
    await user.clear(pickerQuantityInput);
    await user.type(pickerQuantityInput, '2');
    expect(pickerQuantityInput).toHaveValue('2');

    await user.click(screen.getByRole('button', { name: 'Add to Quote' }));

    const quoteQuantityInput = screen.getByLabelText(
      'Premium wash & wear quantity'
    );
    expect(quoteQuantityInput).toHaveValue('2');

    await user.clear(quoteQuantityInput);
    await user.type(quoteQuantityInput, '7');
    expect(quoteQuantityInput).toHaveValue('7');
  });

  it('keeps optional line items out of totals until optional is unchecked', async () => {
    const user = userEvent.setup();

    render(<QuoteForm customers={[CUSTOMER]} libraryItems={[LIBRARY_ITEM]} />);

    // Establish a base total with the default detailed estimate room.
    const before = getEstimateTotalsCents()[0];

    // Add a new line item via "Add Line Item"
    await user.click(screen.getByRole('button', { name: 'Add Line Item' }));
    const priceInput = screen.getByLabelText('Line item price');
    // Set price to $100 (= 10000 cents); with 10% GST → +$11000 cents to total
    fireEvent.change(priceInput, { target: { value: '100' } });
    await user.type(screen.getByLabelText('Line item name'), 'Ceiling repaint');

    // Without optional: item is included in total
    const withItemTotal = getEstimateTotalsCents()[0];
    expect(withItemTotal).toBe(before + 11000);

    // Mark as optional → excluded from total
    await user.click(screen.getByLabelText(/Ceiling repaint optional/i));
    expect(getEstimateTotalsCents()).toEqual([before]);
    expect(
      screen.getByText(/Optional \(not included in total\)/i)
    ).toBeInTheDocument();

    // Unmark optional → included again
    await user.click(screen.getByLabelText(/Ceiling repaint optional/i));
    expect(getEstimateTotalsCents()).toEqual([withItemTotal]);
  });

  it('warns when a custom line item looks like a priced scope already in the estimate', async () => {
    const user = userEvent.setup();

    render(<QuoteForm customers={[CUSTOMER]} libraryItems={[LIBRARY_ITEM]} />);

    await addDetailedSpecificRoom(user);
    await user.click(screen.getByRole('button', { name: 'Add Line Item' }));
    await user.type(screen.getByLabelText('Line item name'), 'Living room walls');

    expect(
      screen.getByText(/already includes Living Room walls/i)
    ).toBeInTheDocument();
  });

  it('suggests saved service items for custom line items and autofills them', async () => {
    const user = userEvent.setup();
    render(
      <QuoteForm
        customers={[CUSTOMER]}
        libraryItems={[LIBRARY_ITEM, SERVICE_ITEM]}
        defaultValues={{
          customer_id: CUSTOMER.id,
          title: 'Quote with suggested service',
          status: 'draft',
          valid_until: '2026-04-18',
          notes: '',
          internal_notes: '',
          rooms: [],
        }}
      />
    );

    const before = getEstimateTotalsCents()[0];
    await user.click(screen.getByRole('button', { name: 'Add Line Item' }));
    await user.type(screen.getByLabelText('Line item name'), 'ceiling');

    await user.click(screen.getByRole('button', { name: /Ceiling repaint/i }));

    expect(screen.getByLabelText('Line item name')).toHaveValue(
      'Ceiling repaint'
    );
    expect(screen.getByLabelText('Line item description')).toHaveValue(
      'Two-coat ceiling repaint service'
    );
    expect(screen.getByLabelText('Line item price')).toHaveValue('225.00');
    expect(getEstimateTotalsCents()).toEqual([before + 24750]);
  });

  it('applies custom rate settings to the quick quote preview engine', () => {
    const state = {
      wall_paint_system: 'repaint_2coat' as const,
      manual_adjustment_cents: 0,
      rooms: [
        {
          name: 'Living Room',
          anchor_room_type: 'Living Room' as const,
          size: 'medium' as const,
          condition: 'normal' as const,
          include_walls: true,
          include_ceiling: true,
          include_trim: true,
          trim_paint_system: 'oil_2coat' as const,
          door_count: 1,
          door_scope: 'door_and_frame' as const,
          window_count: 1,
          window_type: 'normal' as const,
          window_scope: 'window_and_frame' as const,
          include_skirting: true,
          skirting_lm_override: null,
        },
      ],
    };

    const baseline = calculateQuickQuotePreview(state);

    const userRates = buildDefaultRateSettings();
    userRates.door_unit_rates.oil_2coat.standard.door_and_frame = 35000;
    userRates.window_unit_rates.oil_2coat.normal.window_and_frame = 32000;

    const adjusted = calculateQuickQuotePreview(state, userRates);

    expect(adjusted.subtotal_cents).toBeGreaterThan(baseline.subtotal_cents);
    expect(adjusted.total_cents).toBeGreaterThan(baseline.total_cents);
  });
});
