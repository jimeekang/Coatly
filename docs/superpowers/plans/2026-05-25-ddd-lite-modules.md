# DDD-Lite Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize Coatly's feature code into reusable DDD-lite modules without changing product behavior.

**Architecture:** Each feature module owns its domain logic, application actions, infrastructure adapters, and UI where applicable. Next.js route files stay thin and import module APIs. Shared framework code remains in `app/`, `lib/supabase`, and `components/shared`.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Supabase, Vitest, Testing Library.

---

### Task 1: Architecture Boundary Test

**Files:**
- Create: `modules/module-boundaries.test.ts`

- [ ] **Step 1: Write the failing boundary test**

```ts
import { describe, expect, it } from 'vitest';

import { MATERIALS_MODULE } from '@/modules/materials';
import { CUSTOMERS_MODULE } from '@/modules/customers';
import { QUOTES_MODULE } from '@/modules/quotes';
import { INVOICES_MODULE } from '@/modules/invoices';
import { JOBS_MODULE } from '@/modules/jobs';
import { PRICE_RATES_MODULE } from '@/modules/price-rates';
import { SETTINGS_MODULE } from '@/modules/settings';

describe('feature module boundaries', () => {
  it('registers the feature modules used by dashboard workflows', () => {
    expect([
      MATERIALS_MODULE.name,
      CUSTOMERS_MODULE.name,
      QUOTES_MODULE.name,
      INVOICES_MODULE.name,
      JOBS_MODULE.name,
      PRICE_RATES_MODULE.name,
      SETTINGS_MODULE.name,
    ]).toEqual([
      'materials',
      'customers',
      'quotes',
      'invoices',
      'jobs',
      'price-rates',
      'settings',
    ]);
  });
});
```

- [ ] **Step 2: Run the boundary test**

Run: `npx vitest run modules/module-boundaries.test.ts`

Expected: FAIL because the module entrypoints do not exist yet.

### Task 2: Materials Pilot Module

**Files:**
- Move: `components/materials/*` to `modules/materials/ui/`
- Move: `app/actions/materials.ts` to `modules/materials/application/actions.ts`
- Move: `lib/material-items-csv.ts` to `modules/materials/domain/csv.ts`
- Move: `lib/material-items-csv.test.ts` to `modules/materials/domain/csv.test.ts`
- Create: `modules/materials/domain/types.ts`
- Create: `modules/materials/index.ts`

- [ ] **Step 1: Move implementation files into `modules/materials`**
- [ ] **Step 2: Update imports so materials UI uses module actions and module CSV utilities**
- [ ] **Step 3: Run materials tests**

Run: `npx vitest run modules/materials/domain/csv.test.ts modules/materials/ui/MaterialItemList.test.tsx modules/module-boundaries.test.ts`

Expected: PASS after the module exists.

### Task 3: Remaining Dashboard Modules

**Files:**
- Move customers actions, API helper, and UI to `modules/customers/`
- Move quote actions, template actions, quote domain helpers, and UI to `modules/quotes/`
- Move invoice actions, invoice domain helpers, and UI to `modules/invoices/`
- Move job actions, job domain helpers, and UI to `modules/jobs/`
- Move rate settings, rate diagnostics, room pricing, and rates UI to `modules/price-rates/`
- Move settings actions, business/profile helpers, and settings UI to `modules/settings/`

- [ ] **Step 1: Move files by bounded context**
- [ ] **Step 2: Add one `index.ts` manifest per module**
- [ ] **Step 3: Rewrite imports from old feature paths to module paths**
- [ ] **Step 4: Leave shared app shell, auth, Supabase, layout, PDF, AI, calendar, and shared UI outside these modules**

### Task 4: Verification

**Files:**
- Modify imports across `app/`, `modules/`, `lib/`, `utils/`, and tests.

- [ ] **Step 1: Search for stale imports**

Run: `rg "@/components/(materials|customers|quotes|invoices|jobs|rates)|@/app/actions/(materials|customers|quotes|quote-templates|invoices|jobs|settings|business|profile)|@/lib/(material-items-csv|customers-api|quotes|invoices|jobs|rate-settings|rate-setup-diagnostics|room-price-library|interior-estimates|exterior-estimates|quick-quote-mapper|quote-form-structure|quote-pricing-scopes|detailed-estimate-anchors|businesses)|@/modules/settings/domain/onboarding"`

Expected: No production imports remain except compatibility references if deliberately kept.

- [ ] **Step 2: Run focused tests**

Run: `npx vitest run modules/module-boundaries.test.ts modules/materials/domain/csv.test.ts modules/materials/ui/MaterialItemList.test.tsx modules/customers/application/actions.test.ts modules/quotes/application/actions.test.ts modules/invoices/application/actions.test.ts modules/jobs/application/actions.test.ts modules/price-rates/domain/rate-settings.test.ts modules/settings/ui/BusinessProfileForm.test.tsx`

Expected: PASS.

- [ ] **Step 3: Run project verification**

Run: `npm run lint`, `npm run test:run`, and `npm run build`.

Expected: PASS, or fix regressions until they pass.
