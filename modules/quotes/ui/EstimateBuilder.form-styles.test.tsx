import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  createEmptyInteriorEstimateState,
  InteriorEstimateBuilder,
} from '@/modules/quotes/ui/InteriorEstimateBuilder';
import {
  createEmptyExteriorEstimateState,
  ExteriorEstimateBuilder,
} from '@/modules/quotes/ui/ExteriorEstimateBuilder';

const canonicalControlClasses = [
  'h-12',
  'text-base',
  'rounded-xl',
  'border-outline-variant',
  'focus:border-primary',
  'focus:ring-primary/20',
];

describe('estimate builder canonical form styling', () => {
  it('uses shared controls and labels for the interior estimate form', () => {
    const value = {
      ...createEmptyInteriorEstimateState(),
      estimate_mode: 'entire_property' as const,
    };

    render(<InteriorEstimateBuilder value={value} onChange={vi.fn()} />);

    expect(screen.getByLabelText('Apartment Type')).toHaveClass(
      ...canonicalControlClasses
    );
    expect(screen.getByLabelText('Apartment Size (sqm)')).toHaveClass(
      ...canonicalControlClasses
    );
    expect(screen.getByText('Property Type')).toHaveClass('font-semibold');
  });

  it('uses canonical controls for exterior quantities and label editing', async () => {
    const user = userEvent.setup();

    render(
      <ExteriorEstimateBuilder
        value={createEmptyExteriorEstimateState()}
        onChange={vi.fn()}
      />
    );

    const quantityInput = screen.getAllByPlaceholderText('0')[0];
    expect(quantityInput).toHaveClass(...canonicalControlClasses, 'w-24');
    expect(screen.getByText('Surface Quantities')).toHaveClass('font-semibold');

    await user.click(screen.getAllByTitle('Edit name')[0]);

    expect(screen.getByDisplayValue('Exterior Walls')).toHaveClass(
      ...canonicalControlClasses
    );
  });
});
