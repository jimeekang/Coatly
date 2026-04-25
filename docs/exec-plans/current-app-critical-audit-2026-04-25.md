# Coatly 현재 앱 결정적 오류 감사 리포트

> 작성일: 2026-04-25  
> 목적: 현재까지 구현된 앱의 출시 차단 오류, 구조적 리스크, 문서 불일치, 기능 개선 과제를 한곳에 정리하고 단계별 수정 방향을 제안한다.

## 1. 요약

현재 앱은 기능 구현량과 테스트 커버리지는 상당히 쌓여 있지만, **프로덕션 빌드가 TypeScript 단계에서 실패**한다. 따라서 지금 상태 그대로는 배포 가능한 앱이 아니다.

검증 결과:

| 항목 | 결과 | 의미 |
| --- | --- | --- |
| `npm run test:run` | ✅ 통과: 37 files / 229 tests | 기존 단위/컴포넌트 테스트는 통과 |
| `npm run lint` | ❌ 실패 | React 19 lint 규칙 위반 1건, unused warning 2건 |
| `npx tsc --noEmit` | ❌ 실패 | `app/actions/jobs.ts` Supabase join 타입 오류 |
| `npm run build` | ❌ 실패 | Next.js 빌드는 TypeScript 단계에서 중단 |

가장 먼저 해결해야 할 순서는 다음과 같다.

1. `app/actions/jobs.ts`의 Supabase relation 타입 오류를 제거해 빌드를 복구한다.
2. `PublicDatePickerStep`의 React 19 lint 위반을 수정한다.
3. 코드/타입에는 존재하지만 로컬 마이그레이션에는 없는 `schedule_events` 스키마를 복구한다.
4. 중복 Stripe webhook route를 정리한다.
5. 실제 스택과 공식 문서의 불일치를 수정한다.

## 2. P0 출시 차단 오류

### P0-1. 프로덕션 빌드 실패: Jobs Supabase join 타입 오류

**심각도:** P0 / 출시 차단  
**영향 영역:** Jobs, Schedule, public quote booking, production build  
**증거:**

- `npx tsc --noEmit` 실패
- `npm run build` 실패
- 오류 위치:
  - `app/actions/jobs.ts:180`
  - `app/actions/jobs.ts:274`
  - `app/actions/jobs.ts:729`

오류 핵심:

```text
SelectQueryError<"could not find the relation between jobs and customers">
```

현재 `jobs` 쿼리는 다음 relation select에 의존한다.

```ts
customer:customers!jobs_customer_user_fk(...)
quote:quotes!jobs_quote_id_fkey(...)
```

DB migration과 generated type에는 `jobs_customer_user_fk`가 존재하지만, Supabase TypeScript inference가 복합 외래키 relation을 정상적으로 해석하지 못해 `SelectQueryError`가 발생한다. 이후 코드는 이를 `JobListRow`로 강제 캐스팅하고 있어 타입 안정성이 깨진다.

**사용자 영향:**

- 앱 전체 production build 불가
- Vercel 배포 실패 가능성이 매우 높음
- Jobs/Schedule 관련 화면이 타입 안정성 없이 동작
- relation 변경 시 런타임 오류가 테스트보다 먼저 배포에 노출될 수 있음

**수정 제안:**

우선순위가 가장 높은 안전한 해결책은 relation select를 제거하고 명시적 쿼리로 분리하는 것이다.

1. `jobs`는 순수 job row만 조회한다.
2. 조회된 `customer_id`, `quote_id` 목록으로 `customers`, `quotes`를 별도 조회한다.
3. `Map<string, Customer>` / `Map<string, Quote>`로 서버에서 join한다.
4. `getJobs`, `getJob`, `getJobDetail`이 같은 mapper를 공유하도록 정리한다.
5. `as JobListRow` 캐스팅을 제거한다.

대안:

- Supabase 원격 schema에서 relation type을 재생성하고 `types/database.ts`를 갱신한다.
- 다만 복합 FK relation inference가 계속 불안정할 수 있으므로, 출시 복구 목적에서는 명시적 쿼리 분리가 더 예측 가능하다.

**필수 테스트:**

- `getJobs`가 customer/quote를 정상 매핑한다.
- customer가 없는 job은 기존 정책대로 제외 또는 명확한 fallback 처리된다.
- quote가 없는 job은 `quote: null`로 유지된다.
- `getJob`, `getJobDetail`도 동일한 mapper를 사용한다.
- `npm run build`가 통과한다.

## 3. P1 정합성 및 유지보수 리스크

### P1-1. React 19 lint 실패: `set-state-in-effect`

