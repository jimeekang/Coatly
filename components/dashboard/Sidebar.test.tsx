import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardSidebar from '@/components/dashboard/Sidebar';

let mockPathname = '/schedule';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

const signOut = vi.fn(async () => {});

describe('DashboardSidebar', () => {
  beforeEach(() => {
    mockPathname = '/schedule';
  });

  it('replaces Settings with More in the mobile bottom navigation', () => {
    render(
      <DashboardSidebar
        businessName="Coatly Painting"
        planLabel="Starter"
        isPro={false}
        signOut={signOut}
      />,
    );

    const bottomNavigation = screen.getByRole('navigation', { name: 'Bottom navigation' });
    const linkItems = within(bottomNavigation).getAllByRole('link');
    const moreButton = within(bottomNavigation).queryByRole('button', { name: /More/i });
    const items = moreButton ? [...linkItems, moreButton] : linkItems;

    expect(items.map((item) => item.textContent)).toEqual([
      'Home',
      'Schedule',
      'Quotes',
      'Invoices',
      'More',
    ]);
    expect(within(bottomNavigation).getByRole('link', { name: /Schedule/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(bottomNavigation).queryByRole('link', { name: /Settings/i })).not.toBeInTheDocument();
  });

  it('opens a More sheet with secondary mobile destinations', async () => {
    const user = userEvent.setup();
    render(
      <DashboardSidebar
        businessName="Coatly Painting"
        planLabel="Starter"
        isPro={false}
        signOut={signOut}
      />,
    );

    const bottomNavigation = screen.getByRole('navigation', { name: 'Bottom navigation' });
    await user.click(within(bottomNavigation).getByRole('button', { name: /More/i }));

    const moreNavigation = screen.getByRole('navigation', { name: 'More navigation' });
    expect(within(moreNavigation).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Customers',
      'Material / Service',
      'Price Rates',
      'Settings',
    ]);
  });

  it('keeps the More tab active for routes inside More', () => {
    mockPathname = '/price-rates';

    render(
      <DashboardSidebar
        businessName="Coatly Painting"
        planLabel="Starter"
        isPro={false}
        signOut={signOut}
      />,
    );

    const bottomNavigation = screen.getByRole('navigation', { name: 'Bottom navigation' });
    expect(within(bottomNavigation).getByRole('button', { name: /More/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
