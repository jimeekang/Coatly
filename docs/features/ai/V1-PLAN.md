# Coatly v1 — AI Quote Writer

> v1 wedge 요약. 원문은 `~/.gstack/projects/jimeekang-Coatly/` 의 design + impl-plan 파일. 2026-05-16 기준.

## Wedge (Office Hours, 2026-05-15 APPROVED)

**AI Quote Writer (notes + rough measurements + photos → polished quote artifact) + 호주 native PDF + AUD $59/월.**

- 호주 1–3인 painter (sole trader / small team) 대상. Pain: site measurement(20–60분) 자체는 OK, **노트→quote 서류화**가 진짜 문제.
- 시장 갭: 미국 AI photo-takeoff SaaS(Bolster/Togal)는 호주 미진입, 호주 SaaS(Tradify/ServiceM8/Quotient)는 AI 없음. 1–2년 window 가설.
- AI는 wedge 본질. 빠지면 $59 정당화 불가.
- v1.1+ stack: Gemini Vision photo takeoff → learning-based pricing → customer portal (one-click accept + Stripe deposit). 각 phase 별도 wedge 검증.

## Phase 0 — Validation (14 days, 진행 중)

| 작업 | 상태 |
|------|------|
| 인터뷰어 5명 섭외 | ✓ 완료 (2026-05-15) |
| 30분 인터뷰 + 과거 quote 공유 요청 (eval golden set 시드) | 진행 중 |
| AI cost economics spreadsheet (Gemini Flash 토큰/quote × quotes/painter/월 × $59 ARPU → gross margin ≥70%) | 진행 중 |
| Stripe Dashboard manual payment link 5개 준비 | 진행 중 |
| 인터뷰 script — photos?, streaming?, price_rates 정확도? | 진행 중 |

### GREEN gate (Day 14)

**GREEN — build start:**
- ≥3/5 painter "쓸 것 같다" + ≥1/5 manual Stripe 선결제 $59
- ≥5 painter 과거 quote 공유 (eval seed)
- painter price_rates 입력 동의

**YELLOW — reduced scope:** 2/5 긍정 + 0 선결제 → T2/T3 defer, T8 prompt depth 축소.

**RED — kill / pivot:** ≤1/5 긍정 + 0 선결제 → office-hours로 wedge reframe (Approach C "Estimator-as-a-Service" 또는 전체 reframe).

## Build (5–7주, GREEN 후 시작)

| ID | 영역 | 핵심 |
|----|------|------|
| T1 | AI input schema 확장 | `photos`, `price_rates`, `job_type`, `scope_notes`, `rough_measurements` 추가 / `customers`, `quotes` context 제거 (P1 cost 보호). **AI 역할 boundary: surface 매핑 + scope/exclusion writing만, pricing은 deterministic** |
| T2 | Photo upload + multimodal | Phase 0 painter check ≥3/5일 때만 build. Supabase Storage RLS, max N (인터뷰 derive), 1920px JPEG 85% |
| T3 | Streaming response | **Server Action + ReadableStream** (Day 0 spike mandatory). RSC streamUI / API SSE 아님. Phase 0 painter check 조건부 |
| T4 | Per-painter usage limit + cost log | `ai_usage_logs` 테이블 (generated `billing_month` column, attempt accounting) |
| T5 | Error handling + graceful degradation | Gemini down → 1 retry → manual builder fallback CTA |
| T6 | AIDraftPanel wire-up + Pro gating + manual correction UX | `QuoteCreateScreen`에 노출, Starter UpgradePrompt, AI 출력 inline 편집 + edit ratio metadata |
| T7 | Workspace Assistant off | feature flag + nav 제거. 코드는 v2 검토용 유지 |
| T8 | AU prompt tuning + eval harness + validator | AU domain depth (prep, access, substrate, climate, occupied). 10 golden quotes. `lib/ai/validator.ts` repair layer (server-side price_rates 적용) |
| T9 | Settings/ai-usage page | 단순 SQL aggregate. 사용수 / Pro limit / 예상 비용 |
| T10 | Stripe pre-order | **manual payment link via Dashboard (~1일)**. productized page는 v1.1 deferred |
| T11 | DRAFT marker + ToS disclaimer | "DRAFT — review before send" UI + PDF marker. AI 책임 conditional ToS |
| T12 | Regression test (IRON RULE) | T1 schema 영향 — `lib/ai/drafts.test.ts`, `app/actions/ai-drafts.test.ts`, `components/ai/AIDraftPanel.test.tsx` |

## AI 역할 boundary (D6 / Codex Hybrid)

- AI **does**: free-text notes → structured surfaces, scope of works, assumptions, exclusions
- AI **does NOT**: rate 결정 — 출력 schema에서 rate field 제거
- Server-side pass: painter `price_rates` table에서 surface × coating type lookup → line items에 inject (`lib/ai/apply-deterministic-pricing.ts`)
- GST: app server-side, AI는 net (ex-GST) 출력만

## Schema 변경