**심각도:** P1 / 배포 품질 차단  
**영향 영역:** 공개 견적 날짜 선택, quote approval booking UX  
**증거:** `npm run lint` 실패

위치:

- `components/quotes/public/PublicDatePickerStep.tsx:97`

현재 컴포넌트는 mount effect에서 `loadAvailableDates()`를 호출하고, 그 함수 내부에서 `setIsLoadingDates`, `setLoadError`, `setBlockedDates`, `setResolvedWorkingDays`를 동기적으로 호출한다. React 19 lint 규칙은 이 패턴을 cascading render 위험으로 판단한다.

**사용자 영향:**

- lint 실패로 CI/배포 gate에서 막힐 수 있음
- 공개 견적 링크에서 날짜 선택 UI가 로딩/오류 상태를 클라이언트 mount 이후에만 구성함
- 느린 네트워크에서 빈 상태 또는 layout shift 발생 가능

**수정 제안:**

권장안:

1. `app/q/[token]/page.tsx`에서 `getAvailableDatesForToken(token)`을 서버에서 호출한다.
2. `PublicDatePickerStep`은 `initialBlockedDates`, `initialWorkingDays`, `initialLoadError`를 props로 받는다.
3. 클라이언트 컴포넌트는 사용자 상호작용과 재시도 버튼에만 async loading을 사용한다.
4. mount effect 기반 초기 fetch를 제거한다.

대안:

- `useActionState` 또는 명시적 retry event 기반으로 refactor한다.
- 단순히 lint disable을 추가하는 방식은 권장하지 않는다.

**필수 테스트:**

- 공개 견적 페이지가 서버에서 blocked dates를 전달한다.
- 초기 렌더에서 달력 skeleton이 불필요하게 깜빡이지 않는다.
- 재시도 버튼이 있는 경우 실패 후 다시 조회 가능하다.

### P1-2. `schedule_events` 마이그레이션 누락

**심각도:** P1 / 재현성 및 복구 리스크  
**영향 영역:** Schedule 직접 입력 기능, 신규 환경 세팅, disaster recovery  
**증거:**

- `app/actions/schedule.ts`는 `schedule_events` 테이블을 사용한다.
- `types/database.ts`에는 `schedule_events` 타입이 존재한다.
- 그러나 `supabase/migrations`에서 `create table public.schedule_events`가 검색되지 않는다.

**사용자 영향:**

- 현재 원격 DB에는 테이블이 있을 수 있지만, 로컬 마이그레이션만으로 새 환경을 만들면 Schedule 기능이 깨진다.
- 신규 Supabase 프로젝트, staging, 복구 환경에서 `schedule_events` 관련 server action이 실패한다.
- 문서와 migration history가 실제 DB 상태를 보장하지 못한다.

**수정 제안:**

새 migration을 추가한다.

