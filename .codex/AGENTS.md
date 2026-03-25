# Coatly Codex Subagent Playbook

## Active Subagents

- `frontend_uiux` -> mobile-first screen work, interaction design, form UX, component implementation
- `backend_supabase` -> Supabase schema, RLS-safe queries, server actions, API routes, data validation
- `app_tester_reviewer` -> review findings, regression checks, targeted tests, and validation
- `data_analyst` -> SQL, reporting logic, metric definitions, and business analysis
- `vercel_deploy` -> Vercel login checks, preview/production deployments, alias updates, and release verification

## Shared Handoff Template

Use this structure when delegating to any custom subagent:

```text
Objective:
Scope:
Inputs:
Constraints:
Deliverable:
Validation:
Out of scope:
```

## Role Templates

### `frontend_uiux`

```text
Objective: Implement or refine a mobile-first UI flow.
Scope: [route/component/feature]
Inputs: [spec, screenshot, copy, existing files]
Constraints: 44px touch targets, primary CTA near bottom, preserve existing design language, no edits to components/ui primitives
Deliverable: Updated screens, states, and interaction behavior
Validation: Check mobile layout, empty/loading/error states, and key tap flows
Out of scope: Supabase schema or API redesign
```

### `backend_supabase`

```text
Objective: Implement or fix a backend or data flow.
Scope: [table/query/server action/route/onboarding profile schema]
Inputs: [schema, payload, failing behavior, target files]
Constraints: auth.uid ownership, RLS-safe access, Vercel serverless limits, explicit user-scoped queries
Deliverable: SQL, migration, server action, route handler, or query-layer change
Validation: Check auth boundary, query correctness, and relevant lint/type/test commands
Out of scope: Broad frontend redesign
```

### `app_tester_reviewer`

```text
Objective: Review, reproduce, or verify a changed behavior.
Scope: [diff/files/feature]
Inputs: [changed files, bug report, expected behavior]
Risk focus: [auth/billing/RLS/totals/mobile UX/regressions]
Deliverable: Findings, test changes, and verification outcome
Validation: Run the smallest useful checks and state what remains unverified
Out of scope: Large feature implementation unless needed for testability
```

### `data_analyst`

```text
Objective: Answer a product or business data question.
Scope: [schema/query/export/dashboard]
Inputs: [tables, SQL, requirements, sample data]
Constraints: Use only fields and behavior that exist today
Deliverable: SQL, metric definition, concise summary, or reporting recommendation
Validation: Cross-check assumptions against schema or code
Out of scope: Shipping product code unless explicitly requested
```

### `vercel_deploy`

```text
Objective: Deploy or verify the app on Vercel.
Scope: [preview/production deploy, login state, project linkage, alias/domain action, deployment debugging]
Inputs: [target environment, desired URL behavior, login status, relevant deployment error]
Constraints: ask before login, confirm target environment, avoid accidental production impact, use Vercel CLI
Deliverable: deployment result, deployment URL, alias update, or exact blocker identified
Validation: Confirm login state first, check deployment output, and verify the resulting URL
Out of scope: Unrelated application feature work
```

## Recommended Flow

```text
1. Clarify scope with `data_analyst` when requirements or metrics are vague.
2. Assign implementation to `frontend_uiux` or `backend_supabase` with a bounded file or feature scope.
3. Hand the result to `app_tester_reviewer` for findings, tests, and final verification.
```
