import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardSidebar from '@/components/dashboard/Sidebar';

let mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

describe('DashboardSidebar navigation regressions', () => {
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
      />
    );

    const bottomNavigation = screen.getByRole('navigation', {
      name: 'Bottom navigation',
    });
    await user.click(
      within(bottomNavigation).getByRole('button', { name: /More/i })
    );
    expect(
      screen.getByRole('navigation', { name: 'More navigation' })
    ).toBeInTheDocument();

    await user.click(
      within(bottomNavigation).getByRole('link', { name: /Quotes/i })
    );

    expect(
      screen.queryByRole('navigation', { name: 'More navigation' })
    ).not.toBeInTheDocument();
  });

  it('uses the canonical brand logo and shared navigation layer', () => {
    const { container } = render(
      <DashboardSidebar
        businessName="Coatly Painting"
        planLabel="Pro"
        isPro
        signOut={vi.fn(async () => {})}
      />
    );

    expect(screen.getAllByAltText('Coatly logo')).toHaveLength(2);
    expect(container.querySelector('aside')).toHaveClass('z-40');
    expect(container.querySelector('aside')).not.toHaveClass('z-50');
    expect(
      Array.from(container.querySelectorAll('[style]')).some((element) =>
        element.getAttribute('style')?.includes('letter-spacing')
      )
    ).toBe(false);

    const mainNavigation = screen.getByRole('navigation', {
      name: 'Main navigation',
    });
    expect(
      within(mainNavigation).getByRole('link', { name: 'Dashboard' })
    ).toHaveClass('min-h-11', 'focus-visible:ring-2');
  });
});
