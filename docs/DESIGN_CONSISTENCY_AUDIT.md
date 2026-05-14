# Coatly — 디자인 일관성 & UX 감사 리포트

**작성일:** 2026-05-10
**대상 브랜치:** `price-marge`
**스코프:** 전체 웹앱 (auth, onboarding, dashboard 라우트 그룹)
**기준 디자인 시스템:** [`docs/DESIGN.md`](./DESIGN.md), [`app/globals.css`](../app/globals.css) — Material Design 3 기반 (primary `#0D8068` teal)

---

## 핵심 요약

| 지표 | 값 |
|------|-----|
| 발견된 불일치 카테고리 | 9개 |
| 구체적 파일:라인 위반 | 18개 |
| 위험도 분포 | 🔴 P0 critical: 3 / 🟠 P1 high: 3 / 🟡 P2 medium: 3 |
| 가장 큰 문제 | **Material Design 3 토큰 (`bg-primary`, `text-on-surface`) ↔ legacy `pm-*` alias 혼용** — 같은 색상이지만 의도가 갈려 신규 작업이 어떤 표기를 따라야 하는지 모호함 |

**한 줄 진단:** 디자인 시스템(DESIGN.md)은 잘 정의되어 있으나, **두 종류의 색/타이포 표기 시스템이 동시에 살아있어** 페이지마다 점점 다른 방향으로 분기되고 있다. 표준을 하나로 결정하고 일괄 마이그레이션 + 린트 룰로 잠그는 것이 시급하다.

---

## 🔴 P0 — Critical (즉시 수정 권장)

스캔 시간 증가, 신뢰도 저하, 디자인 시스템 신뢰성 붕괴 위험.

### P0-1. 페이지 제목 typography 불일치 (시각적 위계 붕괴)

**문제**
같은 대시보드 list 페이지의 `h1`이 페이지마다 폰트 크기·두께·색상이 다르게 적용되어 있음.

