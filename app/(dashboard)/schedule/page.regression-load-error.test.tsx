import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  getJobsMock,
  getScheduleEventsMock,
  listGoogleScheduleEventsForUserMock,
  scheduleCalendarMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getJobsMock: vi.fn(),
  getScheduleEventsMock: vi.fn(),
  listGoogleScheduleEventsForUserMock: vi.fn(),
  scheduleCalendarMock: vi.fn(() => <div data-testid="schedule-calendar" />),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));

vi.mock('@/modules/jobs/application/actions', () => ({
  addJobScheduleDay: vi.fn(),
  deleteJobScheduleDay: vi.fn(),
  getJobs: getJobsMock,
  updateJobSchedule: vi.fn(),
  updateJobScheduleDay: vi.fn(),
}));

vi.mock('@/modules/schedule/application/actions', () => ({
  getScheduleEvents: getScheduleEventsMock,
}));

vi.mock('@/modules/schedule/infrastructure/google-calendar/service', () => ({
  listGoogleScheduleEventsForUser: listGoogleScheduleEventsForUserMock,
}));

vi.mock('@/modules/schedule/ui/ScheduleCalendar', () => ({
  ScheduleCalendar: scheduleCalendarMock,
}));

import SchedulePage from './page';

describe('SchedulePage load failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServerClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
    });
    getJobsMock.mockResolvedValue({ data: [], error: null });
    getScheduleEventsMock.mockResolvedValue({ data: [], error: null });
    listGoogleScheduleEventsForUserMock.mockResolvedValue({
      events: [],
      error: null,
      connected: false,
    });
  });

  it.each([
    ['jobs', 'Jobs are temporarily unavailable.', () => getJobsMock],
    ['native schedule events', 'Schedule events are temporarily unavailable.', () => getScheduleEventsMock],
  ])('surfaces %s load errors without rendering the editable calendar', async (_, error, queryMock) => {
    queryMock().mockResolvedValue({ data: [], error });

    render(await SchedulePage({}));

    expect(screen.getByRole('alert')).toHaveTextContent(error);
    expect(screen.queryByTestId('schedule-calendar')).not.toBeInTheDocument();
    expect(scheduleCalendarMock).not.toHaveBeenCalled();
  });
});
