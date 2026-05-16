# Coatly v1 — AI Quote Writer

> v1 wedge 요약. 원문은 `~/.gstack/projects/jimeekang-Coatly/` 의 design + impl-plan 파일. 2026-05-16 기준.

## Wedge (Office Hours, 2026-05-15 APPROVED)

**AI Quote Writer (notes + rough measurements + photos → polished quote artifact) + lightweight AI operations helpers + 호주 native PDF + AUD $59/월.**

- 호주 1–3인 painter (sole trader / small team) 대상. Pain: site measurement(20–60분) 자체는 OK, **노트→quote 서류화**가 진짜 문제.
- 시장 갭: 미국 AI photo-takeoff SaaS(Bolster/Togal)는 호주 미진입, 호주 SaaS(Tradify/ServiceM8/Quotient)는 AI 없음. 1–2년 window 가설.
- AI는 wedge 본질. 빠지면 $59 정당화 불가.
- v1 보조 AI 범위: **Today Assistant**(오늘 처리할 follow-up / overdue invoice / job 요약) + **Follow-up Writer**(고객에게 보낼 SMS/email 초안). 둘 다 만능 챗봇이 아니라 기존 quote/customer/invoice/job 데이터 위의 좁은 helper.
- v1 AI model default: **Alibaba Cloud / Qwen `qwen3-vl-flash`**. 사진 분석 + quote/follow-up 초안 생성의 기본 모델로 두되, provider adapter 뒤에 감싸서 향후 교체 가능하게 만든다.
- v1.1+ stack: stronger photo takeoff model eval → learning-based pricing → customer portal (one-click accept + Stripe deposit). 각 phase 별도 wedge 검증.

## Phase 0 — Validation (14 days, 진행 중)

운영 체크리스트와 결과 기록장은 [PHASE0-CHECKLIST.md](./PHASE0-CHECKLIST.md)에 둔다.

| 작업 | 상태 |
|------|------|
| 인터뷰어 5명 섭외 | ✓ 완료 (2026-05-15) |
| 30분 인터뷰 + 과거 quote 공유 요청 (eval golden set 시드) | 진행 중 |
| AI cost economics spreadsheet (Qwen3-VL-Flash 토큰/quote × quotes/painter/월 × $59 ARPU → gross margin ≥70%) | 진행 중 |
| Stripe Dashboard manual payment link 5개 준비 | 진행 중 |
| 인터뷰 script — photos?, streaming?, price_rates 정확도? | 진행 중 |
| 보조 AI 확인 — 오늘 할 일 요약?, follow-up 문구 초안? | 진행 중 |

### GREEN gate (Day 14)

**GREEN — build start:**
- ≥3/5 painter "쓸 것 같다" + ≥1/5 manual Stripe 선결제 $59
- ≥5 painter 과거 quote 공유 (eval seed)
- painter price_rates 입력 동의

**YELLOW — reduced scope:** 2/5 긍정 + 0 선결제 → T2/T3 defer, T8 prompt depth 축소, T13/T14는 deterministic UI + 템플릿 fallback으로 축소.

**RED — kill / pivot:** ≤1/5 긍정 + 0 선결제 → office-hours로 wedge reframe (Approach C "Estimator-as-a-Service" 또는 전체 reframe).

## Build (6–8주, GREEN 후 시작)

