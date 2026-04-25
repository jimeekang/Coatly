import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobDetail } from '@/components/jobs/JobDetail';
import type { JobDetail as JobDetailData } from '@/lib/jobs';

const { pushMock, refreshMock, deleteJobMock, retryJobGoogleCalendarSyncMock, updateJobMock } =
  vi.hoisted(() => ({
    pushMock: vi.fn(),
    refreshMock: vi.fn(),
    deleteJobMock: vi.fn(),
    retryJobGoogleCalendarSyncMock: vi.fn(),
    updateJobMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock('@/app/actions/jobs', () => ({
  deleteJob: deleteJobMock,
  retryJobGoogleCalendarSync: retryJobGoogleCalendarSyncMock,
  updateJob: updateJobMock,
}));

describe('JobDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when quote line items and variations are missing', () => {
    const job = {
      id: 'job-1',
      customer_id: 'customer-1',
      quote_id: 'quote-1',
      title: 'Exterior repaint',
      status: 'scheduled',
      scheduled_date: '2026-04-22',
      start_date: null,
      end_date: null,
      duration_days: null,
      notes: null,
      created_at: '2026-04-20T00:00:00.000Z',
      updated_at: '2026-04-21T00:00:00.000Z',
      google_calendar_event_id: null,
      google_calendar_id: null,
      google_sync_status: 'not_synced',
      google_sync_error: null,
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
      quoteLineItems: undefined as unknown as JobDetailData['quoteLineItems'],
      variations: undefined as unknown as JobDetailData['variations'],
      invoice: null,
    } satisfies JobDetailData;

    render(<JobDetail job={job} />);

    expect(screen.getByText('Exterior repaint')).toBeInTheDocument();
    expect(screen.getAllByText('Harbor Cafe')).toHaveLength(2);
    expect(screen.queryByText('Quote Scope')).not.toBeInTheDocument();
    expect(screen.queryByText('Variations')).not.toBeInTheDocument();
  });
});
