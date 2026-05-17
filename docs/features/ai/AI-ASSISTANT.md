# Feature: AI Assistant

> Phase 2 AI draft panel + Workspace Assistant seed가 부분 구현된 상태. v1 wedge는 "AI-assisted Quote Form Builder"이고, 보조 AI 범위는 Today Assistant + Follow-up Writer로 제한됨 — 자세한 v1 build 계획은 [V1-PLAN.md](./V1-PLAN.md), quote form 구조는 [AI-QUOTE-FORM-STRUCTURE.md](../quote/AI-QUOTE-FORM-STRUCTURE.md), pricing foundation은 [V1-TASK1-RATE-SOURCE-AUDIT.md](./V1-TASK1-RATE-SOURCE-AUDIT.md), Quick/Advanced rate boundary는 [V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md](./V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md).

## v1 Wedge (2026-05-15 APPROVED)

호주 1–3인 painter가 현장 노트 + rough measurements + 보조 사진 + price_rates를 넣으면, AI가 polished quote form 초안(`scope_sections`, `scope_steps`, `pricing_candidates`, `clauses`)을 1–2분 안에 생성한다. v1 목표 모델은 **Alibaba Cloud / Qwen `qwen3-vl-flash`**다.

**핵심 boundary**: AI는 surface 매핑 + scope/exclusion/clause writing만 한다. **Pricing은 deterministic** — painter price_rates table에서 server-side lookup. AI 출력 schema에서 rate/price/GST/total field 제거 + `lib/ai/apply-deterministic-pricing.ts` post-pass로 채움.

2026-05-17 기준 AI pricing candidate 적용 전 선행 조건: Task 1B duplicate priced scope guard와 Task 2 Quick/Advanced snapshot/setup warning/stale-rate hardening이 완료되어야 한다.

**v1 보조 AI**: Today Assistant(오늘 처리할 quote follow-up / overdue invoice / job 요약) + Follow-up Writer(고객에게 보낼 SMS/email 초안). 범용 Workspace Assistant 채팅은 v1에서 끄고, 이 두 helper만 노출한다.

## 현재 구현 vs v1 갭

| 구성 | 위치 | 현재 | v1 목표 |
|------|------|------|---------|
| Legacy AI draft provider | `lib/ai/drafts.ts` | non-streaming, AU prompt 없음, usage limit 없음 | Qwen3-VL-Flash adapter로 전환, streaming + AU prompt + validator + price_rates context |
| AIDraftPanel | `components/ai/AIDraftPanel.tsx` | UI 존재, QuoteCreateScreen 미연결 | QuoteCreateScreen wire-up + inline 편집 + Pro gating |
| ai-drafts server action | `app/actions/ai-drafts.ts` | 기본 draft 생성 | photos + price_rates + usage check + streaming |
| Draft schema | `lib/ai/draft-types.ts` | rooms/surfaces/coating | + photos, price_rates, job_type, scope_notes, rough_measurements, `scope_sections`, `pricing_candidates`, `clauses`. 사진은 scope 보조, 자동 면적 산출 아님 |
| Quote form data model | quote feature | 고객용 scope 문서와 가격 row가 섞여 있음 | `quote_scope_sections`, `quote_scope_steps`, `quote_clause_items`, `quote_ai_intake_snapshots`로 분리 |
| Workspace Assistant | `components/dashboard/WorkspaceAssistant.tsx` | Pro 한정 채팅 UI | **generic chat v1 off**. Today Assistant + Follow-up Writer로 scoped replacement |
| Today Assistant | dashboard | 미구현 | deterministic task list + Pro AI summary |
| Follow-up Writer | quote/customer/invoice detail | 미구현 | quote check-in, booking request, invoice reminder 초안 |
| Basic/Pro plan gating | `lib/subscription/access.ts` | 구현됨/정책 업데이트 필요 | Basic limited AI + Pro full AI limits, Pro trial state |

## v1 신규 컴포넌트 (post-GREEN)

| 파일 | 역할 |
|------|------|
| `supabase/migrations/{ts}_ai_usage_logs.sql` | per-painter monthly limit + cost ledger |
| `lib/ai/usage.ts` | rate limit check + log writer (attempt accounting) |
| `lib/ai/providers/qwen.ts` | Alibaba Cloud / Qwen `qwen3-vl-flash` 호출 adapter |
| `lib/ai/validator.ts` | output schema 검증 + repair fallback |
| `lib/ai/apply-deterministic-pricing.ts` | painter price_rates server-side pass |
| `docs/features/quote/AI-QUOTE-FORM-STRUCTURE.md` | AI quote form output contract + item taxonomy |
| `lib/ai/eval/golden-quotes.json` | AU eval harness (target 10, fallback 5) |
| `lib/ai/eval/run-eval.ts` | CLI compare AI vs golden |
| `app/(dashboard)/settings/ai-usage/page.tsx` | simple usage page (그래프 없음) |
| `lib/ai/today.ts` | Today Assistant task aggregation + AI summary wrapper |
| `lib/ai/follow-ups.ts` | follow-up prompt builder + message validation |
| `app/actions/ai-follow-ups.ts` | follow-up draft server action |
| `components/dashboard/TodayAssistant.tsx` | dashboard Today helper |
| `components/ai/FollowUpWriterButton.tsx` | quote/customer/invoice detail CTA |

