import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  getBusinessProfileMock,
  getGoogleCalendarSummaryMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getBusinessProfileMock: vi.fn(),
  getGoogleCalendarSummaryMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));
vi.mock('@/modules/settings/infrastructure/businesses', () => ({
  getBusinessProfile: getBusinessProfileMock,
}));
vi.mock('@/modules/schedule/infrastructure/google-calendar/oauth', () => ({
  canUserConnectGoogleCalendar: () => false,
}));
vi.mock('@/modules/schedule/infrastructure/google-calendar/service', () => ({
  getGoogleCalendarIntegrationSummary: getGoogleCalendarSummaryMock,
}));
vi.mock('@/modules/schedule/application/google-calendar-actions', () => ({
  disconnectGoogleCalendarAction: vi.fn(),
  updateGoogleCalendarSettingsAction: vi.fn(),
}));
vi.mock('@/modules/settings/ui/BusinessProfileForm', () => ({
  default: () => <div data-testid="business-profile" />,
}));
vi.mock('@/modules/settings/ui/GoogleCalendarCard', () => ({
  default: () => <div data-testid="google-calendar" />,
}));

import SettingsPage from './page';

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'alex@example.com' } },
        }),
      },
    });
    getBusinessProfileMock.mockResolvedValue({
      data: { name: 'Alex Painting' },
      error: null,
    });
  });

  it('uses the canonical settings header, width, and spacing', async () => {
    const { container } = render(await SettingsPage({}));

    expect(
      screen.getByRole('heading', { name: 'Business Settings' })
    ).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass(
      'max-w-4xl',
      'flex',
      'flex-col',
      'gap-4',
      'sm:gap-6'
    );
  });

  it('preserves visible load-error feedback inside the canonical shell', async () => {
    getBusinessProfileMock.mockResolvedValue({
      data: null,
      error: 'Business settings are unavailable.',
    });

    render(await SettingsPage({}));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Business settings are unavailable.'
    );
  });
});
