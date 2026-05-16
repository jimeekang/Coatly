import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const D6_FORMS = [
  'components/quotes/QuoteForm.tsx',
  'components/invoices/InvoiceForm.tsx',
  'components/customers/CustomerForm.tsx',
] as const;

describe('D6 form layout consistency', () => {
  it('provides shared form primitives with MD3 styling', () => {
    const primitiveFiles = [
      'components/forms/FormField.tsx',
      'components/forms/FormSection.tsx',
      'components/forms/FormFooter.tsx',
    ] as const;

    for (const file of primitiveFiles) {
      expect(existsSync(path.join(process.cwd(), file)), `${file} should exist`).toBe(true);
    }

    const field = readSource('components/forms/FormField.tsx');
    expect(field).toContain('rounded-xl');
    expect(field).toContain('border-outline-variant');
    expect(field).toContain('focus:border-primary');
    expect(field).toContain('font-semibold');

    const section = readSource('components/forms/FormSection.tsx');
    expect(section).toContain('rounded-2xl');
    expect(section).toContain('border-outline-variant');
    expect(section).toContain('p-4');
    expect(section).toContain('sm:p-6');

    const footer = readSource('components/forms/FormFooter.tsx');
    expect(footer).toContain('z-30');
    expect(footer).toContain('bottom-[calc(4rem+env(safe-area-inset-bottom))]');
    expect(footer).toContain('md:bottom-0');
    expect(footer).toContain('md:left-60');
    expect(footer).toContain('lg:left-64');
    expect(footer).toContain('bg-primary');
    expect(footer).toContain('rounded-xl');
    expect(footer).toContain('h-14');
  });

  it('migrates the three interactive forms away from legacy tokens and inline field constants', () => {
    for (const file of D6_FORMS) {
      const source = readSource(file);

      expect(source, file).not.toContain('pm-');
      expect(source, file).not.toMatch(
        /\bconst\s+(FIELD|FIELD_CLASS|FIELD_DISABLED_CLASS|LABEL|LABEL_CLASS|TEXTAREA|TEXTAREA_CLASS)\b/,
      );
      expect(source, file).toContain("from '@/components/forms/FormField'");
      expect(source, file).toContain("from '@/components/forms/FormSection'");
      expect(source, file).toContain("from '@/components/forms/FormFooter'");
    }
  });

  it('keeps ui input and select primitives on MD3 tokens', () => {
    for (const file of ['components/ui/input.tsx', 'components/ui/select.tsx']) {
      const source = readSource(file);

      expect(source, file).not.toContain('pm-');
      expect(source, file).toContain('rounded-xl');
      expect(source, file).toContain('border-outline-variant');
      expect(source, file).toContain('focus:border-primary');
      expect(source, file).toContain('font-semibold');
    }
  });

  it('keeps the quote send modal above mobile navigation', () => {
    const source = readSource('components/quotes/QuoteForm.tsx');

    expect(source).toContain('fixed inset-0 z-50');
  });
});
