import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduleCalendar, type CalendarGoogleEvent, type CalendarJob } from '@/components/schedule/ScheduleCalendar';
import { ToastProvider, useToastStore } from '@/components/ui/toast';
import type { ScheduleEvent } from '@/app/actions/schedule';

const {
  refreshMock,
  addJobScheduleDayMock,
  deleteJobScheduleDayMock,
  updateJobScheduleMock,
  updateJobScheduleDayMock,
  createScheduleEventMock,
  deleteScheduleEventMock,
  updateScheduleEventMock,
} = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  addJobScheduleDayMock: vi.fn(),
  deleteJobScheduleDayMock: vi.fn(),
  updateJobScheduleMock: vi.fn(),
  updateJobScheduleDayMock: vi.fn(),
  createScheduleEventMock: vi.fn(),
  deleteScheduleEventMock: vi.fn(),
  updateScheduleEventMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock('@/app/actions/jobs', () => ({
  addJobScheduleDay: addJobScheduleDayMock,
  deleteJobScheduleDay: deleteJobScheduleDayMock,
  updateJobSchedule: updateJobScheduleMock,
  updateJobScheduleDay: updateJobScheduleDayMock,
}));

vi.mock('@/app/actions/schedule', () => ({
  createScheduleEvent: createScheduleEventMock,
  deleteScheduleEvent: deleteScheduleEventMock,
  updateScheduleEvent: updateScheduleEventMock,
}));

function renderCalendar({
  jobs = [JOB],
  googleEvents = [],
  nativeEvents = [],
  today = '2026-05-02',
}: {
  jobs?: CalendarJob[];
  googleEvents?: CalendarGoogleEvent[];
  nativeEvents?: ScheduleEvent[];
  today?: string;
} = {}) {
  return render(
    <>
      <ToastProvider />
      <ScheduleCalendar
        jobs={jobs}
        googleEvents={googleEvents}
        nativeEvents={nativeEvents}
        googleConnected={false}
        googleError={false}
        today={today}
      />
    </>,
  );
}

const JOB: CalendarJob = {
  id: 'job-1',
  title: 'Exterior repaint',
  customerName: 'Sarah Mitchell',
  status: 'scheduled',
  startDate: '2026-05-02',
  endDate: '2026-05-04',
  scheduleDates: ['2026-05-02', '2026-05-04'],
  scheduledDate: '2026-05-02',
  notes: 'Rear gate access',
  address: '12 Beach St, Manly',
  quoteNumber: 'QUO-1042',
};

describe('ScheduleCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
    addJobScheduleDayMock.mockResolvedValue({ error: null });
    deleteJobScheduleDayMock.mockResolvedValue({ error: null });
    updateJobScheduleMock.mockResolvedValue({ error: null });
    updateJobScheduleDayMock.mockResolvedValue({ error: null });
    createScheduleEventMock.mockResolvedValue({ error: null });
    deleteScheduleEventMock.mockResolvedValue({ error: null });
    updateScheduleEventMock.mockResolvedValue({ error: null });
  });

  it('shows a success toast after adding a scheduled day', async () => {
    const user = userEvent.setup();

    renderCalendar();

    await user.click(screen.getByRole('button', { name: 'List' }));
    await user.click(screen.getByRole('button', { name: 'Edit dates' }));
    await user.click(screen.getByRole('button', { name: 'Add day' }));

    await waitFor(() => {
      expect(addJobScheduleDayMock).toHaveBeenCalledWith('job-1', { date: '2026-05-05' });
    });

    expect(await screen.findByText('Added 5 May to Sarah Mitchell.')).toBeInTheDocument();
  });

  it('shows a success toast after deleting a scheduled day', async () => {
    const user = userEvent.setup();

    renderCalendar();

    await user.click(screen.getByRole('button', { name: 'List' }));
    await user.click(screen.getByRole('button', { name: 'Edit dates' }));

    const scheduledDaysSection = screen.getByText('Scheduled days').closest('div');
    if (!scheduledDaysSection) {
      throw new Error('Scheduled days section not found');
    }

    await user.click(
      within(scheduledDaysSection.parentElement ?? scheduledDaysSection).getAllByRole('button', {
        name: 'Delete',
      })[0],
    );

    await waitFor(() => {
      expect(deleteJobScheduleDayMock).toHaveBeenCalledWith('job-1', { date: '2026-05-02' });
    });

    expect(await screen.findByText('Removed 2 May from Sarah Mitchell.')).toBeInTheDocument();
  });

  it('shows an error toast when saving a range fails', async () => {
    const user = userEvent.setup();
    updateJobScheduleMock.mockResolvedValue({ error: 'Date range overlaps another job.' });

    renderCalendar();

    await user.click(screen.getByRole('button', { name: 'List' }));
    await user.click(screen.getByRole('button', { name: 'Edit dates' }));
    await user.click(screen.getByRole('button', { name: 'Save range' }));

    expect(await screen.findAllByText('Date range overlaps another job.')).toHaveLength(2);
  });

  it('uses Event label for native schedule items', () => {
    renderCalendar({
      nativeEvents: [
        {
          id: 'event-1',
          title: 'Site visit',
          date: '2026-05-02',
          startTime: null,
          endTime: null,
          isAllDay: true,
          location: null,
          notes: null,
        },
      ],
    });

    expect(screen.getByRole('button', { name: 'Event' })).toBeInTheDocument();

    const eventCard = screen.getByRole('button', { name: /Event Site visit All Day Tap to edit/i });
    expect(within(eventCard).getByText('Event')).toBeInTheDocument();
  });

  it('uses the provided today value for the initial month', () => {
    renderCalendar({ today: '2026-05-02' });

    expect(screen.getByRole('heading', { name: 'May 2026' })).toBeInTheDocument();
  });
});
