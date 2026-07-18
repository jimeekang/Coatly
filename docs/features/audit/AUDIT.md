# Audit & Tech Debt

> Owner: **Claude** (Opus 4.8 · extra) — 분석/감사 산출물. 항목 실행은 Codex(high)가 담당.
> 활성 리스크와 해결 이력을 한 파일에 압축해 추적합니다. 새 항목은 사용자 영향, 재현 조건, 담당 도구, 수용 기준을 포함해야 합니다. 2026-07-05 전체 앱 분석(12-agent 교차 검증) 결과 반영. 2026-07-12 상품화/UX 분석(22-agent, [../../COMMERCIALIZATION.md](../../COMMERCIALIZATION.md))으로 A17–A20 추가.

## Active Findings

| ID | 심각도 | 영역 | 상태 | 다음 액션 |
|----|--------|------|------|-----------|
| A1 | P0 | Quote/Invoice 저장 원자성 | 열림 | 다중 insert/update 흐름을 RPC transaction으로 묶을 범위 산정 |
| A2 | P1 | Public booking + Google Calendar | 열림 | Google event 생성 실패 시 booking 정책을 fail-closed로 정리 |
| A3 | P0 | v1 workflow release gate | 진행 중 | A의 실제 Excel price book을 참고해 앱 안에서 필요한 price items를 세팅한 뒤 quote PDF/email을 재현하고 PDF/email/follow-up/invoice/schedule smoke 통과. 자세한 건 [../ai/V1-PLAN.md](../ai/V1-PLAN.md) |
| A4 | P1 | Invoice reminder cron | 부분 해결 | `invoice_reminder_events` 기반 멱등성 운영 로그 점검 |
| A5 | P1 | Public quote security/audit | 부분 | token expiry/revoke/error audit 조회와 운영 화면 검토 |
| A6 | P1 | Exterior estimate | 열림 | edit/PDF/detail/AI draft 회귀 테스트 강화 |
| A7 | P2 | 문서 drift | 진행 중 | 모든 MD 300줄 이하, 파일별 Owner(Claude/Codex) 명시, PLANS를 단일 progress source로 유지, [/TODOS.md](../../../TODOS.md) 로 v1.1 deferred 추적 |
| A8 | P2 | Deferred AI governance | 보류 | AI/photo/Qwen/usage/cost work는 core workflow release 후 별도 plan. stale price_rates race 포함 — [/TODOS.md](../../../TODOS.md) |
| A9 | P1 | Quote follow-up 리마인더 미구현 | 열림 | v1 core flow 명시 요구("send → follow-up reminder/status")이자 유일한 방어 가능 차별점인데 코드에 없음(`vercel.json` cron은 invoice-reminders 하나). invoice cron 패턴 복제로 `quote-follow-ups` cron 추가 |
| A10 | P1 | Stripe webhook 하드닝 | 열림 | `event.id` 멱등 체크 부재(039 테이블 미사용), `invoice.payment_failed`가 console.warn no-op(매출 누수), `app/api/stripe/webhook` + `app/api/webhooks/stripe` 중복 라우트 1개 삭제 |
| A11 | P1 | 판매 카피–scope 모순 | 열림 | `config/plans.ts:50-51` Pro가 보류(dormant)된 "AI Quote Drafting/AI Workspace Assistant"를 판매 feature로 노출 — 신뢰/ACL 리스크. 카피 제거 + `AIDraftPanel` UI gating 정합 |
| A12 | P1 | 관측성 부재 | 열림 | 로깅이 `console.*`뿐, Sentry 등 에러 트래킹 없음. 1인 운영에서 최우선 인프라 |
| A13 | P2 | profiles/businesses 이중화 | 열림 | business_name/abn/logo가 양쪽 존재, `access.ts`가 컬럼 부재를 런타임 방어(`hasMissingProfilesColumn`) — 정본 통합 필요 |
| A14 | P2 | 디자인 토큰 우회 | 열림 | 실측 갱신: `bg-white` 241회/50파일, `ui/button.tsx`는 import 0건 死코드(32px 이슈 무의미→제거 대상), `ui/input` ↔ `forms/FormField` 이원화 — 전수·우선순위는 [DESIGN-AUDIT-2026-07-12.md](./DESIGN-AUDIT-2026-07-12.md) §3-A/§5 |
| A15 | P2 | 죽은 라우트/IA 정리 | 열림 | `/demo/schedule` 무인증 프로덕션 노출(+실 mutation 배선 확인됨), `/jobs` UI 없는 리다이렉트 스텁 경유(`QuoteActions`, `JobDetail`), `customers/[id]/edit` 부재 일관성 |
| A21 | P1 | 전앱 디자인/UX 감사 2026-07-12 | 열림 | 91건(C3·M29·m43·n16) — money screen 발송 액션 부재, 가격북 무확인 삭제, text-outline 대비 1.5:1, ErrorAlert 미채택 29곳, loading.tsx 5 라우트 누락 등. 글로벌 토큰층은 리프레시 v1.1로 해결 완료(uncommitted). 실행 큐: [DESIGN-AUDIT-2026-07-12.md](./DESIGN-AUDIT-2026-07-12.md) §5 |
| A16 | P2 | 동시성/오프라인 | 열림 | `generate_quote_number` RPC 동시 저장 시 번호 충돌 검토, PWA manifest만 있고 service worker/offline draft 보존 부재(현장 약한 네트워크 리스크 — A1과 연관) |
| A17 | P1 | Quote 발송 진실성 | 열림 | 견적 상세에 Send/Resend 부재(재발송 = 편집 폼 전체 재제출), 영구 발송 기록 없음(`?emailSent=1` 배너뿐), 수동 "Mark as sent" 부재 — 직접/SMS 전달 견적이 Draft로 남아 파이프라인·follow-up 데이터 오염 |
| A18 | P1 | 고객 이메일 reply_to 부재 | 열림 | 전 고객 메일이 전역 발신 주소로 발송, `reply_to` 사용 0건 — 고객이 답장(견적에 대한 가장 흔한 반응)하면 painter가 못 받음. painter 사업 이메일 reply_to + 발신 표시명 설정 |
| A19 | P1 | Trial 부재 하드 페이월 | 열림 | 첫 견적 생성 전 결제 요구(checkout `trial_period_days` 미설정, `subscription-sync`는 `trialing`을 이미 active 취급) — Excel 대비 평가 순간의 최대 adoption 장벽. 30일 무카드 trial + A$39 단일 플랜 개편 |
| A20 | P2 | 확인 없는 파괴적 액션 | 열림 | price item 삭제 즉시 실행(확인/undo 없음, 36px 히트영역에서 Edit 인접), 견적 "Approve Quote" 원탭 즉시 전환(복구 경로 없음) — quote delete의 DeleteModal 패턴으로 통일 |

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