필요 스키마:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `title text not null`
- `date date not null`
- `start_time time null`
- `end_time time null`
- `is_all_day boolean not null default true`
- `location text null`
- `notes text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

필요 정책:

- RLS enable
- `user_id = auth.uid()` 기준 select/insert/update/delete

필요 인덱스:

- `(user_id, date)`
- 필요 시 `(user_id, created_at)`

후속 작업:

- 원격 DB에 migration 적용
- `types/database.ts` 재생성
- `docs/generated/db-schema.md` 갱신

### P1-3. Stripe webhook route 중복

**심각도:** P1 / 운영 혼동 및 webhook 설정 리스크  
**영향 영역:** Stripe subscription sync, 운영 문서, webhook retry 분석  
**증거:**

동일 handler가 두 route에 존재한다.

- `app/api/webhooks/stripe/route.ts`
- `app/api/stripe/webhook/route.ts`

README와 design doc은 `/api/webhooks/stripe`를 주 경로로 안내한다. 중복 route가 남아 있으면 Stripe Dashboard, 로컬 테스트, 운영 로그에서 어떤 endpoint가 공식인지 혼동된다.

**사용자 영향:**

- Stripe webhook endpoint를 잘못 등록할 가능성 증가
- 같은 이벤트가 두 endpoint로 들어오도록 설정될 경우 중복 처리 위험
- 장애 분석 시 로그 경로가 분산됨

**수정 제안:**

1. 공식 endpoint를 `/api/webhooks/stripe`로 고정한다.
2. `/api/stripe/webhook`는 삭제하거나 `308` redirect로 전환한다.
3. README, `docs/design-docs/subscription-billing.md`, `.env.example` 주변 설명을 공식 경로 하나로 통일한다.
4. route test를 추가해 legacy path 정책을 명확히 한다.

### P1-4. `get_user_active_quote_count` DB 함수가 구 status 값을 사용

**심각도:** P1 / 구독 한도 정합성 리스크  
**영향 영역:** Starter quote limit, subscription gating  
**증거:**

마이그레이션 `003_functions.sql`, `009_harden_security_definer_functions.sql`의 `get_user_active_quote_count`는 다음 상태를 센다.

```sql
status in ('draft', 'sent', 'accepted')
```

하지만 migration `017_rename_status_accepted_to_approved.sql` 이후 앱의 현재 상태값은 다음이다.

```text
draft, sent, approved, rejected, expired
```

현재 앱 코드의 `lib/subscription/access.ts`는 직접 query로 `draft`, `sent`, `approved`를 세고 있어 당장 UI 한도 계산은 맞을 수 있다. 그러나 DB 함수가 남아 있기 때문에 다른 서버 로직이나 RPC 사용처가 생기면 승인된 견적을 active count에서 누락한다.

**수정 제안:**

- 새 migration에서 `get_user_active_quote_count`의 status 목록을 `('draft', 'sent', 'approved')`로 수정한다.
- function comment도 `accepted`에서 `approved`로 변경한다.
- 가능하면 앱 코드와 DB 함수가 같은 의미의 active quote definition을 사용하도록 테스트를 추가한다.

## 4. P2 보안, 안정성, 운영 리스크

### P2-1. Public quote rate limit이 in-memory라 serverless 환경에서 약함

**심각도:** P2 / abuse 방어 약함  
**위치:** `proxy.ts`

`/q/[token]` public quote page에 rate limit이 있지만 `Map` 기반 in-memory store다. Vercel serverless/edge 환경에서는 instance별로 store가 분리되므로 엄격한 rate limit이 아니다. 코드 주석도 Upstash Redis 대체 필요성을 이미 언급한다.

**수정 제안:**

- Upstash Redis 또는 Vercel KV 기반 sliding window rate limit으로 교체한다.
- token별 + IP별 제한을 함께 둔다.
- approval/rejection/book job server action에도 별도 rate limit을 적용한다.

### P2-2. Invoice reminder cron은 idempotency와 observability가 부족함

**심각도:** P2 / 운영 추적성 리스크  
**위치:** `app/api/cron/invoice-reminders/route.ts`

현재 reminder 발송 후 `due_reminder_sent_at`, `overdue_reminder_sent_at`을 업데이트한다. 기본적인 중복 방지는 있지만, 발송 요청과 DB 업데이트 사이에서 실패하면 재시도 시 중복 메일이 갈 수 있다. 또한 어떤 invoice가 왜 실패했는지 장기 추적할 별도 로그 테이블이 없다.

**수정 제안:**

- `invoice_reminder_events` 로그 테이블을 추가한다.
- invoice id + reminder type 기준 unique key를 둔다.
- 발송 전 pending event 생성, 성공/실패 상태 업데이트 방식으로 전환한다.
- cron response에는 aggregate뿐 아니라 error sample id를 포함한다.

### P2-3. Google Calendar sync 실패 UX와 복구 플로우가 더 필요함

**심각도:** P2 / 사용자 신뢰도 리스크  
**영향 영역:** Schedule, public booking, Google Calendar integration

현재 Google Calendar 연결과 busy date merge는 구현되어 있지만, 사용자가 sync 실패를 복구하는 흐름은 더 선명해야 한다.

**수정 제안:**

- Settings에 마지막 sync 성공/실패 시각과 실패 메시지를 표시한다.
- Job detail에 Google event sync status를 표시한다.
- 실패한 job event를 다시 sync하는 action을 추가한다.
- refresh token 만료 또는 권한 철회 시 재연결 CTA를 명확히 보여준다.

## 5. 문서 및 소스 오브 트루스 불일치

### D1. Next.js 버전 문서 불일치

**증거:**

- `package.json`: Next.js `16.2.0`, React `19.2.4`
- `CLAUDE.md`: Next.js 15
- `README.md`: Next.js 15

**수정 제안:**

- 공식 스택 표기를 Next.js 16 / React 19로 갱신한다.
- React 19 lint rule로 인해 생긴 신규 제약을 `docs/FRONTEND.md`에 추가한다.

### D2. Architecture migration 범위가 오래됨

**증거:**

- `ARCHITECTURE.md`: migrations `001-015`
- 실제 repo: `001_initial_schema.sql`부터 `035_google_calendar_integration.sql`까지 존재

**수정 제안:**

- architecture folder tree의 migration 범위를 `001-035+` 또는 “versioned SQL migrations”로 바꾼다.
- Jobs, Schedule, Materials, Quote public approval, Google Calendar 관련 schema 설명을 추가한다.

### D3. Quote status 용어가 문서마다 다름

**증거:**

- 현재 앱 타입: `draft | sent | approved | rejected | expired`
- 일부 문서: `accepted | declined`
- 일부 DB 함수 comment: `draft/sent/accepted`

**수정 제안:**

- 사용자-facing 용어는 `approved/rejected`로 통일한다.
- legacy status compatibility는 `lib/quotes.ts`의 normalization만 담당하게 한다.
- product specs와 design docs의 workflow 문구를 갱신한다.

### D4. Roadmap 상태가 실제 구현과 충돌

**증거:**

- `docs/PLANS.md`에서 Phase 2에 `Job costing`이 미완료로 남아 있다.
- Phase 3 영역에는 `Job costing`이 완료로 표시되어 있다.
- `docs/exec-plans/tech-debt-tracker.md`에는 Jobs/Schedule/Materials page placeholder debt가 남아 있지만 실제 파일과 기능은 상당 부분 구현되어 있다.

**수정 제안:**

- 현재 구현 상태를 기준으로 `docs/PLANS.md`를 재정렬한다.
- 완료/미완료 기준을 “UI 존재”가 아니라 “사용자 workflow 완결 + 테스트 + 빌드 통과”로 정의한다.
- `tech-debt-tracker.md`의 TD-004를 재검토해 resolved 또는 더 구체적인 debt로 쪼갠다.

## 6. 기능 개선 및 추가 제안

아래 제안은 `CLAUDE.md`의 out-of-scope 항목을 제외한다. 제외 대상: GPS, team scheduling, supplier integrations, native app, multi-language.

### Stage 1. 앱을 다시 출시 가능한 상태로 만들기

목표: “배포 가능한 main branch” 회복.

작업:

1. Jobs query type 오류 제거
2. React 19 lint 실패 제거
3. `schedule_events` migration 추가
4. Stripe webhook route 정리
5. `npm run lint`, `npx tsc --noEmit`, `npm run test:run`, `npm run build` 전부 통과

완료 기준:

- Vercel production build와 동일한 local build가 통과한다.
- 새 Supabase 환경도 migration만으로 필요한 테이블을 만들 수 있다.
- 공식 webhook endpoint가 하나로 정리된다.

### Stage 2. 핵심 업무 흐름 안정화

목표: quote → approval → job booking → schedule → invoice 흐름을 현장 업무에 맞게 안정화.

작업:

1. Public quote date booking UX 개선
2. Schedule에서 native event, jobs, Google events의 충돌 표시 강화
3. Job detail에 quote/invoice 연결 상태와 Google sync 상태 표시
4. Invoice reminder cron 로그와 재시도 안정성 추가
5. 승인된 quote에서 job 생성, invoice 생성으로 이어지는 happy path 브라우저 QA 작성

완료 기준:

- 고객이 공개 견적 링크에서 승인하고 날짜를 선택하는 흐름이 모바일에서 자연스럽다.
- 사업자는 Schedule에서 booked job과 외부 calendar busy date를 명확히 구분한다.
- reminder와 Google sync 실패가 조용히 묻히지 않는다.

### Stage 3. 제품 가치 향상

목표: 페인터가 “관리 앱”이 아니라 “견적과 현금흐름을 도와주는 도구”로 느끼게 한다.

추천 기능:

1. **Dashboard analytics**
   - 월별 매출 추이
   - quote pipeline
   - overdue invoice 금액
   - approved quote conversion rate

2. **AI Quote Drafting UX**
   - 이미 있는 `lib/ai/drafts.ts`와 Workspace Assistant 인프라를 Quote 생성 화면에 노출
   - 사용자가 “3 bedroom repaint, walls only” 같은 자연어로 draft 생성
   - 생성 결과는 바로 저장하지 않고 review form에 채우는 방식 권장

3. **Job costing**
   - Job 완료 후 실제 자재비/시간 입력
   - quote estimate 대비 profit variance 표시
   - 다음 견적의 pricing suggestion에 반영

4. **Smart pricing suggestions**
   - 기존 quote/job costing history 기반으로 suggested rate 제공
   - 단, 처음부터 자동 가격 결정은 피하고 “추천 + 사용자가 확인” 흐름으로 시작

완료 기준:

- Dashboard에서 사업 상태를 30초 안에 파악할 수 있다.
- AI 기능은 저장 전 검토 단계를 거쳐 신뢰성을 유지한다.
- job costing은 future pricing improvement의 데이터 기반이 된다.

### Stage 4. 통합 기능 확장

목표: core workflow가 안정된 뒤 회계/운영 통합으로 확장.

추천 순서:

1. Xero/MYOB export 또는 sync 설계
2. CSV export를 먼저 제공해 integration 전 사용자 니즈 검증
3. 회계 sync는 invoice/payment data model이 안정된 뒤 진행

완료 기준:

- invoice/payment 상태가 앱 내부에서 먼저 정확하다.
- export로 실제 사용자 업무 효용을 검증한 뒤 API sync로 확장한다.

## 7. 권장 수정 순서

| 순서 | 작업 | 우선순위 | 예상 효과 |
| --- | --- | --- | --- |
| 1 | `app/actions/jobs.ts` relation select 제거 또는 타입 재생성 | P0 | build 복구 |
| 2 | `PublicDatePickerStep` 초기 데이터 서버 로딩 전환 | P1 | lint 복구, public booking UX 개선 |
| 3 | `schedule_events` migration 추가 | P1 | DB 재현성 복구 |
| 4 | Stripe webhook duplicate route 정리 | P1 | 운영 혼동 제거 |
| 5 | `get_user_active_quote_count` status 갱신 | P1 | 구독 한도 정합성 강화 |
| 6 | docs stack/status/migration 문구 갱신 | P2 | 팀과 에이전트의 작업 기준 통일 |
| 7 | cron/logging/Google sync observability 추가 | P2 | 운영 안정성 향상 |
| 8 | Dashboard analytics + AI quote drafting UX | P3 | 제품 가치 향상 |

## 8. 검증 체크리스트

수정 후 반드시 실행:

```bash
npm run lint
npx tsc --noEmit
npm run test:run
npm run build
```

브라우저 QA 대상:

- 로그인/회원가입/온보딩
- Quote 생성, 수정, PDF 생성
- Public quote approval, rejection, signature, date booking
- Approved quote → Job 생성
- Approved quote → Invoice 생성
- Jobs list/detail/edit
- Schedule month view
- Google Calendar 연결/해제/실패 상태
- Invoice reminder cron dry-run 또는 test harness

## 9. 결론

현재 Coatly는 core feature가 많이 구현되어 있고 테스트도 229개가 통과하지만, **빌드 실패 하나만으로도 출시 가능한 상태는 아니다.** 특히 Jobs/Schedule/Public booking 계층은 최근 기능이 빠르게 추가되면서 DB schema, generated types, 문서, route 정책이 서로 어긋난 흔적이 있다.

가장 좋은 다음 행동은 기능 추가가 아니라 **Stage 1 안정화**다. 빌드와 schema 재현성을 먼저 회복한 뒤, quote approval → booking → job → invoice 흐름을 브라우저에서 끝까지 검증해야 한다. 그 다음 Dashboard analytics, AI quote drafting, job costing을 붙이면 제품 가치가 훨씬 선명해진다.

## 10. 2026-04-25 수정 진행 상태

이 문서의 7번 “권장 수정 순서” 기준으로 다음 항목을 코드와 문서에 반영했다.

| 순서 | 결과 |
| --- | --- |
| 1 | `app/actions/jobs.ts`의 Supabase relation select를 제거하고 jobs/customers/quotes 명시 조회 후 서버 매핑으로 전환 |
| 2 | `PublicDatePickerStep` 초기 availability를 `app/q/[token]/page.tsx`에서 서버 로딩해 props로 전달하도록 전환 |
| 3 | `036_schedule_events_and_active_quote_count.sql` 추가: `schedule_events` table/RLS/index/trigger 및 active quote count status 수정 |
| 4 | `/api/stripe/webhook` legacy route를 canonical `/api/webhooks/stripe` 308 redirect로 전환 |
| 5 | `get_user_active_quote_count`가 `draft/sent/approved`를 세도록 migration 추가 |
| 6 | README, CLAUDE, ARCHITECTURE, FRONTEND, product/design docs, generated DB schema, tech debt tracker 갱신 |
| 7 | Job detail에 Google Calendar sync 상태/오류/재시도 UI 추가, invoice reminder cron 응답에 query/send/update 오류 샘플 추가 |
| 8 | Dashboard에 quote pipeline analytics 추가. AI quote drafting UX는 기존 Quote 생성 화면의 `AIDraftPanel`로 노출됨 |

수정 직후 중간 검증:

- `npx tsc --noEmit` 통과
- `npm run lint` 통과
- 관련 테스트 통과:
  - `app/actions/jobs.test.ts`
  - `components/jobs/JobDetail.test.tsx`
  - `components/quotes/public/PublicDatePickerStep.test.tsx`
  - `app/api/stripe/webhook/route.test.ts`
