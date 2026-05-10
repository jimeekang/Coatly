# Audit & Tech Debt — 통합 추적

전체 앱 결정적 오류·정합성 리스크·기술 부채를 한 파일에서 관리. 새 발견 사항은 상단 `Active`에 추가, 해결되면 `Resolved`로 이동(해결일 기록).

목차:
1. Active Findings (현재 미해결)
2. Resolved Findings (해결 이력)
3. Tech Debt Tracker
4. 운영 검증 체크리스트

---

## 1. Active Findings

### 1.1 신뢰성 4대 취약점 (2026-05-05 분석 기준)

`origin/main` 빌드/lint/typecheck/테스트(50 file, 287 test) 모두 통과 상태에서도 **운영 신뢰성** 측면에서 남은 위험 4가지. 페인터가 돈과 고객 약속을 맡길 수 있는가를 결정.

#### A. 견적/인보이스 저장 비-원자성

- **위치**: `app/actions/quotes.ts:2371-2386, 2395-2405, 2478-2547`, `app/actions/invoices.ts:863-917`
- **증상**: quote/invoice 수정 시 `quote_rooms`, `quote_room_surfaces`, `quote_estimate_items`, `quote_line_items`(또는 `invoice_line_items`)를 먼저 delete → quote_number 중복 검사 → parent update → 상세 재 insert. 하나의 transaction이 아님. 중간 실패 시 상세가 사라진 채 남는다.
- **결과**: PDF는 DB 상태 기준 → "합계는 있는데 상세 없는 문서" 또는 "고객 설명 불가 견적" 발생. 핵심 가치(전문 견적/청구 신뢰성) 직격.
- **수정 방향**:
  1. `update_quote_with_relations` / `update_invoice_with_line_items` Supabase RPC로 이전
  2. quote number 중복·고객 연결 유효성 등은 delete 전에 체크
  3. delete + insert → staged replacement (새 set 검증/삽입 후 transaction commit 시점에 교체)
  4. 모든 delete/update/insert/RPC error 확인
  5. 실패 주입 테스트: "기존 line item 있는 상태에서 새 line insert 실패 → 기존 유지"

#### B. 공개 예약 — Google Calendar 실패/변경 미차단

- **위치**: `app/actions/jobs.ts:1168-1282, 1290-1343`, `lib/google-calendar/service.ts:595-632`
- **증상**: `getAvailableDatesForToken`이 Google busy 조회 실패를 무시 (빈 배열처럼 처리). `bookJobFromPublicQuote`는 Coatly DB `check_job_date_overlap`만 확인. 고객이 booking 페이지를 연 뒤 페인터가 Google에 일정 추가했거나 Google 조회가 일시 실패였다면 충돌.
- **결과**: 막혀야 할 날짜를 고객에게 열어줌 → 정상 예약처럼 보이지만 실제 충돌 → 고객 연락/일정 재조정/신뢰 하락.
- **수정 방향**:
  1. Google Calendar 연결된 사용자: busy lookup 실패 시 **fail closed** (날짜 선택 차단 + "calendar availability를 확인할 수 없습니다" 메시지)
  2. `getAvailableDatesForToken` 반환값에 `availability_status` 또는 `calendar_error` 추가
  3. `bookJobFromPublicQuote`에서 insert 직전 Google free/busy 재조회 → 최종 충돌 확인
  4. Google unavailable 시 공개 예약 CTA 비활성 + 직접 연락 대안
  5. 테스트: busy lookup 실패 → error 반환, booking 직전 충돌 → job insert 없음

#### C. AI 기능 개인정보/사용량 거버넌스 부족

