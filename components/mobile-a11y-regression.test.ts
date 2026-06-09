import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('mobile accessibility regressions', () => {
  it('does not disable pinch zoom in the app viewport', () => {
    expect(readSource('app/layout.tsx')).not.toContain('maximumScale');
  });

  it('keeps the mobile dashboard chrome safe-area aware', () => {
    const sidebar = readSource('components/dashboard/Sidebar.tsx');

    expect(sidebar).toContain('h-[calc(4rem+env(safe-area-inset-bottom))]');
    expect(sidebar).toContain('pb-[env(safe-area-inset-bottom)]');
  });

  it('keeps quote send overlays above mobile navigation and safe-area aware', () => {
    const quoteForm = readSource('modules/quotes/ui/QuoteForm.tsx');
    const formFooter = readSource('components/forms/FormFooter.tsx');

    expect(quoteForm).toContain('z-50');
    expect(quoteForm).toContain('FormFooter');
    expect(formFooter).toContain('bottom-[calc(4rem+env(safe-area-inset-bottom))]');
    expect(formFooter).toContain('pb-[calc(0.75rem+env(safe-area-inset-bottom))]');
    expect(quoteForm).not.toContain('bottom-16');
  });

  it('keeps known field-use touch targets at least 44px tall', () => {
    expect(readSource('components/layout/BackButton.tsx')).toContain('h-11 w-11');
    expect(readSource('modules/quotes/ui/QuoteTable.tsx')).not.toContain('min-h-8');
    expect(readSource('modules/invoices/ui/InvoiceTable.tsx')).not.toContain('min-h-8');
    expect(readSource('modules/customers/ui/CustomerTable.tsx')).not.toContain('min-h-8');
    expect(readSource('components/ai/AIDraftPanel.tsx')).not.toContain('min-h-9');
  });

  it('keeps expanded field-use controls away from 40px min-height utilities', () => {
    const files = [
      'app/(dashboard)/customers/[id]/page.tsx',
      'modules/customers/ui/CustomerForm.tsx',
      'modules/jobs/ui/JobEditForm.tsx',
      'modules/jobs/ui/JobsWorkspace.tsx',
      'modules/quotes/ui/QuoteExtraLineItems.tsx',
      'modules/quotes/ui/QuoteForm.tsx',
      'modules/price-rates/ui/PriceRatesForm.tsx',
      'components/schedule/ScheduleCalendar.tsx',
    ];

    for (const file of files) {
      const source = readSource(file);
      expect(source).not.toMatch(/\bmin-h-(8|9|10)\b/);
      expect(source).not.toMatch(/\bh-10\b/);
    }
  });

  it('keeps tablet dashboard navigation labeled and form footers aligned', () => {
    const sidebar = readSource('components/dashboard/Sidebar.tsx');
    const formFooter = readSource('components/forms/FormFooter.tsx');

    expect(sidebar).toContain('md:w-60');
    expect(sidebar).not.toContain('md:w-[72px]');
    expect(sidebar).not.toContain('hidden lg:inline');
    expect(formFooter).toContain('md:left-60');
    expect(formFooter).toContain('lg:left-64');
    expect(formFooter).not.toContain('md:left-[72px]');
  });
});
