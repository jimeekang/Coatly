import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerClientMock,
  getSubscriptionSnapshotForCurrentUserMock,
  requireCurrentUserMock,
} = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getSubscriptionSnapshotForCurrentUserMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: createServerClientMock,
}));
vi.mock('@/lib/supabase/request-context', () => ({
  requireCurrentUser: requireCurrentUserMock,
}));
vi.mock('@/modules/billing/application/request-context', () => ({
  getSubscriptionSnapshotForCurrentUser:
    getSubscriptionSnapshotForCurrentUserMock,
}));
vi.mock('@/modules/billing/application/access', () => ({
  getActiveSubscriptionRequiredMessage: vi.fn(),
}));

import { updateMaterialItem } from '@/modules/materials/application/actions';

// Regression: ISSUE-007 - catalogue edits could create duplicate active items
// Found by /qa on 2026-07-12
// Report: .gstack/qa-reports/qa-report-localhost-3000-2026-07-12.md
describe('updateMaterialItem duplicate protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentUserMock.mockResolvedValue({ id: 'user-1' });
    getSubscriptionSnapshotForCurrentUserMock.mockResolvedValue({
      active: true,
    });
  });

  it('rejects another item with the same normalized name and unit', async () => {
    const updateMock = vi.fn();
    createServerClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { id: 'item-a', name: 'QA Prep Service A', unit: 'item' },
              { id: 'item-b', name: 'QA Prep Service B', unit: 'item' },
            ],
            error: null,
          }),
        }),
        update: updateMock,
      })),
    });

    const result = await updateMaterialItem('item-b', {
      name: ' qa prep service a ',
      category: 'service',
      unit: 'ITEM',
      unit_price_cents: 12_000,
      notes: '',
      is_active: true,
    });

    expect(result.error).toContain('already exists');
    expect(updateMock).not.toHaveBeenCalled();
  });
});
