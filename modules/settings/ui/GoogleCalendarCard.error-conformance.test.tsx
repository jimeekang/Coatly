import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GoogleCalendarCard from '@/modules/settings/ui/GoogleCalendarCard';
import type { GoogleCalendarIntegrationSummary } from '@/modules/schedule/infrastructure/google-calendar/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const integration: GoogleCalendarIntegrationSummary = {
  configured: true,
  connected: true,
  isActive: true,
  accountEmail: 'painter@example.com',
  calendars: [
    {
      id: 'primary',
      summary: 'Primary calendar',
      primary: true,
      accessRole: 'owner',
    },
  ],
  displayCalendarId: 'primary',
  availabilityCalendarId: 'primary',
  eventDestinationCalendarId: 'primary',
  timezone: 'Australia/Sydney',
  lastSyncAt: null,
  lastSyncError: null,
  warning: 'Calendar sync is delayed.',
};

describe('GoogleCalendarCard error conformance', () => {
  it('uses ErrorAlert for failures while keeping integration warnings distinct', () => {
    render(
      <GoogleCalendarCard
        integration={integration}
        canConnectGoogleCalendar
        errorMessage="Calendar settings failed to load."
        updateGoogleCalendarSettingsAction={vi.fn()}
        disconnectGoogleCalendarAction={vi.fn()}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Calendar settings failed to load.');
    expect(alert).toHaveClass('rounded-xl', 'border-error/20');

    const warning = screen.getByText('Calendar sync is delayed.');
    expect(warning).toHaveClass(
      'bg-warning-container',
      'text-on-warning-container'
    );
    expect(warning).not.toHaveAttribute('role', 'alert');

    expect(screen.getByRole('button', { name: 'Disconnect' })).toHaveClass(
      'rounded-xl',
      'focus-visible:ring-2'
    );
    expect(
      screen.getByRole('button', {
        name: 'Save Google Calendar settings',
      })
    ).toHaveClass('rounded-xl', 'focus-visible:ring-2');

    for (const select of screen.getAllByRole('combobox')) {
      expect(select).toHaveClass(
        'h-12',
        'rounded-xl',
        'border-outline-variant',
        'text-base',
        'focus:border-primary',
        'focus:ring-primary/20'
      );
    }
  });
});