## ai_usage_logs schema 요약

```sql
ai_usage_logs (
  id, painter_user_id, feature, attempt_status,
  input_tokens, output_tokens, cost_cents, quote_id,
  metadata, created_at, billing_month  -- GENERATED (date_trunc('month', created_at))
);
INDEX ai_usage_logs_painter_month (painter_user_id, billing_month);
-- RLS: painter sees own only.
```

- `feature`: `quote_draft` / `today_assistant` / `follow_up_writer` / `workspace_assistant`(legacy)
- `attempt_status`: success / failed / cancelled / partial / retried
- Quota counter: success + partial 만 count (failed/cancelled 무료)
- Cost ledger: 모든 attempt 기록 → founder dashboard에서 full cost picture
- `metadata`: provider, model, assistant context type, target id, prompt version, fallback reason 등 lightweight audit

## AI model policy

v1 기본 모델은 **Alibaba Cloud / Qwen `qwen3-vl-flash`**다. 사진+텍스트 입력을 같이 처리할 수 있고, Flash tier가 v1의 비용 구조에 맞기 때문이다. 2026-05-16 공식 문서 기준 32K 이하 tier는 input $0.05 / 1M tokens, output $0.40 / 1M tokens다. 실행 전에는 공식 pricing page를 다시 확인하고, 실제 비용은 `ai_usage_logs`에 기록한다.

Implementation rules:
- all model calls go through a provider adapter, not scattered SDK calls
- store `provider = alibaba-qwen` and `model = qwen3-vl-flash` in `ai_usage_logs.metadata`
- cache photo analysis by image hash/storage path + prompt version
- keep a fallback path to manual quote builder if provider call fails
- evaluate Qwen3-VL-Flash against the golden set before Free Pro Trial + Paid Conversion Tracking; only upgrade to Plus/another model if quality fails

## Streaming pattern

**Server Action returning `ReadableStream`** + React 19 `useTransition` consumer.

```ts
'use server'
export async function streamQuoteDraft(input: DraftInput): Promise<ReadableStream> {
  const { stream } = await ai.generateStream({ ... });
  return stream;
}
```

Day 0 spike(1일): Qwen streaming response × Next.js 16 Server Action × Vercel Edge 호환성 검증. fail 시 SSE API route 또는 RSC `streamUI` 재논의.

UX: skeleton + room-by-room reveal (rooms[0] → rooms[1] → ...). cancellation = `AbortController`.

## AU prompt depth (T8)

Prep work, access difficulty (ladder/scaffold/2nd-storey), substrate(new plaster 3coats / repaint 2coats / raw timber), colour count, occupied vs unoccupied, patching, doors/windows/trims, minimum callout, climate(coastal humid 3coats Weathershield-style). Interior는 ceiling/walls/doors/bathroom/wardrobe/cornice, exterior는 rendered walls/eaves/cladding/retaining walls/timber/fence/efflorescence/difficult access를 structured section으로 만든다. Dulux/Wattyl 브랜드는 painter 설정 또는 user notes에서 derive — AI가 발명 금지.

## Photo analysis policy (T2)

사진 분석은 quote draft 생성 시 multimodal API 비용이 발생한다. v1에서는 사진을 **자동 견적 산출 엔진**이 아니라 **scope/exclusion 작성 보조 context**로만 사용한다.

AI may:
- identify visible surface candidates: walls, ceilings, doors, windows, trims, exterior areas
- mention visible condition: peeling, cracks, stains, mould, patching, access difficulty
- improve scope, assumptions, exclusions
- mark uncertain items as needing confirmation

AI must not:
- calculate exact sqm/lm from photos only
- invent hidden prep work, damage, dimensions, due dates, rates, or GST
- choose prices or override painter `price_rates`
- send or save a quote without painter review

Implementation guardrails:
- Basic photo AI: max 3 photos per quote, 15 photos/month
- Pro and Pro trial photo AI: max 5 photos per quote, 100 photos/month
- Photo AI usage counts against plan monthly photo limit and logs cost per attempt
- images are resized to max 1920px and JPEG 85% before model input
- content hash or storage path + prompt version prevents re-analysis of the same image set
- 1 retry max; every attempt logs cost and tokens
- `ai_usage_logs.metadata` stores `provider`, `model`, `photo_count`, `image_bytes`, `prompt_version`, and `cache_hit`

