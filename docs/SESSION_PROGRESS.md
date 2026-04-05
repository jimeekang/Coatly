# Coatly — Phase 2 세션 진행 현황
> 작성: 2026-04-04

---

## 세션 개요

이번 세션에서는 /plan-ceo-review → /plan → /build 순서로 Phase 2 기능 6개를 계획하고 구현했습니다.

---

## CEO 리뷰 결론 (SCOPE EXPANSION)

- **핵심 승전 요인:** 견적 속도 + 정확도
- **12개월 비전:** 현장 도착 60초 만에 견적 완성 → 자동 발송 → Job 스케줄 → 완료 → 인보이스 → 리마인더까지 Coatly 하나로 완결
- **CEO 플랜 저장 위치:** `~/.gstack/projects/coatly/ceo-plans/2026-04-04-phase2-strategy.md`

### 승인된 확장 6개

| # | 기능 | 우선순위 | 구현 상태 |
|---|------|----------|-----------|
| 1 | Dashboard Analytics KPI 카드 | Quick Win | ✅ 완료 |
| 2 | 견적 템플릿 저장/불러오기 | Quick Win | ✅ 완료 |
| 3 | 인보이스 자동 리마인더 (Resend) | Quick Win | ✅ 완료 |
| 4 | Jobs 페이지 구현 | 핵심 플로우 | ⏳ 미구현 |
| 5 | Schedule 페이지 구현 | 핵심 플로우 | ⏳ 미구현 |
| 6 | AI Smart Pricing | 차별화 | ⏳ 미구현 |
| 7 | Quote Follow-up 자동화 | 자동화 | ⏳ 미구현 |

---

## 완료된 구현

### 1. Dashboard Analytics KPI 카드
**커밋:** `0192889` + 디자인 수정 `b3f560c`, `739faaf`

**추가된 것:**
- `app/(dashboard)/dashboard/page.tsx` — "This Month" KPI 섹션 (3열 그리드)
  - 이번달 매출 (paid_at 기준)
  - 견적 승인율 (이번달 생성 견적 중 approved %)
  - Outstanding 금액 (sent + overdue 인보이스 미수금 합계)
- 승인율 50% 이상, 매출 0 이상이면 primary 색상 하이라이트
- Outstanding 금액 > 0이면 warning 색상 (디자인 리뷰 반영)

---

### 2. 견적 템플릿 저장/불러오기
**커밋:** `0192889` + 디자인 수정 `bfa0c32`, `90b9e67`, `4ea27d8`

**추가된 파일:**
- `supabase/migrations/020_quote_templates.sql` — `quote_templates` 테이블 + RLS
- `types/database.ts` — `quote_templates` Row/Insert/Update 타입
- `app/actions/quote-templates.ts` — `listQuoteTemplates`, `saveQuoteTemplate`, `deleteQuoteTemplate`
- `components/quotes/TemplatePicker.tsx` — 드롭다운 선택/삭제 UI (2단계 삭제 확인 포함)
- `components/quotes/QuoteCreateScreen.tsx` — TemplatePicker 통합 + 견적 저장 후 "Save as Template?" 프롬프트
- `app/(dashboard)/quotes/new/page.tsx` — 서버에서 templates 데이터 주입

**플로우:**
1. 새 견적 페이지 → 저장된 템플릿 드롭다운 → 선택 시 margins/title/notes 자동 채움
2. 견적 저장 성공 후 → "Save as template?" 인라인 프롬프트 → 이름 입력 후 저장
3. 삭제 시 2단계 확인 (Delete / Cancel)

**주의:** linter/포맷터가 이 세션 중 `QuoteCreateScreen.tsx`와 `quotes/new/page.tsx`를 이전 버전으로 되돌리는 현상 발생.
→ 다음 세션에서 해당 파일들이 템플릿 기능을 포함하고 있는지 확인 필요.

---

### 3. 인보이스 자동 리마인더
**커밋:** 아직 커밋 안 됨 (작업 중 세션 저장 요청)

**추가된 파일:**
- `supabase/migrations/021_invoice_reminder_sent_at.sql` — `due_reminder_sent_at`, `overdue_reminder_sent_at` 컬럼 추가
- `types/database.ts` — invoices Row/Insert/Update에 두 컬럼 추가
- `lib/email/resend.ts` — Resend 클라이언트 + HTML 이메일 템플릿 (due_soon / overdue)
- `app/api/cron/invoice-reminders/route.ts` — 매일 실행 cron GET 엔드포인트
- `vercel.json` — `"0 22 * * *"` (Sydney 08:00) cron 스케줄 추가
- `package.json` — `resend` 패키지 추가 (`npm install resend`)

