import { describe, expect, it } from 'vitest';

import {
  analyzeBoundaries,
  formatViolation,
  violationKey,
  type Violation,
} from './boundary-checker';

import { AI_MODULE } from './ai';
import { ASSISTANT_MODULE } from './assistant';
import { AUTH_MODULE } from './auth';
import { BILLING_MODULE } from './billing';
import { CUSTOMERS_MODULE } from './customers';
import { INVOICES_MODULE } from './invoices';
import { JOBS_MODULE } from './jobs';
import { MATERIALS_MODULE } from './materials';
import { ONBOARDING_MODULE } from './onboarding';
import { PRICE_RATES_MODULE } from './price-rates';
import { QUOTES_MODULE } from './quotes';
import { SCHEDULE_MODULE } from './schedule';
import { SETTINGS_MODULE } from './settings';
import { DASHBOARD_FEATURE_MODULES, PLATFORM_FEATURE_MODULES } from './index';

/**
 * These tests are a real static import-graph checker (see ./boundary-checker.ts).
 * They parse every `.ts`/`.tsx` file under the enforced roots, resolve the `@/*`
 * alias and relative specifiers to real files, and fail when the DDD layer
 * import matrix is violated or a new cross-module runtime cycle appears.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BASELINE / RATCHET
 * The two baselines below record the boundary debt that already existed when the
 * checker was introduced (in files owned by other work-streams). The tests
 * assert set-equality against these baselines, which means:
 *   • ANY new violation (new file or new bad import) fails CI immediately.
 *   • Removing/fixing a baselined violation ALSO fails CI, forcing the matching
 *     baseline entry to be deleted so the list can only shrink, never rot.
 * The goal is enforcement without silently masking regressions. Each entry is
 * documented with the owning layer and the intended remediation. Do NOT add new
 * entries to make a fresh violation pass — fix the import instead (inject the
 * dependency via props/callbacks, or route through the module's application
 * layer).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const report = analyzeBoundaries();

/**
 * Pre-existing layer-matrix violations (keyed by `rule :: file :: spec`).
 * Remediation notes are grouped by category.
 */
const KNOWN_VIOLATIONS: readonly string[] = [
  // shared kernel reaching into feature modules — invert so the feature depends
  // on lib, not lib on the feature (move the shared contract to types/ or have
  // the feature call lib).
  'shared-no-feature :: lib/supabase/validators.ts :: @/modules/materials/domain/types',

  // application reaching into another module's infrastructure — go through the
  // owning module's application layer (settings/application) instead.
  'application-no-cross-ui-infra :: modules/quotes/application/actions.ts :: @/modules/settings/infrastructure/businesses',

  // infrastructure importing another module's domain — an infra adapter should
  // receive the cross-module value from its application caller. (The schedule →
  // customers/domain edge was inverted: the calendar service now takes the
  // resolved address from its application caller, so it is no longer listed.)
  'infra-no-cross-module :: modules/settings/infrastructure/businesses.ts :: @/modules/price-rates/domain/rate-settings',

  // ui runtime-importing another module's domain values — prefer `import type`,
  // or inject the computed value. Benign (pure domain) but off-matrix.
  'ui-no-cross-runtime :: modules/quotes/ui/ExteriorEstimateBuilder.tsx :: @/modules/price-rates/domain/rate-settings',
  'ui-no-cross-runtime :: modules/quotes/ui/LineItemPicker.tsx :: @/modules/materials/domain/types',
  'ui-no-cross-runtime :: modules/quotes/ui/ProfitabilityCard.tsx :: @/modules/price-rates/domain/rate-settings',
  'ui-no-cross-runtime :: modules/quotes/ui/QuickEstimateBuilder.tsx :: @/modules/price-rates/domain/rate-settings',
  'ui-no-cross-runtime :: modules/quotes/ui/QuickQuoteBuilder.tsx :: @/modules/price-rates/domain/rate-settings',
  'ui-no-cross-runtime :: modules/quotes/ui/QuoteForm.tsx :: @/modules/price-rates/domain/rate-settings',
  'ui-no-cross-runtime :: modules/quotes/ui/QuoteForm.tsx :: @/modules/price-rates/domain/rate-setup-diagnostics',
  'ui-no-cross-runtime :: modules/quotes/ui/public/PublicDatePickerStep.tsx :: @/modules/schedule/domain/nsw-public-holidays',
];