## Today Assistant (T13)

Dashboard에 "오늘 처리할 일"을 보여준다. Task detection은 SQL/deterministic rules가 먼저이고, AI는 Pro 사용자에게만 짧은 summary와 우선순위를 붙인다.

- Inputs: sent/open quotes without response, overdue/soon-due invoices, today/this-week jobs, approved quotes needing booking
- Output: action cards + optional AI summary
- Fallback: Qwen/Alibaba provider 실패 시 deterministic list만 표시
- Boundary: AI가 quote/invoice/job 상태를 바꾸지 않음

## Follow-up Writer (T14)

Quote/customer/invoice detail에서 고객 메시지 초안을 만든다.

- Types: quote check-in, approved quote booking request, invoice reminder
- Inputs: customer name, status, amount, public link, due date/job date if present
- Output: short SMS/email draft with editable text
- Boundary: v1 auto-send 금지. 사용자 검토 후 기존 email flow 또는 copy flow만 허용

## Gating + cost guardrails

- Basic plan = 5 AI quote drafts/month, 15 photo AI images/month, 3 photos/quote, 10 follow-up drafts/month, deterministic Today list only
- Pro plan = 25 AI quote drafts/month, 100 photo AI images/month, 5 photos/quote, 50 follow-up drafts/month, Today AI summary
- Pro 1개월 무료 trial = trial 기간 동안 Pro limits
- Basic에서 Pro-only Scope/Clause builder나 limit 초과 사용 시 UpgradePrompt. Deterministic task list는 표시 가능
- Per-attempt log + monthly aggregate. Limit 도달 → 429 + UpgradePrompt
- Premise 6 fallback 경로: prompt 압축 → 사진 수 제한 강화 → 월 draft limit 강화 → higher-cost fallback 모델 제한 사용 → 가격 재검토

## Risks & critical gaps

- **Stale price_rates race** (painter mid-AI-call price_rates 수정): v1.1 TODO. v1 mitigation = AIDraftPanel에 "이 quote는 YYYY-MM-DD HH:MM 기준 rate로 생성됨" snapshot 표시. 자세한 건 [/TODOS.md](../../../TODOS.md).
- **AI hallucinated price**: validator layer가 rate/price/GST/total field를 거부 + warning. painter 검토 mandatory.
- **AI legal liability**: T11 — DRAFT marker UI(영구 banner) + PDF marker + ToS disclaimer ("AI 출력은 painter 검토 책임").
- **AI quality**: AU domain prompt + golden eval(10건) + legacy quote form reconstruction으로 측정. scope/clause wording edit 비율 ≤30%, scope "send-ready" 비율 ≥70%.
- **Assistant overreach**: v1 보조 AI는 auto-send, status mutation, schedule mutation 금지. 모든 action은 user-confirmed.

## Status checklist

- [ ] Qwen3-VL-Flash provider adapter 전환
- [x] AIDraftPanel + ai-drafts server action 시드
- [x] Basic/Pro gating scaffold + UpgradePrompt
- [x] Basic error handling
- [ ] AU prompt depth (T8)
- [ ] Scope section + clause library output schema
- [ ] Legacy quote form reconstruction eval
- [ ] Streaming (T3, post Day 0 spike)
- [ ] Photo multimodal (T2, conditional on painter check)
- [ ] Per-painter monthly limit + ai_usage_logs (T4)
- [ ] Validator + deterministic pricing pass (T8)
- [ ] AIDraftPanel ↔ QuoteCreateScreen wire-up (T6)
- [ ] Generic Workspace Assistant nav off (T7)
- [ ] DRAFT marker + ToS disclaimer (T11)
- [ ] Regression test (T12, IRON RULE)
- [ ] settings/ai-usage page (T9)
- [ ] Today Assistant deterministic list + AI summary (T13)
- [ ] Follow-up Writer quote/customer/invoice CTA (T14)
- [ ] Pro trial state + paid conversion + cancel reason setup (T10)

## 관련 문서

- [V1-PLAN.md](./V1-PLAN.md) — full v1 wedge + work item 요약
- [V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md](./V1-TASK2-QUICK-ADVANCED-RATE-BOUNDARY.md) — Quick/Advanced rate boundary + snapshot hardening 세부 계획
- [../quote/AI-QUOTE-FORM-STRUCTURE.md](../quote/AI-QUOTE-FORM-STRUCTURE.md) — scope/pricing/clause data model + AI output contract
- [../audit/AUDIT.md A3](../audit/AUDIT.md) — governance 활성 finding
- [../../PLANS.md](../../PLANS.md) — Phase 2 progress
- [/TODOS.md](../../../TODOS.md) — v1.1 deferred (race condition 외)
