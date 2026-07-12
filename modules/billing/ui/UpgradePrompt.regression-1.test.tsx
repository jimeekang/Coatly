import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UpgradePrompt } from '@/modules/billing/ui/UpgradePrompt';

// Regression: ISSUE-004 - create routes crashed when UpgradePrompt crossed the RSC boundary as a server function
// Found by /qa on 2026-07-12
// Report: .gstack/qa-reports/qa-report-localhost-3000-2026-07-12.md
describe('UpgradePrompt client boundary', () => {
  it('stays a client component and renders its plan links', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'modules/billing/ui/UpgradePrompt.tsx'),
      'utf8'
    );

    expect(source.startsWith("'use client';")).toBe(true);

    render(
      <UpgradePrompt
        title="AI drafting is available on Pro"
        description="Upgrade to enable assisted drafting."
      />
    );

    expect(screen.getByRole('link', { name: 'View Plans' })).toHaveAttribute(
      'href',
      '/settings'
    );
    expect(screen.getByRole('link', { name: 'Compare Plans' })).toHaveAttribute(
      'href',
      '/settings'
    );
  });
});