/**
 * Cross-module runtime cycles. Formerly `ai|quotes` and
 * `ai|customers|quotes|schedule`, both of which stemmed from the create-screen
 * `ui-no-cross-runtime` edges (quotes/ui → ai/ui and customers/ui → ai/ui)
 * combined with the ai/domain → quotes/domain pricing dependency. Those UI
 * edges were removed by injecting AIDraftPanel/UpgradePrompt via props from the
 * app/ composition layer, which severed both cycles — so the graph is now
 * acyclic and the baseline is empty.
 */
const KNOWN_CYCLES: readonly string[] = [];

const baselineViolationKeys = new Set(KNOWN_VIOLATIONS);
const baselineCycleKeys = new Set(KNOWN_CYCLES);

const actualViolationKeys = new Set(report.violations.map(violationKey));
const actualCycleKeys = new Set(report.cycles.map((cycle) => cycle.key));

const introducedViolations: Violation[] = report.violations.filter(
  (violation) => !baselineViolationKeys.has(violationKey(violation)),
);
const staleViolationKeys = [...baselineViolationKeys].filter((key) => !actualViolationKeys.has(key));

const introducedCycles = report.cycles.filter((cycle) => !baselineCycleKeys.has(cycle.key));
const staleCycleKeys = [...baselineCycleKeys].filter((key) => !actualCycleKeys.has(key));

describe('module manifest completeness', () => {
  it('registers every modules/<dir> in the manifest FeatureModuleName union', () => {
    // rule (f): the manifest name set must equal the on-disk module directory set.
    expect(report.manifestNames).toEqual(report.moduleDirs);
  });

  it('exposes each feature module barrel with a matching name', () => {
    const barrelNames = [
      AI_MODULE.name,
      ASSISTANT_MODULE.name,
      AUTH_MODULE.name,
      BILLING_MODULE.name,
      CUSTOMERS_MODULE.name,
      INVOICES_MODULE.name,
      JOBS_MODULE.name,
      MATERIALS_MODULE.name,
      ONBOARDING_MODULE.name,
      PRICE_RATES_MODULE.name,
      QUOTES_MODULE.name,
      SCHEDULE_MODULE.name,
      SETTINGS_MODULE.name,
    ].sort();
    expect(barrelNames).toEqual(report.manifestNames);
  });

  it('keeps the dashboard + platform module registries within the manifest', () => {
    const registered = [
      ...DASHBOARD_FEATURE_MODULES.map((m) => m.name),
      ...PLATFORM_FEATURE_MODULES.map((m) => m.name),
    ].sort();
    expect(registered).toEqual(report.manifestNames);
  });
});

describe('static import graph is analyzable', () => {
  it('parsed a non-trivial number of source files', () => {
    // Guards against a broken resolver silently analyzing nothing.
    expect(report.fileCount).toBeGreaterThan(100);
  });

  it('resolved the @/ alias and relative imports into a module dependency graph', () => {
    // If resolution were broken (pure string matching), the graph would be empty.
    expect(Object.keys(report.moduleGraph).length).toBeGreaterThan(0);
  });
});

describe('DDD layer import matrix', () => {
  it('introduces no new layer-boundary violations', () => {
    // Any entry here is a NEW violation not covered by KNOWN_VIOLATIONS. Fix the
    // import (do not add it to the baseline).
    expect(introducedViolations.map(formatViolation)).toEqual([]);
  });

  it('has no stale baseline entries (fixed violations must be removed from KNOWN_VIOLATIONS)', () => {
    expect(staleViolationKeys).toEqual([]);
  });
});

describe('cross-module runtime cycles', () => {
  it('introduces no new module dependency cycles', () => {
    expect(introducedCycles.map((cycle) => cycle.path.join(' -> '))).toEqual([]);
  });

  it('has no stale baseline cycles (broken cycles must be removed from KNOWN_CYCLES)', () => {
    expect(staleCycleKeys).toEqual([]);
  });
});