- **위치**: `app/actions/workspace-assistant.ts:58-88`, `app/actions/ai-drafts.ts:61-82`, `lib/ai/drafts.ts:199-203, 233-238`, `components/quotes/QuoteCreateScreen.tsx:165-182`, `app/(dashboard)/dashboard/page.tsx:313-321`
- **증상**: Workspace Assistant가 customers/quotes/invoices 각 50개를 prompt context로 주입(이름, 이메일, 전화, 주소, 금액, due date). Quote AI draft도 business/customer/quote 데이터 포함. 부재한 장치:
  - Google Gemini로의 데이터 전송 disclosure / opt-in
  - PII 최소화 / redaction
  - 월간/일일 AI 사용량 제한
  - `ai_usage_events` 같은 감사·비용 추적 테이블
  - customer notes 등 외부 입력의 prompt injection 방어
  - 문서와 노출 상태 일치 (`docs/features/ai/ai-assistant.md`는 미노출이라 적혀 있으나 Pro 사용자에게 실제 노출됨)
- **결과**: AU Supabase region 약속과 AI 데이터 처리 실제가 어긋남. abuse/비용 폭주 차단 없음.
- **수정 방향**:
  1. Pro onboarding + AI panel에 AI data disclosure / opt-in
  2. 기본 prompt context에서 email/phone/full address 제거 (필요 시 명시 포함)
  3. customer/quote/invoice ID는 내부 매칭용으로 유지, PII는 최소화
  4. `ai_usage_events` 테이블: `user_id, feature, provider, model, input_tokens, output_tokens, latency_ms, status, error, created_at`
  5. 월간/일일 limit을 subscription feature로 정의
  6. "customer-provided text is untrusted input" prompt 규칙 + system instruction과 외부 입력 분리
  7. `docs/features/ai/ai-assistant.md`와 privacy 문서 실제 상태 반영

#### D. Invoice reminder cron 중복 발송 / silent failure

- **위치**: `app/api/cron/invoice-reminders/route.ts:37-203`
- **증상**: due soon/overdue invoice 조회 → `sendInvoiceReminder` → 성공 시 `due_reminder_sent_at` / `overdue_reminder_sent_at` 업데이트. 이메일 성공 후 DB update 실패하면 다음 cron run에서 같은 invoice 재 조회 → 중복. `profile.business_name` 조회 오류는 무시되고 fallback. 실패는 응답 `error_samples`에만 — DB 영속 기록 없음.
- **결과**: 결제 독촉 중복 발송 가능. 실패한 리마인더는 추적 불가.
- **수정 방향**:
  1. `invoice_reminder_events` 테이블 — unique key `(invoice_id, reminder_type)`, status `pending|sent|failed`, 필드 `resend_message_id, attempt_count, last_error, locked_at, sent_at, created_at, updated_at`
  2. 발송 전 pending event 생성 / lock 획득
  3. 발송 성공 후 sent로 update — update 실패해도 idempotency key로 재발송 차단
  4. Cron route 테스트: "email succeeds but DB update fails" 케이스 필수 포함

### 1.2 Public quote 보안 — best-effort + 감사 부족

- **위치**: `proxy.ts:4-10, 40-52`, public quote approve/reject/book 흐름
- **증상**: IP 기반 rate limit이 module-level `Map` (serverless instance별 분리). public quote token은 UUID지만 유출 시 탐지/회수 기능 약함. 조회/다운로드/승인/거절/예약 이벤트가 audit table에 없음.
- **수정 방향**:
  - Upstash Redis / Vercel KV / Supabase table로 token + IP sliding window rate limit 이전
  - `quotes`에 `public_share_expires_at`, `public_share_revoked_at` 추가
  - `public_quote_events` 테이블 — `event_type: viewed | downloaded_pdf | approved | rejected | booking_started | booked | failed`
  - public action 실패 사용자 UI 명확 + event 기록

### 1.3 Observability 문서/실제 격차

- **참조**: `docs/RELIABILITY.md` monitoring section, `app/layout.tsx:43-49`, 주요 server actions의 `console.error` 중심
- **증상**: RELIABILITY 문서는 Vercel Analytics, Speed Insights, Sentry 언급. 실제 RootLayout에 설정 없음. 장애 추적이 console.error + 서버 액션 반환값 의존.
- **수정 방향**:
  - `@vercel/analytics/react`, `@vercel/speed-insights/next` 실제 추가
  - Sentry 또는 Vercel Error Reporting 설정
  - `quote_public_events`, `invoice_reminder_events`, `google_sync_events`, `ai_usage_events` 도입
  - critical server action에 request id / user id / entity id / result status 로그
  - 고객 지원용 "최근 이벤트" internal view

