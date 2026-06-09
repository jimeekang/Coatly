# Coatly DDD-lite 모듈 설계 가이드

이 문서는 Coatly의 기능 모듈을 유지보수하기 위한 기준 문서입니다. 목표는 완전한 DDD를 도입하는 것이 아니라, 작은 SaaS 코드베이스에서 업무 규칙, 데이터 접근, 화면, 외부 연동이 다시 섞이지 않도록 하는 것입니다.

## 핵심 원칙

1. 기능은 기본적으로 `modules/<feature>/`가 소유합니다.
2. `domain`은 순수해야 합니다. 계산, 상태 판정, 입력 정규화, 타입, mapper만 둡니다.
3. `application`은 사용자 행동 단위의 workflow를 조립합니다.
4. `infrastructure`는 DB query, repository, API adapter, 외부 시스템 adapter를 둡니다.
5. `ui`는 해당 feature 전용 화면 컴포넌트를 둡니다.
6. `app/` route와 page는 인증 확인, data loading 호출, 화면 조립만 담당합니다.
7. 여러 feature가 얽히는 workflow는 한 feature UI 안에서 직접 연결하지 않고, page나 application service에서 조립합니다.

## 현재 모듈 구조

```text
modules/
  customers/
    application/
    infrastructure/
    ui/
    index.ts
  invoices/
    application/
    domain/
    infrastructure/
    ui/
    index.ts
  jobs/
    application/
    domain/
    ui/
    index.ts
  materials/
    application/
    domain/
    ui/
    index.ts
  price-rates/
    domain/
    ui/
    index.ts
  quotes/
    application/
    domain/
    infrastructure/
    ui/
    index.ts
  settings/
    application/
    domain/
    infrastructure/
    ui/
    index.ts
```

권장 최종 형태는 아래와 같습니다. 모든 feature가 반드시 모든 폴더를 가질 필요는 없습니다.

```text
modules/<feature>/
  domain/
    *.ts              # 순수 업무 규칙, 계산, 상태 판정, mapper
    *.test.ts         # domain 단위 테스트
  application/
    actions.ts        # server action entrypoint
    services.ts       # workflow service, 필요할 때만 분리
  infrastructure/
    repository.ts     # Supabase query, persistence
    api.ts            # route handler가 공유하는 API adapter
    external.ts       # 외부 시스템 adapter, 필요할 때만
  ui/
    *.tsx             # feature-owned client/server component
    *.test.tsx        # UI regression/component test
  index.ts            # feature manifest와 public type export
```

## 의존 방향

허용되는 기본 방향은 아래와 같습니다.

```text
app/
  -> modules/<feature>/ui
  -> modules/<feature>/application

modules/<feature>/ui
  -> modules/<same-feature>/domain
  -> modules/<same-feature>/application
  -> shared components/utils/types

modules/<feature>/application
  -> modules/<same-feature>/domain
  -> modules/<same-feature>/infrastructure
  -> shared lib integrations
  -> other feature domain types when needed

modules/<feature>/infrastructure
  -> modules/<same-feature>/domain
  -> lib/supabase or external SDK

modules/<feature>/domain
  -> config, types, utils
```

금지하거나 피해야 하는 방향입니다.

```text
domain -> Next.js, Supabase client, email, PDF, Stripe, server action
domain -> ui/application/infrastructure
lib -> modules/<feature>/application
lib -> modules/<feature>/ui
feature ui -> other feature application
app route/page -> long DB query + business rule
```

예외가 필요하면 해당 코드 근처에 짧은 이유를 남기고, 가능한 빨리 application 또는 infrastructure로 되돌립니다.

## 각 레이어의 책임

### domain

넣어도 되는 것:

- 금액 계산, GST 계산, 견적 합계 계산
- 상태 전이 판정
- 입력 정규화
- DB row를 화면 model로 바꾸는 순수 mapper
- domain type, label map, enum-like constant

넣으면 안 되는 것:

- `createServerClient()`
- `supabase.from(...)`
- `redirect()`, `revalidatePath()`
- email/PDF/Stripe/Google Calendar 호출
- signed URL 생성

### application

넣어도 되는 것:

- server action
- 인증된 사용자 기준 workflow
- subscription gate
- repository 호출 순서 조립
- revalidate/redirect
- email/PDF 발송 요청

주의할 점:

- 파일이 700줄을 넘으면 workflow별로 나눌 후보입니다.
- DB query string과 mapper가 많아지면 `infrastructure/repository.ts`로 옮깁니다.
- 저장과 외부 side effect를 한 함수에서 처리할 때는 실패 시 사용자 경험과 중복 생성 가능성을 먼저 확인합니다.

### infrastructure

넣어도 되는 것:

- Supabase select/insert/update/delete
- RPC 호출
- 외부 API adapter
- DB row type
- legacy DB fallback이 필요한 경우의 compatibility query

주의할 점:

- repository는 domain 규칙을 새로 만들지 않습니다.
- repository는 가능한 한 row를 가져오거나 저장하고, 의미 있는 판단은 domain/application에 맡깁니다.

### ui

넣어도 되는 것:

- feature 전용 form/table/detail component
- client interaction state
- UI label, local display formatting

주의할 점:

- 같은 feature의 action은 직접 사용할 수 있습니다.
- 다른 feature action은 직접 import하지 않습니다. page나 application service에서 handler를 내려보냅니다.
- 여러 feature를 동시에 조립하는 화면은 `components/dashboard` 또는 route-level container에서 조립합니다.

## app, components, lib의 역할

### app

`app/`은 route boundary입니다. 가능한 한 얇게 유지합니다.

좋은 page 예시:

```text
1. current user 확인
2. feature application의 data loader 호출
3. page header와 feature UI 조립
```

피해야 할 page:

```text
1. Supabase query 여러 개 작성
2. KPI 계산과 상태 판정 직접 수행
3. 외부 SDK 호출
4. 긴 fallback 처리
```

### components

`components/`는 앱 전체 공유 UI만 둡니다.

- `components/ui`: primitive UI
- `components/forms`: 공통 form shell
- `components/layout`: page header, back link
- `components/shared`: 여러 feature에서 쓰는 작은 component
- `components/dashboard`: dashboard shell 또는 cross-feature dashboard component

feature 전용 컴포넌트는 `modules/<feature>/ui`에 둡니다.

### lib

`lib/`는 integration과 platform helper를 둡니다.

- `lib/supabase`
- `lib/stripe`
- `lib/email`
- `lib/pdf`
- `lib/google-calendar`
- `lib/ai`
- `lib/subscription`

`lib`는 feature `application`과 `ui`를 import하지 않습니다. feature domain의 작은 pure helper가 필요해지는 경우, 그 helper를 shared 위치로 빼는 것을 먼저 검토합니다.

## 새 기능 추가 기준

새 dashboard 기능을 만들 때는 아래 순서로 추가합니다.

1. `modules/<feature>/domain`에 타입, 상태, 계산, mapper를 둡니다.
2. DB query가 있으면 `infrastructure/repository.ts`를 만듭니다.
3. 사용자 행동 단위는 `application/actions.ts`에 둡니다.
4. 화면은 `ui/`에 둡니다.
5. route file은 feature UI와 application loader만 조립합니다.
6. domain test를 먼저 추가하고, 위험도가 높으면 application/UI test를 추가합니다.
7. `modules/<feature>/index.ts`와 `modules/index.ts`에 manifest를 등록합니다.

## 리팩토링 순서

현재 코드베이스는 DDD-lite 전환 중입니다. 큰 폭으로 한 번에 옮기기보다 아래 순서로 진행합니다.

1. boundary lint rule을 `warn`으로 추가합니다.
2. 새 코드에서는 boundary warning을 만들지 않습니다.
3. `domain` 안의 Supabase/Next 의존을 `application` 또는 `infrastructure`로 옮깁니다.
4. 거대한 `application/actions.ts`는 repository, service, public action 단위로 나눕니다.
5. feature UI가 다른 feature action을 직접 호출하는 부분을 page/application 조립으로 올립니다.
6. DB baseline이 확정된 뒤 `*_LEGACY`, missing-column fallback을 제거합니다.
7. 정리된 영역부터 boundary rule을 `error`로 올립니다.

## 유지보수 체크리스트

PR 또는 큰 변경 전에 아래를 확인합니다.

- `domain` 파일이 Next/Supabase/email/PDF/Stripe를 import하지 않는가?
- route/page가 긴 DB query나 업무 규칙을 직접 갖고 있지 않은가?
- feature UI가 다른 feature application action을 직접 import하지 않는가?
- cross-feature workflow가 page 또는 application service에서 조립되는가?
- 새 repository 함수는 row 접근만 하고 domain 판단을 만들지 않는가?
- 금액은 cents 정수로 유지되는가?
- public token route는 인증/권한/만료/소유권 검사를 유지하는가?
- 변경한 feature의 domain test 또는 regression test가 있는가?

## Boundary rule 운영

초기에는 lint rule을 `warn`으로 둡니다. 기존 위반이 남아 있기 때문입니다.

운영 기준:

```text
warn: 기존 코드 정리 중인 영역
error: 정리 완료되어 새 위반을 허용하지 않는 영역
```

규칙을 추가한 뒤 `npm run lint`에서 warning이 보이면 새 코드인지 기존 코드인지 분리합니다. 새 코드는 바로 고치고, 기존 코드는 리팩토링 계획에 넣습니다.

## 현재 정리 상태와 다음 후보

진행 중: 없음

정리 완료:

1. `modules/settings/domain/onboarding.ts`
   - profile query fallback을 `lib/supabase/request-context.ts`로 이동
2. `modules/settings/domain/businesses.ts`
   - DB query, signed URL, upsert 로직을 `modules/settings/infrastructure/businesses.ts`로 이동
