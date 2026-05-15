# Feature: AI Assistant

> Phase 2 시드(Gemini Flash + AIDraftPanel + Workspace Assistant)가 부분 구현된 상태. v1 wedge "AI Quote Writer"로 재정의됨 — 자세한 v1 build 계획은 [V1-PLAN.md](./V1-PLAN.md).

## v1 Wedge (2026-05-15 APPROVED)

호주 1–3인 painter가 현장 노트 + rough measurements + 보조 사진 + price_rates를 던지면, AI가 polished quote artifact(scope of works + assumptions + exclusions + area별 line items)를 1–2분 안에 생성. AUD $59/월 Pro 정당화의 핵심.

**핵심 boundary**: AI는 surface 매핑 + scope/exclusion writing만. **Pricing은 deterministic** — painter price_rates table에서 server-side lookup. AI 출력 schema에서 rate field 제거 + `lib/ai/apply-deterministic-pricing.ts` post-pass로 채움.

## 현재 구현 vs v1 갭

| 구성 | 위치 | 현재 | v1 목표 |
|------|------|------|---------|
| Gemini Flash via Genkit | `lib/ai/drafts.ts` | non-streaming, AU prompt 없음, usage limit 없음 | streaming + AU prompt + validator + price_rates context |
| AIDraftPanel | `components/ai/AIDraftPanel.tsx` | UI 존재, QuoteCreateScreen 미연결 | QuoteCreateScreen wire-up + inline 편집 + Pro gating |
| ai-drafts server action | `app/actions/ai-drafts.ts` | 기본 draft 생성 | photos + price_rates + usage check + streaming |
| Draft schema | `lib/ai/draft-types.ts` | rooms/surfaces/coating | + photos, price_rates, job_type, scope_notes, rough_measurements |
| Workspace Assistant | `components/dashboard/WorkspaceAssistant.tsx` | Pro 한정 채팅 UI | **v1 off** (feature flag + nav 제거, 코드는 v2 검토용 유지) |
| Pro plan gating | `lib/subscription/access.ts` | 구현됨 | Starter UpgradePrompt 유지 |

## v1 신규 컴포넌트 (post-GREEN)

| 파일 | 역할 |
|------|------|
| `supabase/migrations/{ts}_ai_usage_logs.sql` | per-painter monthly limit + cost ledger |
| `lib/ai/usage.ts` | rate limit check + log writer (attempt accounting) |
| `lib/ai/validator.ts` | output schema 검증 + repair fallback |
| `lib/ai/apply-deterministic-pricing.ts` | painter price_rates server-side pass |
| `lib/ai/eval/golden-quotes.json` | AU eval harness (target 10, fallback 5) |
| `lib/ai/eval/run-eval.ts` | CLI compare AI vs golden |
| `app/(dashboard)/settings/ai-usage/page.tsx` | simple usage page (그래프 없음) |

## ai_usage_logs schema 요약

```sql
ai_usage_logs (
  id, painter_user_id, feature, attempt_status,
  input_tokens, output_tokens, cost_cents, quote_id,
  created_at, billing_month  -- GENERATED (date_trunc('month', created_at))
);
INDEX ai_usage_logs_painter_month (painter_user_id, billing_month);
-- RLS: painter sees own only.
```

- `attempt_status`: success / failed / cancelled / partial / retried
- Quota counter: success + partial 만 count (failed/cancelled 무료)
- Cost ledger: 모든 attempt 기록 → founder dashboard에서 full cost picture

## Streaming pattern

**Server Action returning `ReadableStream`** + React 19 `useTransition` consumer.

```ts
'use server'
export async function streamQuoteDraft(input: DraftInput): Promise<ReadableStream> {
  const { stream } = await ai.generateStream({ ... });
  return stream;
}
```

Day 0 spike(1일): Genkit `ai.generateStream` × Next.js 16 Server Action × Vercel Edge 호환성 검증. fail 시 SSE API route 또는 RSC `streamUI` 재논의.

UX: skeleton + room-by-room reveal (rooms[0] → rooms[1] → ...). cancellation = `AbortController`.

## AU prompt depth (T8)

Prep work, access difficulty (ladder/scaffold/2nd-storey), substrate(new plaster 3coats / repaint 2coats / raw timber), colour count, occupied vs unoccupied, patching, doors/windows/trims, minimum callout, climate(coastal humid 3coats Weathershield-style). Dulux/Wattyl 브랜드는 painter price_rates에서 derive — AI가 발명 금지.

## Gating + cost guardrails

- Pro plan = `X` quote drafts/month (X는 Phase 0 cost spreadsheet에서 결정)
- Starter plan = 0 AI drafts → UpgradePrompt
- Per-attempt log + monthly aggregate. Limit 도달 → 429 + UpgradePrompt
- Premise 6 fallback 경로: prompt 압축 → Flash → Flash-Lite cascade → per-painter limit 강화 → 가격 재검토

## Risks & critical gaps

- **Stale price_rates race** (painter mid-AI-call price_rates 수정): v1.1 TODO. v1 mitigation = AIDraftPanel에 "이 quote는 YYYY-MM-DD HH:MM 기준 rate로 생성됨" snapshot 표시. 자세한 건 [/TODOS.md](../../../TODOS.md).
- **AI hallucinated price**: validator layer가 price_rates에 없는 rate 거부 + warning. painter 검토 mandatory.
- **AI legal liability**: T11 — DRAFT marker UI(영구 banner) + PDF marker + ToS disclaimer ("AI 출력은 painter 검토 책임").
- **AI quality**: AU domain prompt + golden eval(10건)로 측정. price line item edit 비율 ≤30%, scope "send-ready" 비율 ≥70%.

## Status checklist

- [x] Gemini Flash/Genkit 시드
- [x] AIDraftPanel + ai-drafts server action 시드
- [x] Pro gating + Starter UpgradePrompt
- [x] Basic error handling
- [ ] AU prompt depth (T8)
- [ ] Streaming (T3, post Day 0 spike)
- [ ] Photo multimodal (T2, conditional on painter check)
- [ ] Per-painter monthly limit + ai_usage_logs (T4)
- [ ] Validator + deterministic pricing pass (T8)
- [ ] AIDraftPanel ↔ QuoteCreateScreen wire-up (T6)
- [ ] Workspace Assistant nav off (T7)
- [ ] DRAFT marker + ToS disclaimer (T11)
- [ ] Regression test (T12, IRON RULE)
- [ ] settings/ai-usage page (T9)
- [ ] Stripe manual pre-order link (T10)

## 관련 문서

- [V1-PLAN.md](./V1-PLAN.md) — full v1 wedge + work item 요약
- [../audit/AUDIT.md A3](../audit/AUDIT.md) — governance 활성 finding
- [../../PLANS.md](../../PLANS.md) — Phase 2 progress
- [/TODOS.md](../../../TODOS.md) — v1.1 deferred (race condition 외)