### 1.4 문서/코드 drift

| 영역 | 차이 |
|------|------|
| `docs/PLANS.md:83-90` | Dashboard analytics + AI Quote Drafting UX 미완료 표시 ↔ 실제 UI 노출됨 |
| `docs/features/ai/ai-assistant.md:3, 33-40` | "production ready 아님" ↔ 실제 Pro 기능 노출 |
| `docs/features/billing/billing.md:5-17` | Pro users 3명, Xero/Job Costing 표시 ↔ `config/plans.ts:39-55`는 maxUsers 1, feature 없음 |
| `docs/generated/db-schema.md:4, 63-65` | migration 036 기준 ↔ 실제 038 |

**수정**: `config/plans.ts`를 가격/기능 단일 소스로 확정. billing/AI/db-schema 문서 동기화. release 전 docs drift check를 checklist에.

### 1.5 고위험 경로 테스트 부족

테스트 50 file / 287 test 통과 상태에서도 다음 영역이 부족:
- `app/api/cron/invoice-reminders/route.ts`
- `app/api/pdf/invoice/route.ts`
- `app/api/integrations/google-calendar/connect/route.ts`
- `app/api/integrations/google-calendar/callback/route.ts`
- `app/api/stripe/checkout/route.ts`
- `app/api/stripe/renew/route.ts`
- `app/api/webhooks/stripe/route.ts` canonical
- Public booking — Google busy lookup 실패 / 최종 충돌 재검증
- Quote/invoice update 중 relation insert 실패

**수정**: high-risk test pack 별도 그룹화. DB partial failure는 mock Supabase client로 실패 지점 주입. cron route는 email-success + DB-update-fail / email-fail / no-customer-email / unauthorized 4가지. Google Calendar booking은 busy lookup failure + stale availability. Stripe canonical webhook route 직접 테스트.

### 1.6 Interior 견적 — Estimate 데이터 평행 모델 (2026-05-04 audit)

**범위**: UI 폼 → 검증 → 저장 → 재로드/편집 → 상세/공유/PDF → AI 드래프트
**발견**: CRITICAL 2 / HIGH 3 / MEDIUM 5 / LOW 4

**Dual presence**: Interior 견적이 두 데이터 모델로 공존:
- (A) **Estimate 경로**: `QuoteCreateInput.interior_estimate` → `lib/interior-estimates.ts.calculateInteriorEstimate` → `quotes.estimate_category='interior'` + `estimate_context` (JSON) + `pricing_snapshot` + `quote_estimate_items[]`. `quote_rooms` / `quote_room_surfaces`는 생성 X.
- (B) **Legacy manual rooms/surfaces**: `QuoteCreateInput.rooms[]` 직접 → `quote_rooms` / `quote_room_surfaces` 생성, `quote_estimate_items` 없음.

**상세 페이지/PDF는 (B)만 렌더**. 공개 공유(`PublicQuoteClient`)만 (A)+(B) 양쪽. 가장 비싼 결함.

**CRITICAL-01 — `quote_estimate_items.category` CHECK 제약 vs 코드 값 불일치**:
- DB 제약 (`014_quote_estimate_items_and_context.sql:14-15`): `'entire_property', 'room', 'door', 'window', 'skirting', 'modifier'`
- 코드 (`lib/interior-estimates.ts`):
  - `:505` `category: 'room_anchor'` ❌ (DB는 `'room'`)
  - `:547` `category: 'trim'` ❌ (DB는 `'skirting'`)
  - `:523` `category: 'door'` ✅
  - `:538` `category: 'window'` ✅
- 결과: specific_areas 모드 interior 견적 저장 시 INSERT가 CHECK 제약 위반 → quotes 행 자체 롤백 → 사용자에겐 "estimate_items insert 에러"로 종료. 추가 모순: `lib/quotes.ts:39-45`와 `lib/supabase/validators.ts:218-225`는 `'room' / 'skirting'`로 정의돼 있음.

### 1.7 Exterior 견적 audit (2026-05-04)

