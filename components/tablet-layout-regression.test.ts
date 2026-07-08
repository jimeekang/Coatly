import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('tablet layout regressions', () => {
  it('uses content-aware dashboard grids instead of fixed cramped tablet columns', () => {
    const source = readSource('app/(dashboard)/dashboard/page.tsx');

    expect(source).toContain('grid-cols-[repeat(auto-fit,minmax(170px,1fr))]');
    expect(source).toContain('grid-cols-[repeat(auto-fit,minmax(120px,1fr))]');
    expect(source).not.toContain('sm:grid-cols-5');
    expect(source).not.toContain('sm:grid-cols-3');
  });

  it('keeps complex form sidebars off tablet widths', () => {
    const quoteForm = readSource('modules/quotes/ui/QuoteForm.tsx');
    const invoiceForm = readSource('modules/invoices/ui/InvoiceForm.tsx');

    expect(quoteForm).toContain('xl:grid-cols-[minmax(0,1fr)_20rem]');
    expect(quoteForm).toContain('xl:hidden');
    expect(quoteForm).toContain('hidden xl:block');
    expect(quoteForm).not.toContain('lg:grid-cols-[minmax(0,1fr)_20rem]');
    expect(quoteForm).not.toContain('lg:hidden');
    expect(quoteForm).not.toContain('hidden lg:block');

    expect(invoiceForm).toContain('xl:grid-cols-[minmax(0,1.4fr)_300px]');
    expect(invoiceForm).not.toContain('lg:grid-cols-[minmax(0,1.4fr)_300px]');
  });

  it('keeps schedule tablet-first with readable touch targets', () => {
    const source = readSource('modules/schedule/ui/ScheduleCalendar.tsx');

    expect(source).toContain("const TABLET_AGENDA_VIEW_QUERY = '(max-width: 1023px)'");
    expect(source).toContain('useTabletAgendaViewport');
    expect(source).not.toMatch(/\blg:min-h-(?:5|\[32px\])\b/);
    expect(source).not.toContain('lg:text-[10px]');
    expect(source).not.toContain('lg:leading-none');
  });

  it('does not split detail pages into cramped tablet sidebars', () => {
    const quoteDetail = readSource('app/(dashboard)/quotes/[id]/page.tsx');
    const jobDetail = readSource('modules/jobs/ui/JobDetail.tsx');
    const invoiceDetail = readSource('modules/invoices/ui/InvoiceDetail.tsx');
    const customerDetailPage = readSource('app/(dashboard)/customers/[id]/page.tsx');

    expect(quoteDetail).toContain('xl:grid-cols-[2fr_1fr]');
    expect(quoteDetail).not.toContain('md:grid-cols-[2fr_1fr]');
    expect(jobDetail).toContain('xl:grid-cols-[2fr_1fr]');
    expect(jobDetail).not.toContain('md:grid-cols-[2fr_1fr]');
    expect(invoiceDetail).not.toContain('md:grid-cols-[minmax(0,1.6fr)_110px_140px_140px]');
    expect(customerDetailPage).toContain('md:max-w-2xl');
  });

  it('keeps form controls and modal shells tablet-safe for keyboard and Safari viewport changes', () => {
    const formField = readSource('components/forms/FormField.tsx');
    const quoteForm = readSource('modules/quotes/ui/QuoteForm.tsx');

    expect(formField).toContain('scroll-mb-40');
    expect(formField).toContain('md:scroll-mb-32');
    expect(quoteForm).toContain('max-h-[90dvh]');
  });
});