| 페이지 | h1 클래스 | 위치 |
|--------|----------|------|
| Quotes | `text-2xl font-extrabold tracking-tight text-on-surface sm:text-4xl` | [app/(dashboard)/quotes/page.tsx:18](../app/(dashboard)/quotes/page.tsx#L18) |
| Dashboard | `text-2xl font-extrabold tracking-tight text-on-surface leading-tight sm:text-4xl` | [app/(dashboard)/dashboard/page.tsx:190](../app/(dashboard)/dashboard/page.tsx#L190) |
| Customers | `text-2xl font-extrabold tracking-tight text-on-surface sm:text-[28px]` | [app/(dashboard)/customers/page.tsx:18](../app/(dashboard)/customers/page.tsx#L18) |
| Invoices | `text-2xl font-bold text-pm-body sm:text-[28px]` | [app/(dashboard)/invoices/page.tsx:15](../app/(dashboard)/invoices/page.tsx#L15) |
| Schedule | `text-2xl font-bold text-pm-body sm:text-[28px]` | [app/(dashboard)/schedule/page.tsx:79](../app/(dashboard)/schedule/page.tsx#L79) |
| Materials | `text-[28px] font-bold text-pm-body` (모바일에도 28px 고정) | [app/(dashboard)/materials-service/page.tsx:13](../app/(dashboard)/materials-service/page.tsx#L13) |
| Price Rates | `text-2xl font-bold text-pm-body sm:text-[28px]` | [app/(dashboard)/price-rates/page.tsx:29](../app/(dashboard)/price-rates/page.tsx#L29) |

**영향**
- Quotes/Dashboard는 데스크톱에서 `text-4xl`(36px) + `font-extrabold` → 강한 위계
- Invoices/Schedule/Price-Rates는 `text-[28px]` + `font-bold` → 27% 작고 약함
- 사용자가 페이지 간 이동 시 "여기가 같은 앱이 맞나?" 위화감

**표준 (Quotes/Dashboard 기준)**
```tsx
<h1 className="text-2xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
```

**해결 방안**
1. 공통 컴포넌트 `<PageTitle>` 추출:
   ```tsx
   // components/layout/PageTitle.tsx
   export function PageTitle({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
     return (
       <header className="space-y-1">
         <h1 className="text-2xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
           {children}
         </h1>
         {subtitle && <p className="text-sm text-on-surface-variant font-medium">{subtitle}</p>}
       </header>
     );
   }
   ```
2. 위 7개 페이지의 인라인 `<h1>` → `<PageTitle>` 교체
3. ESLint rule 또는 PR 템플릿 체크리스트로 신규 페이지에서 강제

---

### P0-2. 색상 토큰 시스템 분기 (Material Design 3 ↔ legacy pm-* alias)

**문제**
[`app/globals.css`](../app/globals.css)에 두 개의 동등한 색상 시스템이 공존:
- **MD3 토큰** (10–74행): `--color-primary`, `--color-on-surface`, `--color-on-surface-variant`
- **legacy alias** (76–90행): `--color-pm-teal`, `--color-pm-body`, `--color-pm-secondary` — 값은 동일하나 별도 토큰

페이지마다 어느 쪽을 쓰는지 일관성 없음:

| 토큰 사용 패턴 | 페이지 |
|---------------|--------|
| MD3 (`text-on-surface`, `bg-primary`) | Quotes, Customers, Dashboard |
| legacy (`text-pm-body`, `bg-pm-teal`) | Invoices, Settings, Schedule, Materials, Price Rates |

**영향**
- 신규 컴포넌트 작성 시 어떤 토큰을 따라야 할지 결정 비용 발생
- 둘 중 하나를 deprecate 하지 않으면 시간이 갈수록 분기 심화
- DESIGN.md는 MD3 기반이므로 의도와 코드 불일치

**표준 결정 권고: Material Design 3로 통일**

이유: DESIGN.md에 토큰 명세가 MD3 기반으로 작성되어 있고, MD3는 의미론적(`on-surface`, `on-primary`) 명명으로 다크모드/접근성 확장이 쉽다.

**해결 방안**
1. 전역 find-replace (검토 후):
   - `text-pm-body` → `text-on-surface`
   - `text-pm-secondary` → `text-on-surface-variant`
   - `bg-pm-teal` → `bg-primary`
   - `text-pm-teal` → `text-primary`
   - `bg-pm-surface` → `bg-surface-container-low`
   - `border-pm-border` → `border-outline-variant`
   - `bg-pm-coral-light` → `bg-error-container`
   - `text-pm-coral` → `text-error`
2. globals.css의 legacy alias 블록(76–90행)에 `/* @deprecated — use MD3 tokens above */` 주석 추가, 다음 분기에 제거
3. ESLint rule (`no-restricted-syntax`)로 `pm-*` 클래스 사용 시 경고

---

### P0-3. CTA 버튼 색상·폰트 굵기 혼용

**문제**
"새 항목 만들기" 같은 동일 의도의 primary CTA가 페이지마다 다른 클래스 조합으로 작성됨.

| 페이지 | CTA 클래스 | 위치 |
|--------|-----------|------|
| Quotes | `bg-primary text-on-primary` (조건부) | [app/(dashboard)/quotes/page.tsx:28](../app/(dashboard)/quotes/page.tsx#L28) |
| Customers | `bg-primary px-4 py-2.5 text-sm text-on-primary font-semibold` | [app/(dashboard)/customers/page.tsx:25](../app/(dashboard)/customers/page.tsx#L25) |
| Invoices | `bg-pm-teal px-4 py-2.5 text-sm font-medium` | [app/(dashboard)/invoices/page.tsx:22](../app/(dashboard)/invoices/page.tsx#L22) |
| Settings | `bg-pm-teal px-4 py-2.5 text-sm font-semibold` | [app/(dashboard)/settings/page.tsx:74](../app/(dashboard)/settings/page.tsx#L74) |

**영향**
- legacy `bg-pm-teal` 사용 (P0-2 와 동일 문제)
- `font-medium` (500) vs `font-semibold` (600) → 시각적 무게 다름
- shadcn/ui 의 `<Button>` 컴포넌트가 있는데도 인라인 className으로 만들고 있음

**표준**
shadcn `<Button variant="default">` 사용 + 모바일 우선 사이즈 + MD3 토큰:
```tsx
<Button asChild className="h-11 font-semibold">
  <Link href="/quotes/new">+ New Quote</Link>
</Button>
```

`components/ui/button.tsx`의 default variant가 이미 `bg-primary text-primary-foreground` 매핑이므로 추가 색상 지정 불필요.

**해결 방안**
1. 인라인 CTA를 `<Button>` 컴포넌트로 교체
2. CTA 텍스트도 통일: 모두 `+ New {Entity}` (3.1 참조)
3. font-weight: 모든 primary CTA `font-semibold`

---

## 🟠 P1 — High (이번 스프린트 내 수정)

사용자가 즉각적으로는 모르나 누적되어 "프로페셔널하지 않은 느낌" 유발.

### P1-1. 에러 메시지 박스 스타일 4종

**문제**

| 페이지 | 에러 박스 클래스 | 위치 |
|--------|---------------|------|
| Quotes | `rounded-lg border border-error/30 bg-error-container px-4 py-3` | [app/(dashboard)/quotes/page.tsx:60](../app/(dashboard)/quotes/page.tsx#L60) |
| Customers | `rounded-lg bg-error-container border border-error/20 px-4 py-3` | [app/(dashboard)/customers/page.tsx:32](../app/(dashboard)/customers/page.tsx#L32) |
| Invoices | `rounded-lg border border-pm-coral bg-pm-coral-light px-4 py-3` | [app/(dashboard)/invoices/page.tsx:29](../app/(dashboard)/invoices/page.tsx#L29) |
| Settings | `rounded-2xl border border-pm-coral bg-pm-coral-light px-5 py-4` | [app/(dashboard)/settings/page.tsx:37](../app/(dashboard)/settings/page.tsx#L37) |

차이: border opacity (`/30` vs `/20`), 색 토큰(MD3 vs legacy), radius(`lg` vs `2xl`), padding (`px-4 py-3` vs `px-5 py-4`).

**해결 방안**
공통 컴포넌트 `<ErrorAlert>` 추출:
```tsx
// components/shared/ErrorAlert.tsx
export function ErrorAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-sm text-on-error-container">
      {children}
    </div>
  );
}
```

---

### P1-2. CTA 텍스트 prefix 불일치

**문제**

| 페이지 | 버튼 텍스트 | 위치 |
|--------|-----------|------|
| Quotes | `New Quote` (prefix 없음) | [app/(dashboard)/quotes/page.tsx:31](../app/(dashboard)/quotes/page.tsx#L31) |
| Invoices | `+ New Invoice` | [app/(dashboard)/invoices/page.tsx:24](../app/(dashboard)/invoices/page.tsx#L24) |
| Customers | `+ Add Customer` (Add 사용) | [app/(dashboard)/customers/page.tsx:27](../app/(dashboard)/customers/page.tsx#L27) |

**영향**
- 같은 의도의 액션이 "New" 또는 "Add"로 갈림 → 사용자가 다른 동작으로 인식할 가능성
- `+` prefix가 일부에만 있어 시각적 스캔 일관성 깨짐

**표준 권고**
모두 **`+ New {Entity}`** (영문 액션 동사 단일화 + visual cue 일관)
- `+ New Quote`
- `+ New Invoice`
- `+ New Customer`
- `+ New Job`

**해결 방안**
- Customers 의 "Add" → "New"로 변경
- Quotes 에 `+` prefix 추가
- 신규 entity 추가 시 컨벤션 고정 (CLAUDE.md에 명시)

---

### P1-3. 뒤로가기 버튼 — 모바일 터치 피드백 누락

**문제**

| 페이지 | 클래스 | 위치 |
|--------|-------|------|
| New Quote | `... active:bg-pm-border` | [app/(dashboard)/quotes/new/page.tsx:44](../app/(dashboard)/quotes/new/page.tsx#L44) |
| New Customer | `... active:bg-pm-border` | [app/(dashboard)/customers/new/page.tsx:24](../app/(dashboard)/customers/new/page.tsx#L24) |
| New Invoice | `... hover:bg-pm-teal-light hover:text-pm-teal` (active 없음!) | [app/(dashboard)/invoices/new/page.tsx:43](../app/(dashboard)/invoices/new/page.tsx#L43) |

**영향**
- 모바일 우선 PWA인데 New Invoice는 **`hover:`만 정의** → 터치 디바이스에서 시각 피드백 0
- 터치 후 화면이 멈춘 듯 보여 사용자가 같은 버튼을 두 번 누름

**표준**
```tsx
className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-colors hover:bg-primary-container hover:text-on-primary-container active:bg-outline-variant"
```
모바일(`active:`) + 데스크톱(`hover:`) 둘 다 정의.

---

## 🟡 P2 — Medium (다음 분기)

미세한 polish 이슈. 시간 여유 있을 때.

### P2-1. 페이지 컨테이너 max-width 다양성

**문제**
[`app/(dashboard)/layout.tsx:34`](../app/(dashboard)/layout.tsx#L34) 가 이미 `max-w-7xl` 으로 감싸는데, 일부 페이지가 또 다른 max-width로 감쌈.

| 페이지 | 추가 컨테이너 | 위치 |
|--------|------------|------|
| Materials | `mx-auto max-w-2xl` | [materials-service/page.tsx:11](../app/(dashboard)/materials-service/page.tsx#L11) |
| Price Rates | `mx-auto max-w-6xl` | [price-rates/page.tsx:21](../app/(dashboard)/price-rates/page.tsx#L21) |
| Settings | `mx-auto max-w-4xl` | [settings/page.tsx:44](../app/(dashboard)/settings/page.tsx#L44) |
| New Quote | `mx-auto max-w-lg sm:max-w-7xl` | [quotes/new/page.tsx:41](../app/(dashboard)/quotes/new/page.tsx#L41) |
| New Invoice | `mx-auto max-w-lg sm:max-w-6xl` | [invoices/new/page.tsx:39](../app/(dashboard)/invoices/new/page.tsx#L39) |
| New Customer | `max-w-lg` (sm 분기 없음) | [customers/new/page.tsx:19](../app/(dashboard)/customers/new/page.tsx#L19) |

**영향**
- New Quote는 `sm:max-w-7xl`, New Invoice는 `sm:max-w-6xl` → 데스크톱에서 양식 폭 다름
- New Customer는 데스크톱에서도 좁은 `max-w-lg` 유지 → 같은 "신규 작성" 페이지인데 타 페이지와 폭 불일치

**해결 방안**
- 신규 작성 form 페이지 표준: `max-w-lg md:max-w-2xl` (모바일 채우기 → 데스크톱 적당히 넓게)
- 리스트/대시보드 페이지: layout의 `max-w-7xl` 따름 (개별 override 제거)
- Settings/Price Rates 같은 설정 페이지는 `max-w-4xl` 유지(읽기 편함)

---

### P2-2. 헤더 영역 spacing 토큰 혼용

**문제**

| 페이지 | spacing | 위치 |
|--------|--------|------|
| Quotes/Customers | `gap-3 sm:flex-row` | [quotes/page.tsx:16](../app/(dashboard)/quotes/page.tsx#L16) |
| Invoices | `mb-4 ... sm:mb-6` (구식 margin 방식) | [invoices/page.tsx:13](../app/(dashboard)/invoices/page.tsx#L13) |
| Dashboard | `space-y-5 sm:space-y-8` | [dashboard/page.tsx:187](../app/(dashboard)/dashboard/page.tsx#L187) |
| Schedule | `gap-4 sm:gap-6` | [schedule/page.tsx:77](../app/(dashboard)/schedule/page.tsx#L77) |

**해결 방안**
- 페이지 wrapper: `space-y-4 sm:space-y-6` 통일
- 헤더 row: `gap-3 sm:gap-4` 통일
- `mb-*` 단독 사용 지양 (flex/grid gap 또는 space-y-* 우선)

---

### P2-3. 서브타이틀 색상 토큰

**문제**
페이지 제목 아래 설명 텍스트:
- `text-on-surface-variant` (Quotes, Customers): MD3
- `text-pm-secondary` (Invoices, Schedule): legacy

→ P0-2 와 동일 원인. 일괄 마이그레이션 시 같이 처리.

---

## 추가 발견 사항 (참고)

### 잘 되어 있는 부분 ✅
- 폼 입력 높이 `h-12` (44px+) 모든 곳에서 일관 — 모바일 터치 안전
- 버튼 최소 높이 `min-h-11` 일관
- 테이블 상태 배지 (`STATUS_BADGE`, `INVOICE_STATUS_STYLES`) 색 매핑 동일 패턴
- 로딩 스켈레톤 `ListPageSkeleton` 재사용
- 라우트 그룹 구조 `(auth)`/`(dashboard)`/`(onboarding)` 적절히 분리

### 후속 검토 필요
- 다크모드 토큰(`oklch(...)`)이 `globals.css:158` 이하에 정의되어 있으나 실사용 여부 불명 — 필요 없으면 제거, 필요하면 PWA 매니페스트와 함께 정식 지원
- `.field` CSS 클래스(globals.css:99) vs shadcn `<Input>` 컴포넌트 — 어느 쪽을 표준으로 할지 결정 필요
- `manrope` + `geist` 두 폰트 변수 모두 정의(`app/layout.tsx:11`)되어 있으나 실제로는 body가 `Manrope` 고정 — geist 사용처 확인 후 미사용 시 제거

---

## 실행 계획 요약

| 순서 | 작업 | 영향 파일 수 | 예상 시간 |
|------|------|-----------|---------|
| 1 | `<PageTitle>` 컴포넌트 추출 + 7개 페이지 교체 | 8 | 30분 |
| 2 | `<ErrorAlert>` 컴포넌트 추출 + 4개 페이지 교체 | 5 | 20분 |
| 3 | CTA → `<Button>` 컴포넌트 + 텍스트 통일 (`+ New X`) | 6 | 30분 |
| 4 | legacy `pm-*` 토큰 → MD3 일괄 치환 (안전 검토 후) | ~30 | 1시간 |
| 5 | 뒤로가기 버튼 `hover:` + `active:` 양쪽 추가 | 3 | 10분 |
| 6 | form 페이지 `max-w-lg md:max-w-2xl` 통일 | 3 | 10분 |
| 7 | ESLint rule + PR 체크리스트 추가 (재발 방지) | 2 | 30분 |

**총 예상: 3.5시간** (인간 기준) / 30~45분 (CC + gstack)

---

## 체크리스트 (재발 방지)

- [ ] `components/layout/PageTitle.tsx` 추출 완료
- [ ] `components/shared/ErrorAlert.tsx` 추출 완료
- [ ] CTA 인라인 className 제거 — 모두 `<Button>` 사용
- [ ] `globals.css` 의 `pm-*` alias에 `@deprecated` 주석
- [ ] ESLint `no-restricted-syntax` 로 `pm-*` 사용 시 경고
- [ ] CLAUDE.md 에 "신규 페이지 = `<PageTitle>` + `<Button>` + MD3 토큰" 명시
- [ ] PR 템플릿에 "디자인 토큰 MD3 만 사용" 체크박스

---

## 실행 기록 (2026-05-10)

### 적용 완료 (P0 + P1)
- ✅ P0-1 page title typography 통일 — 10개 페이지에 `<PageHeader>` 적용
- ✅ P0-2 페이지 레벨 토큰 → MD3 (대시보드 라우트의 page.tsx 10개 한정)
- ✅ P0-3 CTA 컴포넌트화 — `<PrimaryActionLink>` / `<SecondaryActionLink>`
- ✅ P1-1 `<ErrorAlert>` 단일 패턴
- ✅ P1-2 CTA 텍스트 `+ New {Entity}` 통일
- ✅ P1-3 `<BackButton>` — `hover:` + `active:` 양쪽 정의
- 커밋: `e28238c` (design consistency P0+P1 fixes)

### 적용 완료 (P2 — 가드레일)
- ✅ [`app/globals.css`](../app/globals.css) — legacy `pm-*` 블록에 `@deprecated` 주석 + 토큰 매핑표 추가
- ✅ [`eslint.config.mjs`](../eslint.config.mjs) — `no-restricted-syntax` 룰로 신규 `pm-*` 사용 시 warn (기존 사용 파일은 화이트리스트로 점진 마이그레이션 허용)
- ✅ [`CLAUDE.md`](../CLAUDE.md) — Design Conventions 섹션 추가 (필수 컴포넌트 + 토큰 정책)

### P2-1 컨테이너 너비 — 부분 적용
재검토 결과, new entity 페이지 너비는 콘텐츠 밀도에 따라 정당화됨:
- `customers/new` → `max-w-lg md:max-w-2xl` (단순 form, 적용 완료)
- `quotes/new` → `max-w-lg lg:max-w-7xl` (line items + customer + rates → 넓은 폭 필요, 유지)
- `invoices/new` → `max-w-lg lg:max-w-6xl` (line items + payment terms → 유지)
- list/dashboard 페이지 → layout의 `max-w-7xl` 의존, 개별 override 없음 ✓
- `materials-service` → `max-w-2xl`, `price-rates` → `max-w-6xl`, `settings` → `max-w-4xl` 유지 (콘텐츠 적절)

### 후속 작업 (별도 PR로 분리)

**컴포넌트 코드 일괄 마이그레이션 (`pm-*` → MD3)** — 약 60개 파일 / 수천 occurrences:
- 위험: `pm-teal-light` (#E6F4F0), `pm-teal-mid` (#0B9E80), `pm-teal-pale` (#B2DDD6) 등은 MD3와 1:1 매핑이 아니어서 자동 sed 치환 불가
- 권장 진행 방식:
  1. 한 번에 한 컴포넌트 디렉토리씩 마이그레이션 (예: `components/quotes/` 단위)
  2. 마이그레이션 완료한 디렉토리는 [`eslint.config.mjs`](../eslint.config.mjs) 화이트리스트에서 제거
  3. 각 마이그레이션 후 시각적 회귀 테스트 (`/gstack-design-review --regression`)
- 현재 화이트리스트: `eslint.config.mjs` 의 두 번째 config 블록 참조

**ESLint warn 정책**
- 신규 코드(화이트리스트 외): `pm-*` 사용 시 warn → CI에서 `--max-warnings=0` 적용 권장
- 기존 코드: warn 없음 (점진 정리 중)

**최종 정리 시점에 할 일**
- [`app/globals.css`](../app/globals.css) 의 legacy alias 블록 삭제
- [`eslint.config.mjs`](../eslint.config.mjs) 의 화이트리스트 config 블록 삭제
- 이 audit 문서를 archive (예: `docs/archive/2026-05-design-audit.md`)