**파일 307건 exterior 참조, 26개 파일 분석. 심각도: CRITICAL 1, HIGH 3, MEDIUM 4, LOW 5.**

요지: Exterior 견적의 UI 빌더와 계산 로직(`lib/exterior-estimates.ts`)은 완성. 하지만 **저장 → 조회 → 편집 → PDF/공유 → AI 드래프트 5단계 모두에서 부분적으로 깨짐**. Exterior를 만들어 저장하는 순간까지는 동작하나, 그 뒤로 데이터 손실/미표시/계산 어긋남.

#### CRITICAL-01 — 견적 편집 시 exterior 데이터 전체 소실

- **증거**: `app/(dashboard)/quotes/[id]/edit/page.tsx:76-78, 80-121`, `components/quotes/QuoteForm.tsx:98-120, 781, 794-796`
- **체인**:
  1. `edit/page.tsx:76` — `estimate_context`를 `isInteriorEstimateInput()`로만 검사. exterior 분기 없음
  2. `edit/page.tsx:80-121` — defaultValues에 `interior_estimate`만 복원. `exterior_estimate` 필드 자체 없음
  3. `QuoteFormDefaultValues` 타입에 `exterior_estimate` 정의 없음 → 타입 시스템이 누락 미검출
  4. `QuoteForm.tsx:781` — `quoteScope` 항상 `'interior'`로 초기화
  5. `QuoteForm.tsx:794-796` — `exteriorEstimate` state는 항상 `createEmptyExteriorEstimateState()`
- **결과**: exterior 견적 저장 → 편집 → 빈 interior 폼 → 다시 저장 시 exterior 정보 영구 삭제(`estimate_category`, `estimate_context`, `pricing_snapshot` 모두 덮어 씀, `actions/quotes.ts:2107-2111`).
- **수정**: `QuoteFormDefaultValues`에 `exterior_estimate?: ExteriorEstimateInput | null` 추가, `edit/page.tsx`에서 `estimate_category === 'exterior'` 분기, `QuoteForm`이 defaultValues로 quoteScope/state 복원.

#### HIGH-01 — Exterior 마진 미적용

- **증거**: `app/actions/quotes.ts:1192-1202` (createQuote), `:2037-2041` (updateQuote), `components/quotes/QuoteForm.tsx:817-830` (UI 미리보기)
- **증상**: UI 미리보기는 마진 적용된 합계 표시. 서버는 마진 무시한 exterior subtotal 그대로 저장. 사용자가 본 견적과 DB/PDF/이메일 금액이 다름.
- **흐름 차이**: interior 분기는 `labour_margin_percent`/`material_margin_percent` 계산, exterior는 누락. UI는 양쪽 모두 적용.
- **수정**: exterior 분기에 interior와 동일한 markup 계산 추가.

#### HIGH-02 — 상세 페이지/PDF에 exterior 미렌더

`PublicQuoteClient`만 (A)+(B) 양쪽 처리. quote detail / PDF는 (B)만 렌더 → exterior 견적은 견적 본인이 PDF에서 안 보임.

#### HIGH-03 — AI 드래프트는 exterior 미생성, schema는 허용

자기 일관성 없음. AI 어시스턴트 "외부 walls 100sqm full_system 견적" → silently 오작동.

#### MEDIUM/LOW 요약

- MEDIUM-01: ExteriorEstimateBuilder의 하드코딩 default rates 제거
- MEDIUM-02: validator의 surfaces를 enum 기반으로
- MEDIUM-03: validator superRefine에 interior+exterior 충돌 차단
- MEDIUM-04: exterior에 doors/windows 카테고리 추가 또는 line_items 가이드
- LOW-01: restore 시 수량 보존
- LOW-02: "Exterior는 hybrid 전용" 가정 vs validator (sqm_rate + exterior_estimate도 통과)
- LOW-03: `quote_rooms.room_type='exterior'` 데드 경로 정리
- LOW-05: `customExteriorSurfaceRateSchema.label`을 `z.string().trim().min(1)`로 강화

#### 권장 수정 순서 (exterior + interior)