### A3 — v1 Workflow Release Gate

2026-06-03 기준 v1 wedge는 AI Quote Writer가 아니라 Excel quote workflow replacement입니다. 현재 가장 큰 제품 리스크는 A의 실제 Excel 가격표를 참고해 앱 안에서 필요한 price items를 세팅하고 최근 quote PDF/email을 end-to-end 재현하지 않았다는 점입니다.

수용 기준:
- A의 실제 Excel price book을 참고해 quote 하나에 필요한 service/unit/price를 앱 안에서 세팅
- optional bulk input validation이 missing/invalid/duplicate 값을 저장 전 표시
- 검증된 price items를 Coatly price rates/templates/service items로 세팅
- 최근 quote PDF/email 1개를 Coatly에서 재현
- subtotal/GST/total/optional item/manual adjustment parity 확인
- PDF가 고객에게 보낼 수 있는 수준
- email send + public quote link smoke 통과
- follow-up due 상태가 visible
- approved quote → invoice smoke 통과
- approved quote → schedule/job smoke 통과
- lint/test/build + preview/prod smoke 통과

AI governance는 core workflow release 후 별도 항목으로 재개합니다.

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
| TD3 | P1 | v1 workflow release gate, simple price book setup, and A fixture recreation | Codex |
| TD4 | P1 | Exterior estimate regression suite | Codex |
| TD5 | P2 | Public quote event reporting UI | Claude plan → Codex |
| TD6 | P2 | Monthly analytics trend charts | Claude plan → Codex |
| TD7 | P1 | Quote follow-up reminder cron (A9) | Codex |
| TD8 | P1 | Stripe webhook idempotency + payment_failed + 중복 라우트 정리 (A10) | Codex |
| TD9 | P1 | plans.ts AI 카피 제거 + AI UI gating (A11) | Claude plan → Codex |
| TD10 | P1 | Sentry/구조화 로깅 도입 (A12) | Codex |
| TD11 | P2 | bg-white → surface 토큰 치환 + button.tsx 교정 + 프리미티브 통합 (A14) | Codex |
| TD12 | P2 | demo route gating, /jobs 스텁 직결, profiles/businesses 정본화 (A13/A15) | Codex |
| TD13 | P1 | Send/Resend + 발송 기록 + mark-as-sent + reply_to (A17/A18) | Claude plan → Codex |
| TD14 | P1 | 30일 무카드 trial + A$39 단일 플랜 개편 (A19) | Claude plan → Codex |
| TD15 | P2 | 파괴적 액션 확인 다이얼로그 통일 (A20) | Codex |

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
| Workflow | price book setup completion, price book setup time, quote recreation time, quote send completion, follow-up due visibility |
| AI (post-core) | requests/user, token cost, draft apply rate, failed generations |
| Support | public link errors, booking conflicts, PDF generation failures |
