import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const D6_FORMS = [
  'modules/quotes/ui/QuoteForm.tsx',
  'modules/invoices/ui/InvoiceForm.tsx',
  'modules/customers/ui/CustomerForm.tsx',
] as const;

const UI_SOURCE_ROOTS = ['app', 'components', 'modules'] as const;

function listSourceFiles(relativeDir: string): string[] {
  const absoluteDir = path.join(process.cwd(), relativeDir);
  if (!existsSync(absoluteDir)) return [];

  return readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) return listSourceFiles(relativePath);
    if (/\.(test|spec)\./.test(entry.name)) return [];
    if (/\.(tsx|ts|css)$/.test(entry.name)) return [relativePath];
    return [];
  });
}

function findTokenPairOffenders(pattern: RegExp) {
  return UI_SOURCE_ROOTS.flatMap((root) =>
    listSourceFiles(root).flatMap((file) =>
      readSource(file)
        .split('\n')
        .flatMap((line, index) =>
          pattern.test(line) ? [`${file}:${index + 1}: ${line.trim()}`] : [],
        ),
    ),
  );
}

describe('D6 form layout consistency', () => {
  it('keeps one dashboard PageHeader primitive and no deprecated global UI classes', () => {
    expect(existsSync(path.join(process.cwd(), 'components/layout/PageHeader.tsx'))).toBe(
      true
    );
    expect(existsSync(path.join(process.cwd(), 'components/ui/PageHeader.tsx'))).toBe(
      false
    );

    const globals = readSource('app/globals.css');
    expect(globals).not.toMatch(/\.field\b/);
    expect(globals).not.toMatch(/\.field-error\b/);
    expect(globals).not.toContain('.sticky-action-bar');
    expect(globals).not.toContain('.h1-page');
    expect(globals).not.toContain('.h2-section');
    expect(globals).not.toContain('.h3-block');
  });

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

  it('uses on-color text tokens on solid semantic backgrounds', () => {
    const solidPrimaryWithWhite = /(?<![:\w-])bg-primary(?![/\w-])(?=.*\btext-white\b)|\btext-white\b(?=.*(?<![:\w-])bg-primary(?![/\w-]))/;
    const solidErrorWithWrongText = /(?<![:\w-])bg-error(?![/\w-])(?=.*\b(text-white|text-primary|text-on-primary|text-error)\b)|\b(text-white|text-primary|text-on-primary|text-error)\b(?=.*(?<![:\w-])bg-error(?![/\w-]))/;

    expect(findTokenPairOffenders(solidPrimaryWithWhite)).toEqual([]);
    expect(findTokenPairOffenders(solidErrorWithWrongText)).toEqual([]);
  });

  it('keeps primary-container text on matching container tokens', () => {
    const primaryContainerWithWrongText =
      /(?<![:\w-])bg-primary-container(?![/\w-])(?=.*\b(text-white|text-primary)\b)|\b(text-white|text-primary)\b(?=.*(?<![:\w-])bg-primary-container(?![/\w-]))/;
    const primaryContainerWithoutOnText =
      /(?<![:\w-])bg-primary-container(?![/\w-])(?!.*\btext-on-primary-container\b)/;

    expect(findTokenPairOffenders(primaryContainerWithWrongText)).toEqual([]);
    expect(findTokenPairOffenders(primaryContainerWithoutOnText)).toEqual([]);
  });

  it('keeps the quote send modal above mobile navigation', () => {
    const source = readSource('modules/quotes/ui/QuoteForm.tsx');

    expect(source).toContain('fixed inset-0 z-50');
  });
});