**동작:**
- D-3: due_date 2~3일 후, status=sent, due_reminder_sent_at=null → 발송
- D+7: due_date 7~8일 전, status=sent|overdue, overdue_reminder_sent_at=null → 발송
- 중복 방지: 발송 후 타임스탬프 기록

**배포 전 필요한 환경 변수 (아직 미설정):**
```
RESEND_API_KEY=re_xxxx
RESEND_FROM_ADDRESS=Coatly <noreply@coatly.com.au>
CRON_SECRET=강력한_랜덤_시크릿
```

**tsc: PASS · lint: PASS** (확인 완료)

---

## 미구현 — 남은 Task 목록

### Task 4: Jobs 페이지 구현
```
/build Jobs 페이지 구현 —
  - jobs 테이블 신규 추가 (id, user_id, customer_id, quote_id, title, status, scheduled_date, notes)
  - status: scheduled | in_progress | completed | cancelled
  - Jobs CRUD (생성/조회/수정/삭제)
  - Quote 상세 페이지에서 "Create Job" 버튼 → Job 생성 플로우
  - Jobs 목록 페이지 (app/(dashboard)/jobs/page.tsx) — 상태별 필터
```

### Task 5: Schedule 페이지 구현
```
/build Schedule 페이지 구현 —
  - Jobs 데이터 기반 주간 캘린더 뷰 (Task 4 완료 후 진행)
  - scheduled_date 기준 날짜별 Job 목록
  - 오늘/이번주 필터
  - app/(dashboard)/schedule/page.tsx
```

### Task 6: AI Smart Pricing
```
/build AI Smart Pricing —
  - 새 견적 생성 시 유사 과거 견적 데이터 기반 가격 제안 카드
  - 초기: 같은 complexity + 방 수 기준 평균 가격 rule-based 제안
  - 이후: Gemini 연동 (기반 코드 app/actions/ai-drafts.ts 존재)
  - QuoteCreateScreen에 PricingSuggestionCard 컴포넌트 추가
```

### Task 7: Quote Follow-up 자동화
```
/build Quote Follow-up 자동화 —
  - 견적 발송(status=sent) 3일 후 미응답(status 여전히 sent) 시 Resend 이메일 자동 발송
  - quotes 테이블에 follow_up_sent_at 컬럼 추가
  - cron 엔드포인트: app/api/cron/quote-followups/route.ts
  - vercel.json cron 추가
  - Resend 이미 설치됨, lib/email/resend.ts 패턴 재사용 가능
```

---

## 알려진 이슈

### linter/포맷터 파일 되돌림 현상
- 이번 세션 중 linter가 `QuoteCreateScreen.tsx`, `quotes/new/page.tsx`를 이전 버전으로 자동 수정하는 현상 발생
- 결과적으로 TemplatePicker 통합 코드가 제거됨
- **다음 세션 시작 전 확인 필요:**
  - `components/quotes/QuoteCreateScreen.tsx` — TemplatePicker import 및 handleApplyTemplate 포함 여부
  - `app/(dashboard)/quotes/new/page.tsx` — listQuoteTemplates import 및 templates prop 전달 여부

### quote_templates Supabase 타입 추론 오류
- `quote_templates` 테이블이 로컬 Supabase DB에 아직 migrate되지 않아 타입 추론 불가
- `app/actions/quote-templates.ts`에서 `as unknown as` 캐스팅으로 우회 처리
- **마이그레이션 실행 후 `supabase gen types typescript --local`로 재생성 필요**

---

## 실행 시작 순서 (다음 세션)

```bash
# 1. 파일 상태 확인
grep -n "TemplatePicker" components/quotes/QuoteCreateScreen.tsx
grep -n "listQuoteTemplates" app/(dashboard)/quotes/new/page.tsx

# 2. 미커밋 파일 커밋
git add -A && git commit -m "feat: add invoice auto-reminders (Resend + cron)"

# 3. 다음 빌드
/build Jobs 페이지 구현
```

---

## 기술 스택 현황

| 항목 | 상태 |
|------|------|
| Next.js 15 App Router | ✅ |
| Supabase (Postgres + Auth + RLS) | ✅ |
| Stripe 구독 | ✅ |
| React-PDF | ✅ |
| Resend | ✅ 이번 세션 추가 |
| Vercel Cron | ✅ 이번 세션 추가 |
| Gemini (AI draft) | ✅ 기반 코드 존재, Phase 2 후반 활성화 예정 |
