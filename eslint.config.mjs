import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    '.next-dev/**',
    'out/**',
    'build/**',
    '.vercel/**',
    '.claude/**',
    'next-env.d.ts',
  ]),
  {
    files: ['**/*.tsx', '**/*.ts'],
    rules: {
      // Warn on legacy pm-* Tailwind classes. New UI must use MD3 tokens.
      // See docs/DESIGN_CONSISTENCY_AUDIT.md (P0-2) for mapping.
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            'Literal[value=/(?:^|\\s|["\'`])(?:bg|text|border|hover:bg|hover:text|active:bg|focus:bg|ring)-pm-/]',
          message:
            'Use Material Design 3 tokens (text-on-surface, bg-primary, etc.) instead of legacy pm-* aliases. See docs/DESIGN_CONSISTENCY_AUDIT.md.',
        },
        {
          selector:
            'TemplateElement[value.raw=/(?:bg|text|border|hover:bg|hover:text|active:bg|focus:bg|ring)-pm-/]',
          message:
            'Use Material Design 3 tokens (text-on-surface, bg-primary, etc.) instead of legacy pm-* aliases. See docs/DESIGN_CONSISTENCY_AUDIT.md.',
        },
      ],
    },
  },
  {
    // Domain purity (error). The `modules/*/domain/**` glob auto-covers every
    // current and future feature module — no per-module maintenance needed.
    // `allowTypeImports` keeps compile-time-only `import type` legal, since the
    // rule targets runtime IO/coupling — the same principle the vitest boundary
    // checker (modules/module-boundaries.test.ts) enforces.
    files: ['modules/*/domain/**/*.ts', 'modules/*/domain/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'next/*',
                '@/app/*',
                '@/components/*',
                '@/lib/supabase',
                '@/lib/supabase/*',
                '@/lib/email/*',
                '@/lib/pdf/*',
                '@/lib/stripe/*',
                '@/modules/*/application',
                '@/modules/*/application/*',
                '@/modules/*/infrastructure',
                '@/modules/*/infrastructure/*',
                '@/modules/*/ui',
                '@/modules/*/ui/*',
              ],
              allowTypeImports: true,
              message:
                'Domain layer must stay pure. Move DB, Next.js, UI, and external side effects to application or infrastructure.',
            },
          ],
        },
      ],
    },
  },
  {
    // Shared kernel must not depend on feature application/UI internals (error).
    // The `lib/**` glob covers all shared library code.
    files: ['lib/**/*.ts', 'lib/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/modules/*/application',
                '@/modules/*/application/*',
                '@/modules/*/ui',
                '@/modules/*/ui/*',
              ],
              message:
                'Shared lib must not depend on feature application or UI internals. Move shared contracts to domain, types, config, or utils.',
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
