import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLANS } from '@/config/plans';

// Regression: ISSUE-008 - billing sold AI features while the provider was dormant
// Found by /qa on 2026-07-12
// Report: .gstack/qa-reports/qa-report-localhost-3000-2026-07-12.md
describe('billing feature copy', () => {
  it('does not advertise provider-disabled AI features', () => {
    expect(PLANS.pro.features.some((feature) => /\bAI\b/i.test(feature))).toBe(
      false
    );

    const pricingSectionSource = fs.readFileSync(
      path.join(process.cwd(), 'modules/settings/ui/PricingSection.tsx'),
      'utf8'
    );
    expect(pricingSectionSource).not.toContain('Pro adds AI assistance');
  });
});
