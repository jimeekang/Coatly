import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CONVERGED_FILES = [
  'app/(dashboard)/dashboard/page.tsx',
  'modules/jobs/ui/JobDetail.tsx',
  'modules/assistant/ui/WorkspaceAssistant.tsx',
  'modules/billing/ui/UpgradePrompt.tsx',
  'modules/auth/ui/AuthShell.tsx',
  'modules/settings/ui/GoogleCalendarCard.tsx',
  'modules/settings/ui/PricingSection.tsx',
] as const;

const SECTION_LABEL_EXPECTATIONS = [
  ['app/(dashboard)/quotes/page.tsx', ['Starter Usage']],
  ['app/(dashboard)/quotes/new/page.tsx', ['Starter Usage']],
  ['app/subscribe/page.tsx', ['Activate {APP_NAME}']],
  ['modules/invoices/ui/InvoiceDetail.tsx', ['Amount due', 'Paid date']],
  [
    'modules/invoices/ui/InvoiceForm.tsx',
    ['Progress percent', 'Amount due', 'Quote items', 'Customer snapshot'],
  ],
  ['modules/invoices/ui/InvoiceTable.tsx', ['Record Payment']],
  [
    'modules/price-rates/ui/PriceRatesForm.tsx',
    ['{eyebrow}', 'Available scopes — applies to all door types'],
  ],
  [
    'modules/quotes/ui/QuoteExtraLineItems.tsx',
    ['Suggested From Saved Services'],
  ],
  [
    'modules/schedule/ui/ScheduleCalendar.tsx',
    [
      'Now showing',
      'Show',
      'Job status',
      'Calendar month',
      'Job list',
      'Selected day',
    ],
  ],
] as const;

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('section label convergence', () => {
  it.each(CONVERGED_FILES)(
    '%s uses the shared SectionLabel without legacy overline tracking',
    (file) => {
      const source = readSource(file);

      expect(source).toContain("from '@/components/ui/SectionLabel'");
      expect(source).toContain('<SectionLabel');
      expect(source).not.toMatch(/tracking-\[0\.(?:14|16|18)em\]/);
      expect(source).not.toContain('tracking-widest');
    }
  );

  it.each(SECTION_LABEL_EXPECTATIONS)(
    '%s uses SectionLabel for true section and field-group headings',
    (file, labels) => {
      const source = readSource(file);

      expect(source).toContain("from '@/components/ui/SectionLabel'");
      for (const label of labels) {
        expect(source).toContain(label);
      }
    }
  );
});