| ID | 영역 | 핵심 |
|----|------|------|
| T1 | AI input schema + provider adapter | `photos`, `price_rates`, `job_type`, `scope_notes`, `rough_measurements` 추가 / `customers`, `quotes` context 제거 (P1 cost 보호). `lib/ai/providers/qwen.ts` 같은 얇은 adapter로 `qwen3-vl-flash` 호출을 숨김. **AI 역할 boundary: surface 매핑 + scope/exclusion writing만, pricing은 deterministic** |
| T2 | Photo upload + multimodal | Phase 0 painter check ≥3/5일 때만 build. Qwen3-VL-Flash vision input 사용. Supabase Storage RLS, max N (default 3, 인터뷰/cost spreadsheet로 조정), 1920px JPEG 85%, photo-only auto takeoff 금지 |
| T3 | Streaming response | **Server Action + ReadableStream** (Day 0 spike mandatory). Qwen streaming response 호환성 확인. RSC streamUI / API SSE 아님. Phase 0 painter check 조건부 |
| T4 | Per-painter usage limit + cost log | `ai_usage_logs` 테이블 (generated `billing_month` column, attempt accounting) |
| T5 | Error handling + graceful degradation | Qwen/Alibaba provider down → 1 retry → manual builder fallback CTA |
| T6 | AIDraftPanel wire-up + Pro gating + manual correction UX | `QuoteCreateScreen`에 노출, Starter UpgradePrompt, AI 출력 inline 편집 + edit ratio metadata |
| T7 | Generic Workspace Assistant off | 범용 채팅 UI는 feature flag + nav 제거. 코드는 v2 검토용 유지하고, v1은 T13/T14의 scoped assistants만 노출 |
| T8 | AU prompt tuning + eval harness + validator | AU domain depth (prep, access, substrate, climate, occupied). 10 golden quotes. `lib/ai/validator.ts` repair layer (server-side price_rates 적용) |
| T9 | Settings/ai-usage page | 단순 SQL aggregate. 사용수 / Pro limit / 예상 비용 |
| T10 | Stripe pre-order | **manual payment link via Dashboard (~1일)**. productized page는 v1.1 deferred |
| T11 | DRAFT marker + ToS disclaimer | "DRAFT — review before send" UI + PDF marker. AI 책임 conditional ToS |
| T12 | Regression test (IRON RULE) | T1 schema 영향 — `lib/ai/drafts.test.ts`, `app/actions/ai-drafts.test.ts`, `components/ai/AIDraftPanel.test.tsx` |
| T13 | Today Assistant | Dashboard에 deterministic task list + AI summary. Follow-up 필요한 quote, overdue invoice, 오늘/이번 주 job만 표시. Starter는 deterministic list, Pro는 AI summary |
| T14 | Follow-up Writer | Quote/customer/invoice 화면에서 고객 메시지 초안 생성. 견적 확인 요청, 승인 후 일정 잡기, invoice reminder. **자동 발송 없음** — user review 후 기존 email flow 또는 manual copy |

## AI 역할 boundary (D6 / Codex Hybrid)

- AI **does**: free-text notes → structured surfaces, scope of works, assumptions, exclusions
- AI **does NOT**: rate 결정 — 출력 schema에서 rate field 제거
- Server-side pass: painter `price_rates` table에서 surface × coating type lookup → line items에 inject (`lib/ai/apply-deterministic-pricing.ts`)
- GST: app server-side, AI는 net (ex-GST) 출력만
- 보조 AI **does**: deterministic query 결과를 요약하고, follow-up 메시지 초안을 작성
- 보조 AI **does NOT**: 고객에게 자동 발송, job 일정 변경, invoice/quote status 변경, due date 발명

## AI Model Policy (v1)

v1 기본 모델은 **Alibaba Cloud / Qwen `qwen3-vl-flash`**로 둔다. 선택 이유는 사진+텍스트 입력을 같이 처리할 수 있고, Flash tier가 v1의 비용 구조에 맞기 때문이다. 2026-05-16 공식 문서 기준으로 `qwen3-vl-flash`는 vision/text input과 text output을 지원하고, 32K 이하 tier 가격이 input $0.05 / 1M tokens, output $0.40 / 1M tokens다. 실제 비용 계산은 Phase 0 D6/D11에 공식 pricing page를 다시 확인해서 기록한다.

### 적용 범위

- Quote draft: notes + rough measurements + photos + price_rates context를 받아 polished quote artifact 초안을 만든다.
- Photo analysis: surface 후보, visible condition, access/prep hint, assumptions/exclusions 작성 보조.
- Today Assistant: deterministic task list 위에 짧은 summary와 우선순위 문장 생성.
- Follow-up Writer: quote check-in, booking request, invoice reminder 문구 초안 작성.

### 구현 원칙

- 모델 호출은 `lib/ai/providers/*` adapter 뒤에 둔다. 앱 전체가 특정 provider SDK에 직접 묶이지 않게 한다.
- `ai_usage_logs.metadata.model`에는 실제 사용 모델 ID를 저장한다. 예: `qwen3-vl-flash`.
- `ai_usage_logs.metadata.provider`에는 `alibaba-qwen`을 저장한다.
- prompt version과 image hash를 같이 저장해 같은 사진 세트를 불필요하게 재분석하지 않는다.
- Qwen3-VL-Flash 품질이 golden set 기준을 못 넘으면 Qwen3-VL-Plus 또는 다른 vision model fallback을 별도 eval 후 결정한다.

