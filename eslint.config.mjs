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
    ".claude/**",
    "next-env.d.ts",
  ]),
  {
    files: ["**/*.tsx", "**/*.ts"],
    rules: {
      // Warn on legacy pm-* Tailwind classes. New UI must use MD3 tokens.
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
    files: ["modules/*/domain/**/*.ts", "modules/*/domain/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: [
                "next/*",
                "@/app/*",
                "@/components/*",
                "@/lib/supabase",
                "@/lib/supabase/*",
                "@/lib/email/*",
                "@/lib/pdf/*",
                "@/lib/stripe/*",
                "@/modules/*/application",
                "@/modules/*/application/*",
                "@/modules/*/ui",
                "@/modules/*/ui/*",
              ],
              message:
                "Domain layer must stay pure. Move DB, Next.js, UI, and external side effects to application or infrastructure.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/**/*.ts", "lib/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: [
                "@/modules/*/application",
                "@/modules/*/application/*",
                "@/modules/*/ui",
                "@/modules/*/ui/*",
              ],
              message:
                "Shared lib must not depend on feature application or UI internals. Move shared contracts to domain, types, config, or utils.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
