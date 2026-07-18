import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { buildDefaultRateSettings } from '@/modules/price-rates/domain/rate-settings';
import { PriceRatesForm } from '@/modules/price-rates/ui/PriceRatesForm';

type PriceRatesFormProps = ComponentProps<typeof PriceRatesForm>;

function renderPriceRatesForm(overrides: Partial<PriceRatesFormProps> = {}) {
  const props: PriceRatesFormProps = {
    defaultRates: buildDefaultRateSettings(),
    updateRateSettingsAction: vi.fn().mockResolvedValue({ error: null }),
    createMaterialItem: vi.fn().mockResolvedValue({}),
    importMaterialItems: vi.fn().mockResolvedValue({ data: [] }),
    ...overrides,
  };

  render(<PriceRatesForm {...props} />);
  return props;
}

async function fillManualPriceItem(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Add Price Item/i }));
  await user.type(screen.getByLabelText('Service / Item'), 'Wall painting');
  await user.clear(screen.getByLabelText('Price'));
  await user.type(screen.getByLabelText('Price'), '18.50');
}

describe('PriceRatesForm rejected action regressions', () => {
  it('recovers the manual save button and surfaces a rejected save', async () => {
    const user = userEvent.setup();
    const createMaterialItem = vi
      .fn()
      .mockRejectedValue(new Error('Manual item service unavailable.'));

    renderPriceRatesForm({ createMaterialItem });
    await fillManualPriceItem(user);
    await user.click(screen.getByRole('button', { name: /Save Price Item/i }));

    expect(
      await screen.findByText('Manual item service unavailable.')
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Manual item service unavailable.'
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Save Price Item/i })
      ).not.toBeDisabled()
    );
    expect(screen.getByLabelText('Service / Item')).toHaveValue(
      'Wall painting'
    );
  });

  it('keeps returned manual save errors visible and recovers the pending flag', async () => {
    const user = userEvent.setup();
    const createMaterialItem = vi.fn().mockResolvedValue({
      error: 'Manual item was rejected by the server.',
    });

    renderPriceRatesForm({ createMaterialItem });
    await fillManualPriceItem(user);
    await user.click(screen.getByRole('button', { name: /Save Price Item/i }));

    expect(
      await screen.findByText('Manual item was rejected by the server.')
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Manual item was rejected by the server.'
    );
    expect(
      screen.getByRole('button', { name: /Save Price Item/i })
    ).not.toBeDisabled();
  });

  it('recovers the manual import button and surfaces a rejected import', async () => {
    const user = userEvent.setup();
    const importMaterialItems = vi
      .fn()
      .mockRejectedValue(new Error('Price book service unavailable.'));

    renderPriceRatesForm({ importMaterialItems });
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    await user.upload(
      fileInput,
      new File(
        ['Service / Item,Unit,Price\nWall painting,sqm,18.50'],
        'manual-price-book.csv',
        { type: 'text/csv' }
      )
    );

    await user.click(
      await screen.findByRole('button', { name: /Import items/i })
    );

    expect(
      await screen.findByText('Price book service unavailable.')
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Price book service unavailable.'
    );
    expect(screen.getByRole('alert')).toHaveClass(
      'rounded-xl',
      'border-error/20'
    );
    expect(
      screen.getByRole('button', { name: /Download Template/i })
    ).toHaveClass('rounded-xl', 'focus-visible:ring-2');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Import items/i })
      ).not.toBeDisabled()
    );
    expect(screen.getByText('Review 1 item before import')).toBeInTheDocument();
  });

  it('recovers Save Rates and surfaces a rejected rate settings save', async () => {
    const user = userEvent.setup();
    const updateRateSettingsAction = vi
      .fn()
      .mockRejectedValue(new Error('Rate settings service unavailable.'));
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'detailed_quick';

    renderPriceRatesForm({ defaultRates: rates, updateRateSettingsAction });
    await user.click(screen.getByRole('tab', { name: /Quick Estimate/i }));
    await user.click(screen.getByRole('button', { name: /Save Rates/i }));

    expect(
      await screen.findByText('Rate settings service unavailable.')
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Rate settings service unavailable.'
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Save Rates/i })
      ).not.toBeDisabled()
    );
  });

  it('keeps returned rate settings errors visible after the pending save recovers', async () => {
    const user = userEvent.setup();
    const updateRateSettingsAction = vi.fn().mockResolvedValue({
      error: 'Rate settings were rejected by the server.',
    });
    const rates = buildDefaultRateSettings();
    rates.pricing.preferred_pricing_method = 'detailed_quick';

    renderPriceRatesForm({ defaultRates: rates, updateRateSettingsAction });
    await user.click(screen.getByRole('tab', { name: /Quick Estimate/i }));
    await user.click(screen.getByRole('button', { name: /Save Rates/i }));

    expect(
      await screen.findByText('Rate settings were rejected by the server.')
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Rate settings were rejected by the server.'
    );
    expect(
      screen.getByRole('button', { name: /Save Rates/i })
    ).not.toBeDisabled();
  });
});
