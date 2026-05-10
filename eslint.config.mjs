import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-dev/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["**/*.tsx", "**/*.ts"],
    rules: {
      // Warn on legacy pm-* Tailwind classes — migrate to MD3 tokens.
      // See docs/DESIGN_CONSISTENCY_AUDIT.md (P0-2) for mapping.
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "Literal[value=/(?:^|\\s|[\"'`])(?:bg|text|border|hover:bg|hover:text|active:bg|focus:bg|ring)-pm-/]",
          message:
            "Use Material Design 3 tokens (text-on-surface, bg-primary, etc.) instead of legacy pm-* aliases. See docs/DESIGN_CONSISTENCY_AUDIT.md.",
        },
        {
          selector:
            "TemplateElement[value.raw=/(?:bg|text|border|hover:bg|hover:text|active:bg|focus:bg|ring)-pm-/]",
          message:
            "Use Material Design 3 tokens (text-on-surface, bg-primary, etc.) instead of legacy pm-* aliases. See docs/DESIGN_CONSISTENCY_AUDIT.md.",
        },
      ],
    },
  },
  {
    // Existing pm-* heavy files: no warnings until they're migrated.
    // Remove a path from this list when its pm-* usage is cleaned up.
    files: [
      "components/quotes/**/*.tsx",
      "components/invoices/**/*.tsx",
      "components/customers/**/*.tsx",
      "components/materials/**/*.tsx",
      "components/rates/**/*.tsx",
      "components/schedule/**/*.tsx",
      "components/settings/**/*.tsx",
      "components/onboarding/**/*.tsx",
      "components/dashboard/**/*.tsx",
      "components/ai/**/*.tsx",
      "components/auth/**/*.tsx",
      "components/forms/**/*.tsx",
      "components/subscription/**/*.tsx",
      "components/ui/**/*.tsx",
      "app/(auth)/**/*.tsx",
      "app/(onboarding)/**/*.tsx",
      "app/page.tsx",
      "app/q/**/*.tsx",
      "app/subscribe/**/*.tsx",
      "app/(dashboard)/customers/[id]/**/*.tsx",
      "app/(dashboard)/invoices/[id]/**/*.tsx",
      "app/(dashboard)/quotes/[id]/**/*.tsx",
      "app/(dashboard)/settings/billing/**/*.tsx",
      "app/(dashboard)/customers/loading.tsx",
      "app/(dashboard)/invoices/loading.tsx",
      "app/(dashboard)/quotes/loading.tsx",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
]);

export default eslintConfig;
