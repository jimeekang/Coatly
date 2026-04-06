import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateQuickQuotePreview } from '@/components/quotes/QuickQuoteBuilder';
import { QuoteForm } from '@/components/quotes/QuoteForm';
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
  phone: '0412 555 012',
  address: '128 Beach Street, Manly, NSW 2095',
};

const CUSTOMER_WITHOUT_EMAIL = {
  ...CUSTOMER,
  id: '550e8400-e29b-41d4-a716-446655440099',
  email: null,
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
        const value = label.parentElement?.querySelectorAll('p')[1]?.textContent;
        if (!value) {
          throw new Error('Estimate total value not found');
        }

        return parseAudTextToCents(value);
      })
    )
  );
}

async function addLibraryItemToQuote(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Add Item' }));
  await user.click(screen.getByRole('button', { name: /Premium wash & wear/i }));
  await user.click(screen.getByRole('button', { name: 'Add to Quote' }));
}

describe('QuoteForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits a quick-mode payload when a room preset is added and form submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<QuoteForm customers={[CUSTOMER]} onSubmit={onSubmit} />);

    // Fill basic details
    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Harbor Cafe repaint');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-04-10');

    // Add a Living Room via the room preset grid
    await user.click(screen.getByRole('button', { name: /Living Room/i }));

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
    expect(payload.interior_estimate.rooms[0].anchor_room_type).toBe('Living Room');
    expect(typeof payload.manual_adjustment_cents).toBe('number');
  });

  it('passes send_email intent when the send button is used on new quote', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <QuoteForm customers={[CUSTOMER]} onSubmit={onSubmit} showSendQuoteButton />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER.id);
    await user.type(screen.getByLabelText('Title'), 'Email-ready quote');
    await user.clear(screen.getByLabelText('Valid Until'));
    await user.type(screen.getByLabelText('Valid Until'), '2026-04-10');
    await user.click(screen.getByRole('button', { name: /Living Room/i }));
    await user.click(screen.getByRole('button', { name: 'Send Quote to Email' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][1]).toBe('send_email');
  });

  it('disables send quote button when the selected customer has no email', async () => {
    const user = userEvent.setup();

    render(
      <QuoteForm customers={[CUSTOMER_WITHOUT_EMAIL]} showSendQuoteButton />
    );

    await user.selectOptions(screen.getByLabelText('Customer'), CUSTOMER_WITHOUT_EMAIL.id);
    expect(screen.getByRole('button', { name: 'Send Quote to Email' })).toBeDisabled();
  });

  it('switches to advanced mode and shows InteriorEstimateBuilder', async () => {
    const user = userEvent.setup();

    render(<QuoteForm customers={[CUSTOMER]} />);

    await user.click(screen.getByRole('button', { name: /Advanced/i }));

    // Advanced mode renders property-type toggle buttons from InteriorEstimateBuilder
    expect(screen.getByRole('button', { name: 'Apartment' })).toBeInTheDocument();
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

    expect(screen.getByRole('button', { name: /Quick/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Labour Markup')).toBeInTheDocument();
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
    expect(screen.getByDisplayValue('Master Bedroom (18 sqm)')).toBeInTheDocument();

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
    await user.click(screen.getByRole('button', { name: /Labour.*days/i }));
    expect(screen.queryByLabelText('Labour Markup')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Materials Markup')).not.toBeInTheDocument();
  });

  it('includes line items in day-rate preview totals', async () => {
    const user = userEvent.setup();

    render(<QuoteForm customers={[CUSTOMER]} libraryItems={[LIBRARY_ITEM]} />);

    await user.click(screen.getByRole('button', { name: /Labour.*days/i }));

    expect(getEstimateTotalsCents()).toEqual([114400]);

    await addLibraryItemToQuote(user);

    expect(getEstimateTotalsCents()).toEqual([125400]);
    expect(screen.getAllByText('Materials & Services').length).toBeGreaterThan(0);
  });

  it('includes line items in hybrid preview totals', async () => {
    const user = userEvent.setup();

    render(<QuoteForm customers={[CUSTOMER]} libraryItems={[LIBRARY_ITEM]} />);

    await user.click(screen.getByRole('button', { name: /Living Room/i }));
    const before = getEstimateTotalsCents()[0];

    await addLibraryItemToQuote(user);

    expect(getEstimateTotalsCents()).toEqual([before + 11000]);
    expect(screen.getAllByText('Materials & Services').length).toBeGreaterThan(0);
  });

  it('keeps optional line items out of totals until optional is unchecked', async () => {
    const user = userEvent.setup();

    render(<QuoteForm customers={[CUSTOMER]} libraryItems={[LIBRARY_ITEM]} />);

    // Establish a base total with a room
    await user.click(screen.getByRole('button', { name: /Living Room/i }));
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
    expect(screen.getByText(/Optional \(not included in total\)/i)).toBeInTheDocument();

    // Unmark optional → included again
    await user.click(screen.getByLabelText(/Ceiling repaint optional/i));
    expect(getEstimateTotalsCents()).toEqual([withItemTotal]);
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

    await user.click(screen.getByRole('button', { name: /Living Room/i }));

    await user.click(screen.getByRole('button', { name: 'Add Line Item' }));
    await user.type(screen.getByLabelText('Line item name'), 'ceiling');

    await user.click(screen.getByRole('button', { name: /Ceiling repaint/i }));

    expect(screen.getByLabelText('Line item name')).toHaveValue('Ceiling repaint');
    expect(screen.getByLabelText('Line item description')).toHaveValue(
      'Two-coat ceiling repaint service'
    );
    expect(screen.getByLabelText('Line item price')).toHaveValue('225.00');
    expect(getEstimateTotalsCents()).toEqual([376090]);
  });

  it('applies custom rate settings to the quick quote preview engine', () => {
    const state = {
      wall_paint_system: 'standard_2coat' as const,
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
