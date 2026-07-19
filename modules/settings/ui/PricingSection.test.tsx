import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PricingSection from './PricingSection';

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe('PricingSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('shows checkout failures with canonical visible feedback', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'Checkout is temporarily unavailable.' })
      )
    );
    render(<PricingSection subscription={null} />);

    await user.click(screen.getByRole('button', { name: 'Get Pro' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Checkout is temporarily unavailable.'
    );
  });

  it('preserves the Stripe checkout request contract', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Stop after request.' }))
    );
    render(
      <PricingSection subscription={null} returnPath="/settings/billing" />
    );

    await user.click(screen.getByRole('button', { name: 'Get Pro' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/stripe/checkout',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            planId: 'pro',
            interval: 'monthly',
            returnPath: '/settings/billing',
          }),
        })
      );
    });
  });

  it('keeps Starter visually secondary to the Pro CTA', () => {
    render(<PricingSection subscription={null} />);

    expect(screen.getByRole('button', { name: 'Get Starter' })).toHaveClass(
      'border-outline-variant',
      'bg-surface-container-lowest'
    );
    expect(screen.getByRole('button', { name: 'Get Pro' })).toHaveClass(
      'bg-primary',
      'text-on-primary'
    );
  });

  it('gives every visible control a 44px rounded focus-visible target', () => {
    render(
      <PricingSection
        subscription={{
          plan: 'pro',
          status: 'active',
          stripe_customer_id: 'cus_123',
          current_period_end: '2026-08-18T00:00:00.000Z',
          cancel_at_period_end: false,
          cancel_at: null,
        }}
      />
    );

    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveClass(
        'min-h-11',
        'rounded-xl',
        'focus-visible:ring-2'
      );
    }
  });
});