3. `modules/invoices/domain/invoices.ts`
   - invoice 생성 schema를 `modules/invoices/domain/invoice-schema.ts`로 분리
   - invoice/customer/quote option query를 `modules/invoices/infrastructure/invoice-options.ts`로 이동
4. `modules/materials/domain/types.ts`
   - material 타입과 schema 소유권을 domain으로 이동하고 `lib/supabase/validators.ts`는 호환 re-export만 유지
5. `modules/quotes/domain/quote-schema.ts`
   - quote 생성 입력 schema와 quote form line item schema의 소유권을 quote domain으로 이동
   - `modules/quotes/domain/quotes.ts`가 `lib/supabase/validators.ts`에 의존하지 않도록 정리
   - quote application/ui import도 feature-owned schema와 materials domain 타입을 직접 사용하도록 정리
   - `npm run lint`, quote 관련 테스트, 전체 테스트, production build 통과
6. `lib/supabase/validators.ts`
   - quote schema 사본을 제거하고 `modules/quotes/domain/quote-schema.ts`의 호환 re-export로 전환
   - quote schema의 단일 소유권을 유지해 validator drift를 방지
   - 기존 `@/lib/supabase/validators` import 경로의 테스트 호환성 유지
7. `modules/quotes/infrastructure/quote-repository.ts`
   - quote 조회 select string, row type, 관계 로딩, hydrated mapper, linked invoice count를 infrastructure repository로 이동
   - `getQuotes`, `getQuotesByCustomer`, `getQuote`, `getPublicQuoteByToken`은 인증/토큰 검증 후 repository를 호출하도록 축소
   - quote application action 파일의 DB 조회 책임을 줄이고 다음 service 분리의 기준점을 마련
8. `modules/quotes/application/document-email-service.ts`
   - quote PDF 생성, business branding 조회, public approval link 조립, Resend 이메일 발송을 별도 application service로 이동
   - `createQuote`, `updateQuote`는 이메일 발송 의도와 상태 변경만 조립하도록 축소
   - `npm run lint`, quote 관련 테스트, 전체 테스트, production build 통과
9. `modules/quotes/application/quote-pricing-save-service.ts`
   - quote 생성/수정 시 반복되는 가격 preview 계산, estimate item/room/line item/form structure 저장 절차를 application service로 분리
   - `createQuote`, `updateQuote`는 검증, quote 본문 저장, 이메일/redirect 조립에 집중하도록 축소
   - `actions.ts`는 약 2,351줄에서 약 1,522줄로 축소되고, 상세 가격 저장 실패 시 기존 정리 동작을 유지
   - `npm run lint`, quote 관련 테스트, 전체 테스트, production build 통과
10. `modules/quotes/application/quote-duplicate-service.ts`
    - `duplicateQuote`의 source quote 조회, relation 로딩, quote number 생성, 신규 quote/관계 데이터 복제, 실패 시 정리 절차를 application service로 분리
    - `actions.ts`는 사용자 확인, service 호출, list revalidation, edit 화면 redirect만 담당하도록 축소
    - 기존 legacy customer snapshot fallback과 quote surface coating fallback 동작을 유지하고, 복제 성공/실패 정리 테스트를 추가
    - `actions.ts`는 약 1,522줄에서 약 1,316줄로 축소
    - `npm run lint`, quote 관련 테스트, 전체 테스트, production build 통과
11. `modules/quotes/application/public-quote-response-service.ts`
    - public quote approval/rejection의 quote 조회, 상태 검증, 상태 업데이트, approval notification 발송 절차를 application service로 분리
    - `approvePublicQuote`, `rejectPublicQuote` server action은 FormData 검증, service 호출, revalidation만 담당하도록 축소
    - public token 기반 접근과 기존 legacy customer snapshot fallback 동작을 유지
    - `actions.ts`는 약 1,316줄에서 약 1,218줄로 축소
    - `npx tsc --noEmit --pretty false`, `npm run lint`, quote/price-rates 관련 테스트, 전체 테스트, production build 통과
12. `modules/quotes/application/quote-pdf-data-service.ts`
    - quote PDF route 안의 quote/business/logo data loading을 quote application service와 infrastructure repository로 이동
    - `app/api/pdf/quote/route.ts`는 request parameter 검증, PDF rendering, HTTP response 생성만 담당하도록 축소
    - private quote id 접근과 public token 접근의 인증/조회 동작을 유지
    - `app/api/pdf/quote/route.ts`는 약 307줄에서 66줄로 축소
    - `npx tsc --noEmit --pretty false`, `npm run lint`, PDF/quote 관련 테스트, 전체 테스트, production build 통과

다음 후보:

1. Cross-feature UI 호출
   - quote UI에서 jobs action을 직접 호출하는 흐름을 page/application 조립으로 이동
2. Legacy fallback
   - DB baseline이 확정된 뒤 `*_LEGACY`, missing-column fallback을 제거
