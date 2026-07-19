import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { createServerClientMock, syncSubscriptionMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  syncSubscriptionMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));
vi.mock('@/modules/billing/application/subscription-sync', () => ({
  syncSubscriptionCacheForUser: syncSubscriptionMock,
}));
vi.mock('@/modules/settings/ui/PricingSection', () => ({
  default: () => <div data-testid="pricing-section" />,
}));

import BillingPage from './page';

describe('BillingPage', () => {
  it('uses the canonical billing header, width, and spacing', async () => {
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    });
    syncSubscriptionMock.mockResolvedValue(null);

    const { container } = render(await BillingPage());

    expect(
      screen.getByRole('heading', { name: 'Billing & subscription' })
    ).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass(
      'max-w-4xl',
      'flex',
      'flex-col',
      'gap-4',
      'sm:gap-6'
    );
  });
});