```sql
CREATE TABLE ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  painter_user_id uuid NOT NULL REFERENCES auth.users(id),
  feature text NOT NULL CHECK (feature IN ('quote_draft', 'workspace_assistant')),
  attempt_status text NOT NULL CHECK (attempt_status IN ('success','failed','cancelled','partial','retried')),
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  cost_cents int NOT NULL DEFAULT 0,
  quote_id uuid REFERENCES quotes(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  billing_month date GENERATED ALWAYS AS (date_trunc('month', created_at)::date) STORED
);
CREATE INDEX ai_usage_logs_painter_month ON ai_usage_logs (painter_user_id, billing_month);
-- RLS: painter sees own only; service_role bypass.
```

추가 migrations (조건부):
- T2: `quote_photos` table 또는 `quotes.photos jsonb` (painter check 통과 시)
- T10: 없음 (v1은 manual link). productize 시 `pre_orders` v1.1

Migration 흐름: `apply_migration` → `execute_sql` 검증 → `generate_typescript_types`.

## Streaming (D2 / A1)

Pattern: **Server Action returning ReadableStream** + React 19 `useTransition` consumer (NOT RSC `streamUI`, NOT API route SSE).

```ts
// app/actions/ai-drafts.ts
'use server'
export async function streamQuoteDraft(input: DraftInput): Promise<ReadableStream> {
  const { stream } = await ai.generateStream({ ... });
  return stream; // chunks = room-by-room reveal
}
```

Day 0 spike (1일): Genkit `ai.generateStream`이 Next.js 16 Server Action + Vercel Edge에서 ReadableStream wrap 가능한지 검증. Spike fail 시 SSE API route 또는 RSC streamUI 재논의.

## Worktree parallelization

| Lane | Items | 의존 |
|------|-------|------|
| A | T1 → T12 → T8 → T3 (spike first) | — (start now) |
| B | T4 → T9 | A (T1 schema) |
| C | T6 → T7 → T11 | A (T1 schema) |
| D | T10 (manual link) | — (1일) |
| E | T2 → T5 | A (T1 schema) |

Conflict: C+E 둘 다 `AIDraftPanel.tsx` — C는 Pro gating wrapper, E는 photo upload integration. A+E 둘 다 `lib/ai/drafts.ts` — A finish prompt first, E adds error wrap outer.

**Best 5주, realistic 6주, sequential fallback 7–8주.**

## Timeline

| Phase | 기간 | 상태 |
|-------|------|------|
| Phase 0 validation + cost spreadsheet + golden set | 2주 | 진행 중 |
| GREEN gate decision | day 14 | 진행 중 |
| v1 build (5 lanes, post-GREEN) | 5–7주 | post-GREEN |
| Integration + deploy | 1주 | post-build |
| Paid trial (5 painter manual Stripe) | 4–6주 | post-deploy |
| **Total** | **12–16주** | sequential, Codex 권장 |

Build start ≠ Phase 0 parallel. GREEN gate가 theater 되지 않도록 sequential 강제.

## v1 Success Criteria

- AI cost ≤30% ARPU (premise 6 검증)
- AI 출력 price line item painter edit 비율 ≤30%
- Scope/exclusion painter "send-ready" 비율 ≥70%
- 5 인터뷰 painter 중 ≥1 paid conversion (trial → $59 paid) 4주 내
- False-positive horror story 0: 가격 -50%/+50% outlier 없음, GST 누락 0, interior/exterior 오분류 0

## Critical Gaps & Deferrals

- **Stale `price_rates` race** (painter mid-AI-call price_rates 수정) — v1.1 TODO. v1 mitigation: T6 UI에 "AI가 사용한 rates" snapshot 표시 ("이 quote는 2026-05-15 16:30 기준 rate로 생성됨"). 자세한 건 [/TODOS.md](../../../TODOS.md).
- **Stripe webhook silent fail** — v1은 manual link로 우회. productize 시 idempotency layer 추가.
- **Workspace Assistant** — v1 off. v2 검토용 코드만 유지.

## Out of Scope (v1)

- Computer vision surface detection (Gemini Vision) — v1.1
- Learning-based pricing recommendation — v1.2
- Customer portal one-click accept + Stripe deposit — v2.0
- Interior/Exterior 빌더 분리 — v2.1
- AI 사용량 full dashboard (settings/ai-usage simple page만)
- Multi-language, GPS, team scheduling, supplier integrations, native app (CLAUDE.md Out of Scope)

## Source documents

- Design (APPROVED, 2026-05-15): `~/.gstack/projects/jimeekang-Coatly/jimee-claude-upbeat-galileo-e38c4d-design-20260515-230649.md`
- Impl plan (ENG CLEARED, 2026-05-15): `~/.gstack/projects/jimeekang-Coatly/jimee-claude-upbeat-galileo-e38c4d-impl-plan-20260515-232820.md`
- Related: [AI-ASSISTANT.md](./AI-ASSISTANT.md), [AUDIT.md A3](../audit/AUDIT.md), [PLANS.md](../../PLANS.md)
