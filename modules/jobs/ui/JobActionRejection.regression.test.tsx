import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Component, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobDetail } from '@/modules/jobs/ui/JobDetail';
import { JobEditForm } from '@/modules/jobs/ui/JobEditForm';
import type { JobDetail as JobDetailData } from '@/modules/jobs/domain/jobs';

const {
  deleteJobMock,
  pushMock,
  refreshMock,
  retryJobGoogleCalendarSyncMock,
  saveJobVariationsMock,
  updateJobMock,
} = vi.hoisted(() => ({
  deleteJobMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  retryJobGoogleCalendarSyncMock: vi.fn(),
  saveJobVariationsMock: vi.fn(),
  updateJobMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
    replace: vi.fn(),
  }),
}));

vi.mock('@/modules/jobs/application/actions', () => ({
  deleteJob: deleteJobMock,
  retryJobGoogleCalendarSync: retryJobGoogleCalendarSyncMock,
  saveJobVariations: saveJobVariationsMock,
  updateJob: updateJobMock,
}));

type ActionResult = { error: string | null };

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
}

class TestErrorBoundary extends Component<
  { children: ReactNode },
  { error: unknown }
> {
  state = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    if (
      this.state.error &&
      typeof this.state.error === 'object' &&
      'digest' in this.state.error
    ) {
      return (
        <div>{String((this.state.error as { digest: unknown }).digest)}</div>
      );
    }

    return this.props.children;
  }
}

const job: JobDetailData = {
  id: 'job-1',
  customer_id: 'customer-1',
  quote_id: 'quote-1',
  title: 'Exterior repaint',
  status: 'scheduled',
  scheduled_date: '2026-04-22',
  start_date: '2026-04-22',
  end_date: '2026-04-22',
  schedule_dates: ['2026-04-22'],
  duration_days: 1,
  notes: null,
  created_at: '2026-04-20T00:00:00.000Z',
  updated_at: '2026-04-21T00:00:00.000Z',
  google_calendar_event_id: null,
  google_calendar_id: null,
  google_sync_status: 'error',
  google_sync_error: 'Previous sync failed',
  customer: {
    id: 'customer-1',
    name: 'Harbor Cafe',
    company_name: null,
    email: 'site@harborcafe.com.au',
    address: '128 Beach Street, Manly, NSW, 2095',
  },
  quote: {
    id: 'quote-1',
    quote_number: 'QUO-0042',
    title: 'Cafe repaint',
    status: 'approved',
  },
  quoteLineItems: [],
  variations: [],
  invoice: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  deleteJobMock.mockResolvedValue({ error: null });
  retryJobGoogleCalendarSyncMock.mockResolvedValue({
    error: null,
    synced: true,
  });
  saveJobVariationsMock.mockResolvedValue({ error: null });
  updateJobMock.mockResolvedValue({ error: null });
});

describe('jobs action rejection handling', () => {
  it('keeps Save Changes pending until both actions settle and surfaces a rejection', async () => {
    const user = userEvent.setup();
    const update = createDeferred<ActionResult>();
    updateJobMock.mockReturnValue(update.promise);

    render(
      <JobEditForm
        job={job}
        customers={[]}
        quotes={[]}
        initialVariations={[]}
      />
    );

    const submit = screen.getByRole('button', { name: 'Save Changes' });
    await user.click(submit);
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();

    update.reject(new Error('Save Changes failed'));

    await waitFor(() => {
      expect(screen.getByText('Save Changes failed')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('re-enables Delete Job and shows an inline error when the action rejects', async () => {
    const user = userEvent.setup();
    const deletion = createDeferred<ActionResult>();
    deleteJobMock.mockReturnValue(deletion.promise);

    render(<JobDetail job={job} />);

    const deleteButton = screen.getByRole('button', { name: 'Delete Job' });
    await user.click(deleteButton);
    await user.click(screen.getByRole('button', { name: 'Delete job' }));
    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();

    deletion.reject(new Error('Delete Job failed'));

    await waitFor(() => {
      expect(screen.getByText('Delete Job failed')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Delete Job' })).toBeEnabled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('re-enables Mark as complete and shows an inline error when the action rejects', async () => {
    const user = userEvent.setup();
    const completion = createDeferred<ActionResult>();
    updateJobMock.mockReturnValue(completion.promise);

    render(<JobDetail job={job} />);

    const completeButton = screen.getByRole('button', {
      name: 'Mark as complete',
    });
    await user.click(completeButton);
    expect(
      screen.getByRole('button', { name: 'Marking complete...' })
    ).toBeDisabled();

    completion.reject(new Error('Mark Complete failed'));

    await waitFor(() => {
      expect(screen.getByText('Mark Complete failed')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: 'Mark as complete' })
    ).toBeEnabled();
    expect(screen.queryByText('Job marked complete!')).not.toBeInTheDocument();
  });

  it('re-enables Retry sync and surfaces a rejection', async () => {
    const user = userEvent.setup();
    const retry = createDeferred<{ error: string | null; synced: boolean }>();
    retryJobGoogleCalendarSyncMock.mockReturnValue(retry.promise);

    render(<JobDetail job={job} />);

    const retryButton = screen.getByRole('button', { name: 'Retry sync' });
    await user.click(retryButton);
    expect(screen.getByRole('button', { name: 'Retrying...' })).toBeDisabled();

    retry.reject(new Error('Retry sync failed'));

    await waitFor(() => {
      expect(screen.getByText('Retry sync failed')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Retry sync' })).toBeEnabled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('keeps returned action errors on their existing UI paths', async () => {
    const user = userEvent.setup();
    deleteJobMock.mockResolvedValue({ error: 'Job cannot be deleted' });

    render(<JobDetail job={job} />);
    await user.click(screen.getByRole('button', { name: 'Delete Job' }));
    await user.click(screen.getByRole('button', { name: 'Delete job' }));

    await waitFor(() => {
      expect(screen.getByText('Job cannot be deleted')).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('rethrows Next navigation signals instead of surfacing them as form errors', async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const redirectError = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;push;/login;307;',
    });
    updateJobMock.mockRejectedValue(redirectError);

    render(
      <TestErrorBoundary>
        <JobEditForm
          job={job}
          customers={[]}
          quotes={[]}
          initialVariations={[]}
        />
      </TestErrorBoundary>
    );

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(
        screen.getByText('NEXT_REDIRECT;push;/login;307;')
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText('Job could not be saved. Please try again.')
    ).not.toBeInTheDocument();
    consoleError.mockRestore();
  });
});
