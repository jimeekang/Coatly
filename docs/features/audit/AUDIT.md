# Audit & Tech Debt

> 활성 리스크와 해결 이력을 한 파일에 압축해 추적합니다. 새 항목은 사용자 영향, 재현 조건, 담당 도구, 수용 기준을 포함해야 합니다.

## Active Findings

| ID | 심각도 | 영역 | 상태 | 다음 액션 |
|----|--------|------|------|-----------|
| A1 | P0 | Quote/Invoice 저장 원자성 | 열림 | 다중 insert/update 흐름을 RPC transaction으로 묶을 범위 산정 |
| A2 | P1 | Public booking + Google Calendar | 열림 | Google event 생성 실패 시 booking 정책을 fail-closed로 정리 |
| A3 | P0 | AI 거버넌스 + v1 wedge | 진행 중 | Task 1 canonical totals 후 v1 build T4 (`ai_usage_logs` + Basic/Pro/Pro trial limit) + T8 validator. 자세한 건 [../ai/V1-PLAN.md](../ai/V1-PLAN.md), [../ai/V1-TASK1-RATE-SOURCE-AUDIT.md](../ai/V1-TASK1-RATE-SOURCE-AUDIT.md) |
| A4 | P1 | Invoice reminder cron | 부분 해결 | `invoice_reminder_events` 기반 멱등성 운영 로그 점검 |
| A5 | P1 | Public quote security/audit | 부분 | token expiry/revoke/error audit 조회와 운영 화면 검토 |
| A6 | P1 | Exterior estimate | 열림 | edit/PDF/detail/AI draft 회귀 테스트 강화 |
| A7 | P2 | 문서 drift | 진행 중 | 모든 MD 200줄 이하, PLANS를 단일 progress source로 유지, [/TODOS.md](../../../TODOS.md) 로 v1.1 deferred 추적 |
| A8 | P1 | Stale price_rates race (v1.1 deferred) | TODO | painter가 AI 생성 중 price_rates 수정 → AI는 old rate. v1 UI mitigation만, snapshot immutability는 v1.1 — [/TODOS.md](../../../TODOS.md) |

## Finding Details

### A1 — Quote/Invoice 저장 원자성

현재 quote/invoice는 header와 line items를 여러 쿼리로 저장합니다. 중간 실패 시 불완전 데이터가 남을 수 있으므로 고위험 경로부터 RPC transaction으로 줄이는 것이 좋습니다. v1 Task 1에서는 transaction 전 단계로 quote total authority와 invoice preset parity를 먼저 고정합니다.

수용 기준:
- 실패 시 header만 남거나 line item만 남는 상태가 없어야 함
- 테스트가 DB 실패 지점을 모킹해 rollback 기대값을 확인해야 함

### A2 — Public Booking + Google Calendar

공개 견적 승인 후 날짜 예약은 구현되어 있습니다. Google Calendar event 생성 실패가 고객에게 성공처럼 보이면 운영 사고가 됩니다.

수용 기준:
- Google write 실패 시 job 생성/예약 확정 정책이 명확해야 함
- 고객/페인터에게 재시도 가능 상태가 노출되어야 함

### A3 — AI Governance

AI draft와 workspace assistant가 구현되어 있습니다. v1 wedge 재정의(2026-05-15)로 governance가 build 핵심 — Task 1 canonical quote totals, T4 `ai_usage_logs` migration + `lib/ai/usage.ts` Basic/Pro/Pro trial rate limit + validator/repair layer + deterministic pricing pass. 자세한 건 [../ai/V1-PLAN.md](../ai/V1-PLAN.md).

수용 기준:
- user/action/model/status/token/latency/request id가 `ai_usage_logs`에 기록됨 (attempt accounting — success/failed/cancelled/partial/retried)
- per-painter monthly limit 적용, 도달 시 429 + UpgradePrompt
- AI 실패가 quote 저장을 막지 않음 (graceful degradation → manual builder fallback)
- AI rate hallucination 방지 — `lib/ai/validator.ts`가 painter price_rates에 없는 rate 거부 + warning
- DRAFT marker UI + ToS disclaimer (T11)
- 후속 critical gap: stale `price_rates` race condition은 v1.1 TODO ([/TODOS.md](../../../TODOS.md))

### A4 — Invoice Reminder Cron

`invoice_reminder_events`로 중복 발송 방지 기반은 들어왔습니다. 운영 관점에서는 실패 이벤트 조회와 재시도 기준이 남았습니다.

수용 기준:
- due soon/overdue 각각 idempotent
- Resend 실패가 silent failure로 끝나지 않음

### A6 — Exterior Estimate

Exterior estimate path는 구현되어 있으나 과거 감사에서 편집 시 snapshot 손실, margin/PDF/detail 렌더 차이가 발견되었습니다.

수용 기준:
- exterior quote edit 후 데이터 보존
- detail/PDF/AI draft가 같은 cost model 사용
- regression test 추가

## Resolved / Improved

| 날짜 | 항목 | 결과 |
|------|------|------|
| 2026-04-25 | build/lint/type 회복 | 출시 가능 상태 회복 |
| 2026-05-10 | 디자인 P0/P1 일관성 | PageHeader, ErrorAlert, CTA 패턴 적용 |
| 2026-05 | Public quote approval | token, approve/reject, signature, event table 구현 |
| 2026-05 | Invoice reminder 멱등성 | `invoice_reminder_events` 추가 |
| 2026-05 | DB linter/security hardening | migrations 043–049로 RPC/trigger/function 노출 축소 |
| 2026-05 | Schedule/jobs 통합 | `/jobs`를 schedule list로 통합, job_schedule_days 추가 |

## Tech Debt Tracker

| ID | 우선순위 | 설명 | 담당 |
|----|----------|------|------|
| TD1 | P0 | Quote/Invoice transactional save | Codex |
| TD2 | P1 | Google Calendar booking failure semantics | Codex |
| TD3 | P1 | AI usage limits and cost guardrails | Codex |
| TD4 | P1 | Exterior estimate regression suite | Codex |
| TD5 | P2 | Public quote event reporting UI | Claude plan → Codex |
| TD6 | P2 | Monthly analytics trend charts | Claude plan → Codex |

## Operational Checklist

- [ ] `npm run lint`
- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] Public quote approve/reject/manual booking smoke test
- [ ] Invoice email + public PDF token smoke test
- [ ] Google Calendar connect/disconnect smoke test
- [ ] Stripe checkout/portal/webhook smoke test

## Metrics To Add

| 범주 | Metric |
|------|--------|
| Product | quote sent→approved rate, invoice paid time, active quotes per month |
| Reliability | failed email sends, cron duplicate prevention, Google sync failures |
| AI | requests/user, token cost, draft apply rate, failed generations |
| Support | public link errors, booking conflicts, PDF generation failures |
