import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardSidebar from '@/components/dashboard/Sidebar';

let mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

describe('DashboardSidebar mobile navigation regressions', () => {
  beforeEach(() => {
    mockPathname = '/dashboard';
  });

  it('closes the More sheet when navigating to a primary destination', async () => {
    const user = userEvent.setup();
    render(
      <DashboardSidebar
        businessName="Coatly Painting"
        planLabel="Starter"
        isPro={false}
        signOut={vi.fn(async () => {})}
      />,
    );

    const bottomNavigation = screen.getByRole('navigation', { name: 'Bottom navigation' });
    await user.click(within(bottomNavigation).getByRole('button', { name: /More/i }));
    expect(screen.getByRole('navigation', { name: 'More navigation' })).toBeInTheDocument();

    await user.click(within(bottomNavigation).getByRole('link', { name: /Quotes/i }));

    expect(screen.queryByRole('navigation', { name: 'More navigation' })).not.toBeInTheDocument();
  });
});
