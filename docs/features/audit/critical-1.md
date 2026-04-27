# 앱 결정적 오류 감사 (Part 1) — Summary & P0 & P1-1/2

*작성일: 2026-04-25 | → 이어지는 내용: [critical-2.md](./critical-2.md)*

## 1. 요약

현재 앱은 기능 구현량과 테스트 커버리지는 상당히 쌓여 있지만, **프로덕션 빌드가 TypeScript 단계에서 실패**한다.

| 항목 | 결과 | 의미 |
| --- | --- | --- |
| `npm run test:run` | ✅ 통과: 37 files / 229 tests | 기존 단위/컴포넌트 테스트는 통과 |
| `npm run lint` | ❌ 실패 | React 19 lint 규칙 위반 1건, unused warning 2건 |
| `npx tsc --noEmit` | ❌ 실패 | `app/actions/jobs.ts` Supabase join 타입 오류 |
| `npm run build` | ❌ 실패 | Next.js 빌드는 TypeScript 단계에서 중단 |

가장 먼저 해결해야 할 순서:
1. `app/actions/jobs.ts`의 Supabase relation 타입 오류 제거
2. `PublicDatePickerStep`의 React 19 lint 위반 수정
3. `schedule_events` 스키마 복구
4. 중복 Stripe webhook route 정리

## 2. P0 출시 차단 오류

### P0-1. 프로덕션 빌드 실패: Jobs Supabase join 타입 오류

**심각도:** P0 / 출시 차단  
**영향 영역:** Jobs, Schedule, public quote booking, production build

오류 위치: `app/actions/jobs.ts:180`, `:274`, `:729`

```text
SelectQueryError<"could not find the relation between jobs and customers">
```

현재 `jobs` 쿼리는 다음 relation select에 의존한다.
```ts
customer:customers!jobs_customer_user_fk(...)
quote:quotes!jobs_quote_id_fkey(...)
```

Supabase TypeScript inference가 복합 외래키 relation을 정상적으로 해석하지 못해 `SelectQueryError`가 발생한다.

**수정 제안:**
1. `jobs`는 순수 job row만 조회한다.
2. 조회된 `customer_id`, `quote_id` 목록으로 `customers`, `quotes`를 별도 조회한다.
3. `Map<string, Customer>` / `Map<string, Quote>`로 서버에서 join한다.
4. `getJobs`, `getJob`, `getJobDetail`이 같은 mapper를 공유하도록 정리한다.
5. `as JobListRow` 캐스팅을 제거한다.

**필수 테스트:**
- `getJobs`가 customer/quote를 정상 매핑한다.
- customer가 없는 job은 기존 정책대로 제외 또는 fallback 처리된다.
- `npm run build`가 통과한다.

## 3. P1 정합성 및 유지보수 리스크

### P1-1. React 19 lint 실패: `set-state-in-effect`

**심각도:** P1 / 배포 품질 차단  
**위치:** `components/quotes/public/PublicDatePickerStep.tsx:97`

현재 컴포넌트는 mount effect에서 `loadAvailableDates()`를 호출하고, 그 함수 내부에서 여러 setState를 동기적으로 호출한다. React 19 lint 규칙은 이 패턴을 cascading render 위험으로 판단한다.

**수정 제안:**
1. `app/q/[token]/page.tsx`에서 `getAvailableDatesForToken(token)`을 서버에서 호출한다.
2. `PublicDatePickerStep`은 `initialBlockedDates`, `initialWorkingDays`, `initialLoadError`를 props로 받는다.
3. 클라이언트 컴포넌트는 사용자 상호작용과 재시도 버튼에만 async loading을 사용한다.
4. mount effect 기반 초기 fetch를 제거한다.

**필수 테스트:**
- 공개 견적 페이지가 서버에서 blocked dates를 전달한다.
- 초기 렌더에서 달력 skeleton이 불필요하게 깜빡이지 않는다.

### P1-2. `schedule_events` 마이그레이션 누락

**심각도:** P1 / 재현성 및 복구 리스크  
**영향 영역:** Schedule 직접 입력 기능, 신규 환경 세팅, disaster recovery

`app/actions/schedule.ts`는 `schedule_events` 테이블을 사용하고 `types/database.ts`에는 타입이 존재하지만, `supabase/migrations`에서 `create table public.schedule_events`가 검색되지 않는다.

**수정 제안:** 새 migration을 추가한다.

필요 스키마:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `title text not null`
- `date date not null`
- `start_time time null`, `end_time time null`
- `is_all_day boolean not null default true`
- `location text null`, `notes text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

RLS enable + `user_id = auth.uid()` 기준 select/insert/update/delete  
인덱스: `(user_id, date)`