## Photo Analysis & Cost Policy (T2)

사진이 포함된 AI draft는 사용자 action마다 multimodal API 비용이 발생한다. 따라서 v1은 "사진만 보고 자동 견적 산출"이 아니라 **notes + rough measurements 중심, 사진은 scope 검토 보조**로 제한한다.

### v1 photo AI가 하는 일

- 사진에서 interior/exterior, wall/ceiling/trim/door/window 같은 surface 후보를 식별
- peeling, cracks, stains, mould, patching, raw timber, access difficulty 같은 visible condition을 초안에 반영
- scope, assumptions, exclusions 문장을 더 정확하게 작성
- 불확실한 항목은 "confirm on site"로 표시

### v1 photo AI가 하지 않는 일

- 사진만으로 sqm/lm 자동 산출
- painter `price_rates` 없이 가격 또는 rate 결정
- GST 계산
- 보이지 않는 damage, prep work, access issue 발명
- "확실함"으로 단정하거나 user review 없이 quote 발송

### Cost guardrails

- Starter: photo AI 없음
- Pro: monthly AI draft limit 안에서만 사용
- quote당 사진 수 제한: default 3장, Phase 0 인터뷰와 cost spreadsheet로 최종 확정
- 업로드 전 1920px 이하 JPEG 85%로 리사이즈/압축
- 동일 파일은 content hash 또는 storage path + prompt version 기준으로 재분석 방지
- 재시도는 1회만 허용하고 모든 attempt를 `ai_usage_logs`에 기록
- `ai_usage_logs.metadata`에 `photo_count`, `image_bytes`, `model`, `prompt_version`, `cache_hit` 기록
- `ai_usage_logs.metadata`에 `provider = alibaba-qwen` 기록
- AI 비용 상한: 전체 AI cost ≤30% Pro ARPU. 초과 예상 시 T2 defer 또는 사진 수/월 draft limit 축소

### Product wording

v1 marketing/product copy는 "사진만으로 자동 견적"을 말하지 않는다. 안전한 표현은:

> 사진과 현장 노트를 바탕으로 견적 초안을 빠르게 만들어줍니다. Painter가 검토하고 수정한 뒤 발송합니다.

## Schema 변경

```sql
CREATE TABLE ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  painter_user_id uuid NOT NULL REFERENCES auth.users(id),
  feature text NOT NULL CHECK (feature IN ('quote_draft','today_assistant','follow_up_writer','workspace_assistant')),
  attempt_status text NOT NULL CHECK (attempt_status IN ('success','failed','cancelled','partial','retried')),
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  cost_cents int NOT NULL DEFAULT 0,
  quote_id uuid REFERENCES quotes(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  billing_month date GENERATED ALWAYS AS (date_trunc('month', created_at)::date) STORED
);
CREATE INDEX ai_usage_logs_painter_month ON ai_usage_logs (painter_user_id, billing_month);
-- RLS: painter sees own only; service_role bypass.
```

추가 migrations (조건부):
- T2: `quote_photos` table 또는 `quotes.photos jsonb` (painter check 통과 시)
- T10: 없음 (v1은 manual link). productize 시 `pre_orders` v1.1
- T13/T14: 신규 테이블 없음. 기존 `quotes`, `customers`, `invoices`, `jobs`, `job_schedule_days` read model + `ai_usage_logs.metadata`만 사용

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

Day 0 spike (1일): Qwen streaming response가 Next.js 16 Server Action + Vercel Edge에서 ReadableStream wrap 가능한지 검증. Spike fail 시 SSE API route 또는 RSC streamUI 재논의.

## Auxiliary AI Scope (v1)

### Today Assistant (T13)

Dashboard 상단/중단에 "Today" helper를 둔다. SQL로 먼저 할 일을 결정하고, Pro 사용자에게만 AI가 짧은 요약 문장과 우선순위를 붙인다.

- 데이터: sent/open quotes without response, overdue/soon-due invoices, today/this-week jobs, approved quotes needing booking follow-up
- UX: action card list + "Write follow-up" CTA. AI가 직접 상태를 바꾸거나 메시지를 보내지 않음
- Fallback: AI 실패 시 deterministic task list만 유지

### Follow-up Writer (T14)

Quote/customer/invoice detail에서 고객에게 보낼 짧은 SMS/email 초안을 만든다.

