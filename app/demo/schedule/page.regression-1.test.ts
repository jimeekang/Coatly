import { describe, expect, it, vi } from 'vitest';

const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));

import DemoSchedulePage from '@/app/demo/schedule/page';

// Regression: ISSUE-001 - the public demo exposed authenticated save controls
// Found by /qa on 2026-07-12
// Report: .gstack/qa-reports/qa-report-localhost-3000-2026-07-12.md
describe('demo schedule route', () => {
  it('returns the application not-found response instead of interactive controls', () => {
    expect(() => DemoSchedulePage()).toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalledOnce();
  });
});
