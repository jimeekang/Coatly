import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ScheduleCalendar,
  type CalendarJob,
  type CalendarGoogleEvent,
} from '@/modules/schedule/ui/ScheduleCalendar';
import { ToastProvider, useToastStore } from '@/components/ui/toast';
import { JOB_STATUS_LABELS } from '@/modules/jobs/domain/jobs';
import type { ScheduleEvent } from '@/modules/schedule/application/actions';

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
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock('@/modules/schedule/application/actions', () => ({
  createScheduleEvent: createScheduleEventMock,
  deleteScheduleEvent: deleteScheduleEventMock,
  updateScheduleEvent: updateScheduleEventMock,
}));

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

const NATIVE_EVENT: ScheduleEvent = {
  id: 'event-1',
  title: 'Site visit',
  date: '2026-05-02',
  startTime: null,
  endTime: null,
  isAllDay: true,
  location: null,
  notes: null,
};

function renderCalendar({
  jobs = [JOB],
  nativeEvents = [],
  initialView,
}: {
  jobs?: CalendarJob[];
  nativeEvents?: ScheduleEvent[];
  initialView?: string;
} = {}) {
  const googleEvents: CalendarGoogleEvent[] = [];

  return render(
    <>
      <ToastProvider />
      <ScheduleCalendar
        jobs={jobs}
        googleEvents={googleEvents}
        nativeEvents={nativeEvents}
        googleConnected={false}
        googleError={false}
        jobStatusLabels={JOB_STATUS_LABELS}
        updateJobSchedule={updateJobScheduleMock}
        addJobScheduleDay={addJobScheduleDayMock}
        deleteJobScheduleDay={deleteJobScheduleDayMock}
        updateJobScheduleDay={updateJobScheduleDayMock}
        today="2026-05-02"
        initialView={initialView}
      />
    </>
  );
}

function getDropZone(dateLabel: string): HTMLElement {
  const dateButton = screen.getByRole('button', {
    name: `Select ${dateLabel}`,
  });
  const dropZone = dateButton.parentElement;
  if (!dropZone) throw new Error(`Drop zone not found for ${dateLabel}`);
  return dropZone;
}

async function expectAlertMessage(message: string) {
  const alerts = await screen.findAllByRole('alert');
  expect(alerts.some((alert) => alert.textContent?.includes(message))).toBe(
    true
  );
}

describe('ScheduleCalendar action rejection regressions', () => {
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

  it('shows a rejected native event add and restores the modal controls', async () => {
    const user = userEvent.setup();
    createScheduleEventMock.mockRejectedValue(
      new Error('Event service unavailable.')
    );

    renderCalendar();
    await user.click(screen.getByRole('button', { name: '+ New Event' }));
    await user.type(screen.getByLabelText('Title'), 'Site inspection');
    const addEventModal = screen.getByRole('dialog', { name: 'Add Event' });
    await user.click(
      within(addEventModal).getByRole('button', { name: 'Add' })
    );

    await expectAlertMessage('Event service unavailable.');
    expect(
      screen.getByRole('heading', { name: 'Add Event' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(addEventModal).getByRole('button', { name: 'Add' })
      ).toBeEnabled()
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('shows a rejected native event edit and keeps the modal open', async () => {
    const user = userEvent.setup();
    updateScheduleEventMock.mockRejectedValue(
      new Error('Event update unavailable.')
    );

    renderCalendar({ nativeEvents: [NATIVE_EVENT] });
    await user.click(
      screen.getByRole('button', {
        name: /Event Site visit All Day Tap to edit/i,
      })
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await expectAlertMessage('Event update unavailable.');
    expect(
      screen.getByRole('heading', { name: 'Edit Event' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('shows a rejected native event delete and restores the delete control', async () => {
    const user = userEvent.setup();
    deleteScheduleEventMock.mockRejectedValue(
      new Error('Event delete unavailable.')
    );

    renderCalendar({ nativeEvents: [NATIVE_EVENT] });
    await user.click(
      screen.getByRole('button', {
        name: /Event Site visit All Day Tap to edit/i,
      })
    );
    await user.click(screen.getByRole('button', { name: 'Delete event' }));

    await expectAlertMessage('Event delete unavailable.');
    expect(
      screen.getByRole('heading', { name: 'Edit Event' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Delete event' })).toBeEnabled()
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('shows a rejected job range save and restores the modal controls', async () => {
    const user = userEvent.setup();
    updateJobScheduleMock.mockRejectedValue(
      new Error('Schedule range unavailable.')
    );

    renderCalendar({ initialView: 'list' });
    await user.click(screen.getByRole('button', { name: 'Edit dates' }));
    await user.click(screen.getByRole('button', { name: 'Save range' }));

    await expectAlertMessage('Schedule range unavailable.');
    expect(
      screen.getByRole('heading', { name: 'Edit Job Schedule' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save range' })).toBeEnabled()
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('shows a rejected job day add and restores the add control', async () => {
    const user = userEvent.setup();
    addJobScheduleDayMock.mockRejectedValue(
      new Error('Schedule day add unavailable.')
    );

    renderCalendar({ initialView: 'list' });
    await user.click(screen.getByRole('button', { name: 'Edit dates' }));
    await user.click(screen.getByRole('button', { name: 'Add day' }));

    await expectAlertMessage('Schedule day add unavailable.');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add day' })).toBeEnabled()
    );
    expect(
      screen.getByRole('heading', { name: 'Edit Job Schedule' })
    ).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('shows a rejected job day delete and restores the delete control', async () => {
    const user = userEvent.setup();
    deleteJobScheduleDayMock.mockRejectedValue(
      new Error('Schedule day delete unavailable.')
    );

    renderCalendar({ initialView: 'list' });
    await user.click(screen.getByRole('button', { name: 'Edit dates' }));
    const scheduledDaysSection = screen
      .getByText('Scheduled days')
      .closest('div');
    if (!scheduledDaysSection)
      throw new Error('Scheduled days section not found');
    const deleteButton = within(
      scheduledDaysSection.parentElement ?? scheduledDaysSection
    ).getAllByRole('button', { name: 'Delete' })[0];
    await user.click(deleteButton);

    await expectAlertMessage('Schedule day delete unavailable.');
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Delete' })[0]).toBeEnabled()
    );
    expect(
      screen.getByRole('heading', { name: 'Edit Job Schedule' })
    ).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('shows a rejected job drag move and clears the pending state', async () => {
    updateJobScheduleDayMock.mockRejectedValue(
      new Error('Job move unavailable.')
    );

    renderCalendar();
    const dataTransfer = {
      getData: vi
        .fn()
        .mockReturnValue(
          JSON.stringify({ kind: 'job', id: 'job-1', date: '2026-05-02' })
        ),
    };
    fireEvent.drop(getDropZone('Sunday 3 May'), { dataTransfer });

    await expectAlertMessage('Job move unavailable.');
    await waitFor(() =>
      expect(screen.queryByText('Updating schedule...')).not.toBeInTheDocument()
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('shows a rejected native event drag move and clears the pending state', async () => {
    updateScheduleEventMock.mockRejectedValue(
      new Error('Event move unavailable.')
    );

    renderCalendar({ nativeEvents: [NATIVE_EVENT] });
    const dataTransfer = {
      getData: vi
        .fn()
        .mockReturnValue(JSON.stringify({ kind: 'native', id: 'event-1' })),
    };
    fireEvent.drop(getDropZone('Sunday 3 May'), { dataTransfer });

    await expectAlertMessage('Event move unavailable.');
    await waitFor(() =>
      expect(screen.queryByText('Updating schedule...')).not.toBeInTheDocument()
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
