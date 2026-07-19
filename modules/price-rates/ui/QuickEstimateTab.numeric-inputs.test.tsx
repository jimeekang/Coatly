import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  buildDefaultQuickEstimateSettings,
  type QuickEstimateSettings,
} from '@/modules/price-rates/domain/rate-settings';
import { QuickEstimateTab } from '@/modules/price-rates/ui/QuickEstimateTab';

function QuickEstimateHarness() {
  const [settings, setSettings] = useState<QuickEstimateSettings>(() => {
    const initial = buildDefaultQuickEstimateSettings();
    return {
      ...initial,
      rooms: initial.rooms.filter((room) => room.label === 'Bedroom'),
    };
  });

  return (
    <>
      <QuickEstimateTab settings={settings} onChange={setSettings} />
      <output data-testid="quick-estimate-state">
        {JSON.stringify(settings)}
      </output>
    </>
  );
}

function readSettings() {
  return JSON.parse(
    screen.getByTestId('quick-estimate-state').textContent ?? '{}'
  ) as QuickEstimateSettings;
}

describe('QuickEstimateTab numeric inputs', () => {
  it('uses canonical controls, cards, and click targets', async () => {
    const user = userEvent.setup();
    render(<QuickEstimateHarness />);

    const coatingSection = screen
      .getByRole('heading', { name: 'Coating Type Multipliers' })
      .closest('section');
    expect(coatingSection).toHaveClass('rounded-2xl', 'border-outline-variant');

    const presetName = screen.getByLabelText(
      'Preset name for 2 Bed 2 Bath Apartment'
    );
    const propertyType = screen.getByLabelText(
      'Property type for 2 Bed 2 Bath Apartment'
    );
    for (const control of [presetName, propertyType]) {
      expect(control).toHaveClass(
        'h-12',
        'text-base',
        'rounded-xl',
        'border-outline-variant',
        'focus:border-primary',
        'focus:ring-primary/20'
      );
    }

    const expandRoom = screen.getByRole('button', {
      name: 'Expand Bedroom prices',
    });
    expect(expandRoom).toHaveClass(
      'h-11',
      'w-11',
      'rounded-xl',
      'focus-visible:ring-primary/20'
    );
    await user.click(expandRoom);
    const roomWallToggle = screen
      .getAllByRole('button', { name: 'Walls' })
      .at(-1);
    expect(roomWallToggle).toHaveClass(
      'min-h-11',
      'rounded-xl',
      'focus-visible:ring-primary/20'
    );

    const customRoomButton = screen.getByRole('button', {
      name: '+ New Custom Room',
    });
    expect(customRoomButton).toHaveClass(
      'min-h-11',
      'rounded-xl',
      'focus-visible:ring-primary/20'
    );
    await user.click(customRoomButton);

    expect(screen.getByPlaceholderText('Room name')).toHaveClass(
      'h-12',
      'text-base',
      'rounded-xl',
      'border-outline-variant',
      'focus:border-primary'
    );
    expect(screen.getByRole('button', { name: 'Add' })).toHaveClass(
      'min-h-11',
      'rounded-xl',
      'focus-visible:ring-primary/20'
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass(
      'min-h-11',
      'rounded-xl',
      'focus-visible:ring-primary/20'
    );
  });

  it('keeps decimal drafts and converts dollar prices to cents on blur', async () => {
    const user = userEvent.setup();
    render(<QuickEstimateHarness />);

    await user.click(
      screen.getByRole('button', { name: 'Expand Bedroom prices' })
    );

    const wallPrice = screen.getByLabelText('Bedroom Medium Walls price');
    expect(wallPrice).toHaveClass(
      'h-12',
      'text-base',
      'rounded-xl',
      'border-outline-variant',
      'focus:border-primary',
      'focus:ring-primary/20'
    );

    await user.clear(wallPrice);
    await user.type(wallPrice, '123.45x');
    expect(wallPrice).toHaveValue('123.45');
    await user.tab();

    await waitFor(() => {
      expect(readSettings().rooms[0].sizes.medium.walls_cents).toBe(12345);
    });

    const wallArea = screen.getByLabelText('Bedroom Medium Wall area sqm');
    await user.clear(wallArea);
    await user.type(wallArea, '12.5m');
    expect(wallArea).toHaveValue('12.5');
    await user.tab();

    await waitFor(() => {
      expect(readSettings().rooms[0].sizes.medium.wall_area_m2).toBe(12.5);
    });
  });

  it('sanitizes integer fields while preserving an empty focused draft', async () => {
    const user = userEvent.setup();
    render(<QuickEstimateHarness />);

    const multiplier = screen.getByLabelText('1 Coat Refresh multiplier');
    expect(multiplier).toHaveAttribute('min', '0');
    expect(multiplier).toHaveAttribute('step', '1');
    expect(multiplier).toHaveAttribute('inputmode', 'numeric');
    expect(multiplier).toHaveClass('h-12', 'text-base', 'rounded-xl');

    await user.clear(multiplier);
    expect(multiplier).toHaveValue('');
    expect(readSettings().coating_multipliers.one_coat_refresh_pct).toBe(70);

    await user.type(multiplier, '8.5x');
    expect(multiplier).toHaveValue('85');
    await waitFor(() => {
      expect(readSettings().coating_multipliers.one_coat_refresh_pct).toBe(85);
    });

    const wallShare = screen.getByLabelText(
      'Wall price share for 2 Bed 2 Bath Apartment'
    );
    expect(wallShare).toHaveAttribute('min', '0');
    expect(wallShare).toHaveAttribute('max', '100');
    expect(wallShare).toHaveClass(
      'h-12',
      'text-base',
      'rounded-xl',
      'focus:border-primary'
    );
  });
});
