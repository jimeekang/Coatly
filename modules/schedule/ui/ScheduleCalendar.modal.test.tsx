import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/toast';
import { JOB_STATUS_LABELS } from '@/modules/jobs/domain/jobs';
import {
  ScheduleCalendar,
  type CalendarJob,
} from '@/modules/schedule/ui/ScheduleCalendar';

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock('@/modules/schedule/application/actions', () => ({
  createScheduleEvent: vi.fn().mockResolvedValue({ error: null }),
  deleteScheduleEvent: vi.fn().mockResolvedValue({ error: null }),
  updateScheduleEvent: vi.fn().mockResolvedValue({ error: null }),
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
  notes: null,
  address: '12 Beach St, Manly',
  quoteNumber: 'QUO-1042',
};

function renderCalendar(jobs: CalendarJob[] = []) {
  return render(
    <>
      <ToastProvider />
      <ScheduleCalendar
        jobs={jobs}
        googleEvents={[]}
        nativeEvents={[]}
        googleConnected={false}
        googleError={false}
        jobStatusLabels={JOB_STATUS_LABELS}
        updateJobSchedule={vi.fn().mockResolvedValue({ error: null })}
        addJobScheduleDay={vi.fn().mockResolvedValue({ error: null })}
        deleteJobScheduleDay={vi.fn().mockResolvedValue({ error: null })}
        updateJobScheduleDay={vi.fn().mockResolvedValue({ error: null })}
        today="2026-05-02"
        initialView="list"
      />
    </>,
  );
}

describe('ScheduleCalendar modal scroll lock', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
    refreshMock.mockReset();
  });

  it('locks background scrolling while the event modal is open', async () => {
    const user = userEvent.setup();
    renderCalendar();

    await user.click(screen.getAllByRole('button', { name: /New Event/ })[0]);
    expect(document.body.style.overflow).toBe('hidden');

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(document.body.style.overflow).toBe(''));
  });

  it('locks background scrolling while the job schedule modal is open', async () => {
    const user = userEvent.setup();
    renderCalendar([JOB]);

    await user.click(screen.getByRole('button', { name: 'Edit dates' }));
    expect(document.body.style.overflow).toBe('hidden');

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(document.body.style.overflow).toBe(''));
  });
});