- 메시지 유형: quote check-in, quote approved → booking request, invoice reminder
- Context: customer name, quote/invoice status, amount, public link availability, job date if known
- Guardrail: user review mandatory. v1은 auto-send 금지, existing email send 또는 copy flow로만 연결

## Worktree parallelization

| Lane | Items | 의존 |
|------|-------|------|
| A | T1 → T12 → T8 → T3 (spike first) | — (start now) |
| B | T4 → T9 → T13 | A (T1 schema), dashboard read model |
| C | T6 → T7 → T11 → T14 | A (T1 schema), existing quote/invoice email flow |
| D | T10 (manual link) | — (1일) |
| E | T2 → T5 | A (T1 schema) |

Conflict: C+E 둘 다 `AIDraftPanel.tsx` — C는 Pro gating wrapper, E는 photo upload integration. A+E 둘 다 `lib/ai/drafts.ts` — A finish prompt first, E adds error wrap outer.

T13은 `dashboard/page.tsx`와 AI usage shared code, T14는 quote/customer/invoice detail CTA와 충돌 가능. 범용 `WorkspaceAssistant`를 확장하지 말고 scoped components로 분리.

**Best 6주, realistic 7주, sequential fallback 8–9주.**

## Timeline

| Phase | 기간 | 상태 |
|-------|------|------|
| Phase 0 validation + cost spreadsheet + golden set | 2주 | 진행 중 |
| GREEN gate decision | day 14 | 진행 중 |
| v1 build (5 lanes, post-GREEN) | 6–8주 | post-GREEN |
| Integration + deploy | 1주 | post-build |
| Paid trial (5 painter manual Stripe) | 4–6주 | post-deploy |
| **Total** | **13–17주** | sequential, Codex 권장 |

Build start ≠ Phase 0 parallel. GREEN gate가 theater 되지 않도록 sequential 강제.

## v1 Success Criteria

- AI cost ≤30% ARPU (premise 6 검증)
- AI 출력 price line item painter edit 비율 ≤30%
- Scope/exclusion painter "send-ready" 비율 ≥70%
- Today Assistant task list "useful today" 응답 ≥70% (paid trial cohort)
- Follow-up Writer 초안 사용/수정 후 발송 또는 copy 비율 ≥50%
- 5 인터뷰 painter 중 ≥1 paid conversion (trial → $59 paid) 4주 내
- False-positive horror story 0: 가격 -50%/+50% outlier 없음, GST 누락 0, interior/exterior 오분류 0

## Critical Gaps & Deferrals

- **Stale `price_rates` race** (painter mid-AI-call price_rates 수정) — v1.1 TODO. v1 mitigation: T6 UI에 "AI가 사용한 rates" snapshot 표시 ("이 quote는 2026-05-15 16:30 기준 rate로 생성됨"). 자세한 건 [/TODOS.md](../../../TODOS.md).
- **Stripe webhook silent fail** — v1은 manual link로 우회. productize 시 idempotency layer 추가.
- **Generic Workspace Assistant** — v1 off. v2 검토용 코드만 유지. v1은 Today Assistant + Follow-up Writer만 허용.
- **Assistant overreach** — v1 보조 AI는 자동 발송/자동 일정 변경/자동 상태 변경 금지. 모든 action은 user-confirmed.

## Out of Scope (v1)

- Computer vision surface takeoff — v1.1. v1의 Qwen3-VL-Flash는 scope 보조만 하고 정확한 sqm/lm 산출은 하지 않음
- Learning-based pricing recommendation — v1.2
- Customer portal one-click accept + Stripe deposit — v2.0
- Interior/Exterior 빌더 분리 — v2.1
- AI 사용량 full dashboard (settings/ai-usage simple page만)
- Multi-language, GPS, team scheduling, supplier integrations, native app (CLAUDE.md Out of Scope)

## Source documents

- Design (APPROVED, 2026-05-15): `~/.gstack/projects/jimeekang-Coatly/jimee-claude-upbeat-galileo-e38c4d-design-20260515-230649.md`
- Impl plan (ENG CLEARED, 2026-05-15): `~/.gstack/projects/jimeekang-Coatly/jimee-claude-upbeat-galileo-e38c4d-impl-plan-20260515-232820.md`
- Related: [AI-ASSISTANT.md](./AI-ASSISTANT.md), [AUDIT.md A3](../audit/AUDIT.md), [PLANS.md](../../PLANS.md)