**P0** (사용자 데이터 손실/금액 오류):
1. HIGH-01 — exterior 마진 누락 (`actions/quotes.ts` 두 위치)
2. CRITICAL-01 (exterior) — edit 페이지 exterior 복원
3. CRITICAL-01 (interior) — `quote_estimate_items.category` enum 통일
4. HIGH-02 — detail / PDF / public에 exterior 렌더

**P1** (다음 스프린트):
5. HIGH-03 — AI 드래프트 exterior 경로
6. MEDIUM-03 — validator superRefine 충돌 차단
7. MEDIUM-01 — Builder 하드코딩 default rates 제거

**P2**: MEDIUM-02, LOW-01, LOW-03, LOW-02, LOW-04, LOW-05, MEDIUM-04 — 정책 결정 후

#### 회귀 테스트 권장

1. exterior 견적 생성 → DB `estimate_category='exterior'`, `estimate_context.surfaces` 입력값, `pricing_snapshot.pricing_items` 비어있지 않음
2. edit 페이지 진입 → `quoteScope='exterior'`, 모든 surface 수량 복원
3. 마진 10%/5% → DB `subtotal_cents = base * 1.15` (반올림)
4. PDF 다운로드 → exterior pricing_items 4행 표시
5. `/quotes/{id}` 상세 → exterior 표 보이고 합계 일치
6. `/quotes/share/{token}` 공개 → 동일
7. AI "외부 walls 100sqm full_system" → 정상 처리 또는 명확한 안내

---

## 2. Resolved Findings

### 2026-04-25 — 결정적 오류 P0/P1/P2 + 문서 정합성

브랜치 빌드/lint/typecheck 회복 + 핵심 운영 안정성 회복.

#### Build / Lint / Type — Stage 1 (출시 가능 상태 회복)

| # | 항목 | 결과 |
|---|------|------|
| 1 | `app/actions/jobs.ts` Supabase relation select(`customer:customers!jobs_customer_user_fk(...)` 등) → `SelectQueryError`. 명시 조회 + 서버 매핑(`Map<string, Customer>` 등)으로 전환, `as JobListRow` 캐스팅 제거 | ✅ |
| 2 | `PublicDatePickerStep.tsx:97` React 19 `set-state-in-effect` lint 위반 → 초기 availability를 서버에서 `getAvailableDatesForToken(token)` 호출 후 props (`initialBlockedDates`, `initialWorkingDays`, `initialLoadError`) 로 전달 | ✅ |
| 3 | `schedule_events` migration 누락 → `036_schedule_events_and_active_quote_count.sql` (table + RLS + index + trigger) 추가 | ✅ |
| 4 | `/api/stripe/webhook` legacy → canonical `/api/webhooks/stripe` 308 redirect | ✅ |
| 5 | `get_user_active_quote_count`이 옛 status `'accepted'` 카운트 → `'draft','sent','approved'`로 갱신하는 migration 추가 | ✅ |

검증 통과: `npx tsc --noEmit`, `npm run lint`, jobs.test.ts, JobDetail.test.tsx, PublicDatePickerStep.test.tsx, stripe/webhook/route.test.ts.

#### Documentation drift (Stage 2)

- D1: `package.json` Next 16 / React 19 ↔ `CLAUDE.md` Next 15 → 갱신
- D2: `ARCHITECTURE.md` migration 범위 `001-015` ↔ 실제 `001-035+` → 갱신
- D3: Quote status 용어 (`accepted/declined` 잔재) → `approved/rejected` 통일
- D4: `docs/PLANS.md` Phase 2 Job costing 미완료 ↔ Phase 3 완료 표시 → "UI 존재"가 아니라 "사용자 workflow 완결 + 테스트 + 빌드 통과"로 정의

#### Stage 3 product value (선반영)

- Job detail에 Google Calendar sync 상태/오류/재시도 UI
- Invoice reminder cron 응답에 error sample
- Dashboard에 quote pipeline analytics
- AI quote drafting UX는 기존 `AIDraftPanel`로 노출

