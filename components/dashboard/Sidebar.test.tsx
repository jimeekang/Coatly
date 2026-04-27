import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DashboardSidebar from '@/components/dashboard/Sidebar';
import { buildSubscriptionSnapshot } from '@/lib/subscription/access';

vi.mock('next/navigation', () => ({
  usePathname: () => '/schedule',
}));

vi.mock('@/app/actions/auth', () => ({
  signOut: vi.fn(),
}));

describe('DashboardSidebar', () => {
  it('shows Schedule before Quotes in the mobile bottom navigation', () => {
    render(
      <DashboardSidebar
        businessName="Coatly Painting"
        subscription={buildSubscriptionSnapshot({ plan: 'starter', status: 'active' })}
      />,
    );

    const bottomNavigation = screen.getByRole('navigation', { name: 'Bottom navigation' });
    const links = within(bottomNavigation).getAllByRole('link');

    expect(links.map((link) => link.textContent)).toEqual([
      'Dashboard',
      'Schedule',
      'Quotes',
      'Invoices',
      'Customers',
      'Settings',
    ]);
    expect(within(bottomNavigation).getByRole('link', { name: /Schedule/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