> 완전 해결은 아님. 위 1.1-C / 1.1-D는 이번 작업이 시작점이지만 거버넌스/멱등성/이벤트 테이블은 1.1로 재분류됨.

### 2026-03-30

- **TD-002**: CLAUDE.md 가격($29/$49) ↔ 실제 코드($39/$59) 불일치 → CLAUDE.md에서 가격 테이블 제거, `config/plans.ts` 단일 소스
- **TD-005**: `.agents/skills/`와 `.claude/skills/` 99% 중복 → `.agents/` 디렉토리 전체 삭제, `.claude/skills/` 단일 위치 통합

---

## 3. Tech Debt Tracker

### Active

| ID | 영역 | 설명 | 우선순위 | Phase |
|----|------|------|----------|-------|
| TD-003 | Types | `types/app-database.ts` 확장 타입 — Supabase CLI 자동 생성으로 통합 가능 | 낮음 | 2 |
| TD-004 | Pages | Jobs, Schedule, Materials 워크플로우의 브라우저 QA와 문서화 부족 | 중간 | 2 |

### Resolved

| ID | 영역 | 설명 | 해결 방법 | 해결일 |
|----|------|------|----------|--------|
| TD-001 | API | `/api/webhooks/stripe`와 `/api/stripe/webhook` 중복 라우트 | canonical `/api/webhooks/stripe` 고정, legacy는 308 redirect | 2026-04-25 |
| TD-002 | Pricing | CLAUDE.md 가격 ↔ 실제 코드 불일치 | CLAUDE.md에서 가격 제거, `config/plans.ts` 단일 소스 | 2026-03-30 |
| TD-005 | Harness | `.agents/skills/` ↔ `.claude/skills/` 99% 중복 | `.agents/` 삭제, `.claude/skills/` 단일화 | 2026-03-30 |

### 부채 추가 규칙

1. 발견 즉시 이 파일에 기록
2. 우선순위: 높음(보안/정합성), 중간(UX/DX), 낮음(리팩터링)
3. 해결 시 Resolved 섹션 이동 + 해결일

---

## 4. 운영 검증 체크리스트

수정 후 반드시 실행:

```bash
npm run lint
npx tsc --noEmit
npm run test:run
npm run build
```

브라우저 QA 대상:

- 로그인 / 회원가입 / 온보딩
- Quote 생성 / 수정 / PDF 생성
- Public quote approval / rejection / signature / date booking
- Approved quote → Job 생성 / Invoice 생성
- Jobs list / detail / edit
- Schedule month view
- Google Calendar 연결 / 해제 / 실패 상태
- Invoice reminder cron dry-run 또는 test harness
- Exterior 견적 회귀 (위 1.7 회귀 테스트 7항목)

---

## 5. 권장 운영 지표

### 제품 KPI

- `quote_created_to_sent_rate`
- `quote_sent_to_approved_rate`
- `approved_quote_to_booked_job_rate`
- `invoice_sent_to_paid_rate`
- `median_quote_creation_time`

### 신뢰성 KPI

- `public_booking_google_availability_failure_count`
- `quote_update_partial_failure_count`
- `invoice_reminder_duplicate_prevented_count`
- `invoice_reminder_failed_count`
- `google_calendar_sync_failed_count`
- `ai_usage_per_user_month`
- `ai_error_rate`

### 지원/고객 신뢰 KPI

- `public_quote_event_missing_rate`
- customer-facing action failure rate
- `time_to_diagnose_customer_issue`

---

## 6. 최종 판단 (2026-05-05)

빌드/타입/lint/테스트는 깨지지 않는다. 그러나 **quote/invoice 저장 원자성**, **public booking availability**, **AI data governance**, **invoice reminder idempotency**가 운영 신뢰성 관점에서 취약하다.

Coatly의 10-star 버전은 "더 많은 기능"이 아니라 "페인터가 고객 앞에서 *이 금액과 이 날짜는 앱이 확실히 잡아준다*고 믿을 수 있는 앱"이다. 다음 사이클은 신기능 추가보다 데이터 무결성 / 예약 신뢰성 / AI 개인정보 정책 / 결제 리마인더 신뢰성을 먼저 닫는 것.
