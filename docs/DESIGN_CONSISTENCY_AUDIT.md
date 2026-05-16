# Coatly — Design Consistency Audit

> Claude Code가 디자인/UX 정책과 progress 계획을 관리합니다. Codex는 이 문서의 구현 작업을 받아 컴포넌트와 테스트를 수정합니다.

## Summary

2026-05-10 기준 P0/P1 디자인 일관성 이슈는 대부분 해결되었습니다. 남은 작업은 legacy token 완전 제거, 일부 상세 컴포넌트의 색상/상태 badge 정리, 모바일 시각 회귀입니다.

2026-05-16 추가: interactive form 3종(`QuoteForm` / `InvoiceForm` / `CustomerForm`)의 레이아웃·버튼·토큰 불일치 감사 결과를 반영했습니다. 상세 구현 스펙은 [Form Layout Unification Spec (D6)](#form-layout-unification-spec-d6) 참조.

## Canonical Rules

| 영역 | 표준 |
|------|------|
| Page title | `components/layout/PageHeader.tsx` |
| Primary CTA | `PrimaryActionLink` |
| Secondary CTA | `SecondaryActionLink` |
| Error box | `components/shared/ErrorAlert.tsx` |
| Back nav | `components/layout/BackButton.tsx` |
| Tokens | Material Design 3 tokens only |
| CTA copy | `+ New {Entity}` |
| Mobile target | 44px minimum |
| Page wrapper | `flex flex-col gap-4 sm:gap-6` |

## Completed Fixes

| ID | 기존 문제 | 상태 |
|----|-----------|------|
| P0-1 | 페이지 title typography 불일치 | 해결: dashboard route page에 `PageHeader` 적용 |
| P0-2 | MD3 token과 legacy `pm-*` 혼용 | 대부분 해결: page-level MD3 적용, legacy alias deprecated |
| P0-3 | CTA 색상/굵기 혼용 | 해결: CTA link 컴포넌트화 |
| P1-1 | 오류 박스 스타일 4종 | 해결: `ErrorAlert` 단일화 |
| P1-2 | CTA prefix 불일치 | 해결: `+ New {Entity}` |
| P1-3 | Back button 터치 피드백 누락 | 해결: `hover:` + `active:` |
| P2-2 | 헤더 spacing 혼용 | 개선: PageHeader 중심 |
| P2-3 | subtitle 색상 혼용 | 개선: `text-on-surface-variant` |

## Remaining Findings

| ID | 우선순위 | 위치 | 작업 |
|----|----------|------|------|
| D1 | P1 | `components/ui/badge.tsx` | legacy `pm-*` 색상 제거 |
| D2 | P1 | `components/customers/CustomerDetail.tsx` | legacy status 색상 제거 |
| D3 | P2 | `app/globals.css` | legacy alias 삭제 가능 시점 재검토 |
| D4 | P2 | `eslint.config.mjs` | `pm-*` whitelist 제거 가능 시점 재검토 |
| D5 | P2 | detailed quote/job screens | 모바일 screenshot 기반 spacing 점검 |
| D6 | P1 | `QuoteForm` / `InvoiceForm` / `CustomerForm` | form 레이아웃·버튼·토큰 통일 — 상세 스펙 ↓ |

## Form Layout Unification Spec (D6)

> Codex 구현 지시. 이 스펙대로 그대로 구현하면 됩니다.
> 대상: `components/quotes/QuoteForm.tsx` · `components/invoices/InvoiceForm.tsx` · `components/customers/CustomerForm.tsx` + 신규 공유 컴포넌트.
> 목표: 색상 토큰 단일화, radius 스케일 통일, footer 버튼/섹션 카드 통일, inline const 제거.

### D6-0. 감사 배경 (현재 불일치)

| 항목 | QuoteForm | InvoiceForm | CustomerForm |
|------|-----------|-------------|--------------|
| 색상 토큰 | MD3 (`on-surface` 등) | legacy `pm-*` | legacy `pm-*` |
| Primary 버튼 색 | `bg-on-surface` (차콜) | `bg-pm-teal` (청록) | `bg-pm-teal` (청록) |
| 버튼 radius | `rounded-xl` | `rounded-2xl` | `rounded-xl` |
| 섹션 카드 | `<section>` + `rounded-2xl border bg-white shadow-sm` | `<section>` + `rounded-3xl border p-5` | 카드 없음 (맨 `<section>`) |
| input radius | `rounded-xl` | `rounded-xl` | `rounded-lg` |
| 라벨 weight | `font-semibold` | `font-medium` | `font-medium` |
| 폼 하단 패딩 | `pb-32` | `pb-32` | `pb-28` |
| 입력 스타일 | inline `FIELD`/`LABEL`/`TEXTAREA` const | inline `FIELD_CLASS` 등 | inline `FIELD_CLASS` 등 |

컨테이너 너비는 3종 모두 [Container Width Rules](#container-width-rules)를 이미 준수 — **변경 금지**.

### D6-1. 토큰 마이그레이션 맵

`app/globals.css:75-91`의 공식 legacy alias 매핑. 세 폼에서 쓰이는 항목만:

| 레거시 `pm-*` | MD3 토큰 | 값 |
|---------------|----------|-----|
| `pm-teal` | `primary` | `#0D8068` |
| `pm-teal-hover` | `primary/90` (opacity) | `#0B6E5A` |
| `pm-teal-mid` | `primary-container` | `#0B9E80` |
| `pm-teal-pale` | `primary-fixed` | `#B2DDD6` |
| `pm-teal-light` | `success-container` | `#E6F4F0` |
| `pm-coral` / `pm-coral-mid` | `error` | `#B91C1C` |
| `pm-coral-light` | `error-container` | `#FEE2E2` |
| `pm-coral-dark` | `on-error-container` | `#7F1D1D` |
| `pm-body` | `on-surface` | `#0F1620` |
| `pm-secondary` | `on-surface-variant` | `#475569` |
| `pm-border` | `outline` | `#CBD5E1` |
| `pm-surface` | `surface-container-low` | `#F4F2ED` |

**Form-specific override**: 이 표는 공식 1:1 alias 매핑이다. 다만 D6 폼 작업에서는 `border-pm-border`를 기계적으로 `border-outline`로 치환하지 않는다. MD3-correct한 QuoteForm 기준에 맞춰 form field, section, footer 경계는 더 가벼운 `border-outline-variant`(#E2E8F0)로 통일한다. input focus border는 `border-primary`.

### D6-2. 신규 공유 컴포넌트 (3개 생성)

세 폼이 입력 스타일을 각자 inline const로 정의하는 것이 불일치의 구조적 원인. 공유 컴포넌트로 대체. 정본 값은 MD3-correct한 QuoteForm의 현재 const에서 가져옴.

**`components/forms/FormField.tsx`** — label + control + error 묶음
```
props: label, htmlFor, error?, required?, as?: 'input' | 'textarea', disabled?, ...rest
label:    mb-1.5 block text-sm font-semibold text-on-surface
input:    h-12 w-full rounded-xl border border-outline-variant bg-white px-4
          text-base text-on-surface placeholder:text-on-surface-variant
          focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
textarea: 위와 동일하되 h-12 제거 + py-3
disabled: bg-surface-container-low text-on-surface-variant cursor-not-allowed
error:    mt-1 text-sm text-error
```

**`components/forms/FormSection.tsx`** — 섹션 카드 래퍼
```
<section className="rounded-2xl border border-outline-variant bg-white p-4 shadow-sm sm:p-6">
  {title && <h2 className="mb-4 text-base font-semibold text-on-surface">{title}</h2>}
  {children}
</section>
```

**`components/forms/FormFooter.tsx`** — 고정 하단 액션 바 + Primary/Secondary 버튼
```
컨테이너: fixed left-0 right-0 z-30 border-t border-outline-variant
          bg-white/95 backdrop-blur-sm px-4 pt-3
          pb-[calc(0.75rem+env(safe-area-inset-bottom))]
          bottom-[calc(4rem+env(safe-area-inset-bottom))]
          md:bottom-0
          md:left-60 lg:left-64           ← tablet/desktop sidebar 너비와 정렬
Primary:   h-14 rounded-xl bg-primary text-on-primary font-semibold
           hover:bg-primary/90 disabled:opacity-50
Secondary: h-14 rounded-xl border border-outline-variant bg-white
           text-on-surface font-semibold hover:bg-surface-container-low
```

모바일에서는 footer가 bottom tab bar 위에 물리적으로 배치되어야 한다. 태블릿/데스크탑에서는 sidebar offset만 적용하고 viewport 하단에 붙인다.

> 기존 `components/ui/input.tsx`·`select.tsx`는 `pm-*` 기반이고 label/error 래핑이 없어 세 폼이 사용하지 않음. 이번 작업에서 두 파일의 토큰도 D6-1 맵으로 MD3 치환할 것. `FormField`가 내부적으로 `ui/input.tsx`를 조합할지 신규 control을 둘지는 구현 재량.

### D6-3. 표준값 (확정)

| 항목 | 통일값 | 현재 위반 |
|------|--------|-----------|
| 섹션 카드 radius | `rounded-2xl` | Invoice `rounded-3xl`, Customer 카드 없음 |
| 버튼 radius | `rounded-xl` | Invoice `rounded-2xl` |
| input radius | `rounded-xl` | Customer `rounded-lg` |
| input 높이 | `h-12` | 없음 |
| footer 버튼 높이 | `h-14` | 없음 |
| 폼 내부 보조 액션 버튼 | `h-11` | Quote 일부 `h-12` 혼재 |
| Primary 버튼 색 | `bg-primary` | Quote `bg-on-surface`, Invoice/Customer `bg-pm-teal` |
| 라벨 weight | `font-semibold` | Invoice/Customer `font-medium` |
| 폼 wrapper | `flex flex-col gap-6 pb-32` | Customer `pb-28` |

### D6-4. 파일별 변경 지시

**`components/quotes/QuoteForm.tsx`**
- `FIELD` / `LABEL` / `TEXTAREA` const 삭제 → `<FormField>` 교체
- footer raw `<button>` → `<FormFooter>`. Primary 버튼 `bg-on-surface` → `bg-primary`로 변경
- 섹션 → `<FormSection>` (현재 값이 정본이라 사실상 동일)
- 폼 내부 보조 버튼 `h-11`/`h-12` 혼재 → 보조 액션 `h-11`로 통일 (footer 버튼만 `h-14`)
- footer z-index `z-10` → `z-30` (D6-5)

**`components/invoices/InvoiceForm.tsx`**
- `FIELD_CLASS` / `TEXTAREA_CLASS` / `LABEL_CLASS` const 삭제 → `<FormField>`
- 모든 `pm-*` → D6-1 맵 치환
- 섹션 `rounded-3xl ... p-5` → `<FormSection>` (`rounded-2xl`, `p-4 sm:p-6`)
- footer `rounded-2xl bg-pm-teal` → `<FormFooter>` (`rounded-xl bg-primary`)
- footer 위치 `bottom-20 md:bottom-0 md:left-64` → `<FormFooter>` 표준값
- 우측 사이드바 그리드 `lg:grid-cols-[minmax(0,1.4fr)_300px]`는 유지 (Invoice 고유 레이아웃)

**`components/customers/CustomerForm.tsx`**
- `FIELD_CLASS` / `FIELD_DISABLED_CLASS` / `LABEL_CLASS` const 삭제 → `<FormField>` (disabled는 prop)
- 모든 `pm-*` → D6-1 맵 치환
- 맨 `<section>` → `<FormSection>`으로 감싸 진짜 카드로 (현재 고객 폼만 카드 없음)
- input `rounded-lg` → `rounded-xl` (FormField가 처리)
- footer `bg-pm-teal` → `<FormFooter>`
- 폼 wrapper `pb-28` → `pb-32`

### D6-5. z-index 레이어 정리 (같이 처리)

이전 감사에서 `QuoteForm`의 Send Quote 모달 `z-30`과 모바일 nav `z-40` 충돌이 발견되었다. 현재 `QuoteForm` 모달은 `z-50`로 고쳐져 있으므로, `<FormFooter>` 도입 시 아래 레이어 규칙을 유지한다:

| 레이어 | z-index |
|--------|---------|
| 폼 footer 액션 바 (`FormFooter`) | `z-30` |
| 모바일 탭바 / nav | `z-40` |
| 모달 · 오버레이 | `z-50` |

→ `<FormFooter>`는 `z-30`, 모바일 nav는 `z-40`, 모달류는 전부 `z-50`로. 새 shared footer 적용 중 기존 `z-50` 모달을 낮추지 말 것.

### D6-6. 작업 순서 (커밋 단위)

1. 공유 컴포넌트 3개 생성 + `ui/input.tsx`·`select.tsx` 토큰 MD3 치환 — 커밋 D6-1
2. `CustomerForm` 마이그레이션 (814줄, 가장 작음) — 커밋 D6-2
3. `InvoiceForm` 마이그레이션 (1136줄) — 커밋 D6-3
4. `QuoteForm` 마이그레이션 (2582줄) + footer/z-index 규칙 유지 — 커밋 D6-4
5. build + 3개 폼 모바일/데스크탑 렌더 확인 — 검증 로그 첨부

각 항목은 별도 커밋/검증 단위다. 한 커밋에 묶지 말 것.

### D6-7. 완료 기준

- [ ] 3개 폼에서 `pm-*` 클래스 0개
- [ ] 3개 폼의 Primary 버튼 색 동일 (`bg-primary`)
- [ ] 섹션 카드 `rounded-2xl`, 버튼 `rounded-xl`, input `rounded-xl`
- [ ] inline `FIELD*` / `LABEL*` / `TEXTAREA*` const 정의 0개
- [ ] `npm run build` 통과, `any` 타입 미발생
- [ ] 모바일 375px에서 footer가 탭바와 안 겹치고 Send Quote 모달이 nav 위에 뜸
- [ ] 태블릿 768-1024px에서 라벨형 sidebar(240px)와 footer offset이 정렬됨
- [ ] 컨테이너 너비 변경 없음 (Customer만 `md:max-w-2xl` 유지)

### D6-8. 범위 밖 (별도 추적)

`pm-*`는 `CustomerDetail`·`settings/*`·`auth/*`·`quotes/public/*` 등 ~37개 파일에 더 존재. ESLint warn이 계속 발생하므로 별도 마이그레이션 작업으로 분리 (관련: D2·D3·D4). 본 스펙은 form 3종에 한정.

## Container Width Rules

| 화면 유형 | 너비 |
|-----------|------|
| dashboard/list | layout `max-w-7xl` |
| simple form | `max-w-lg md:max-w-2xl` |
| settings | `max-w-4xl` |
| complex form/line items | `max-w-lg lg:max-w-6xl` |
| public quote | content-first, mobile readable |

## New UI Checklist

- [ ] MD3 token만 사용
- [ ] `PageHeader` 사용
- [ ] CTA는 `PrimaryActionLink`/`SecondaryActionLink`
- [ ] 오류는 `ErrorAlert`
- [ ] interactive target 44px 이상
- [ ] loading/error/empty 상태 포함
- [ ] mobile 390px에서 텍스트 겹침 없음
- [ ] desktop에서 container width 규칙 준수

## Handoff

Claude Code:
- 디자인 정책 수립
- 화면/플로우 리뷰
- progress/roadmap 정리
- 브라우저 기반 디자인 회귀 확인

Codex:
- 컴포넌트 구현
- legacy token 제거
- lint/test/build 검증
- 회귀 테스트 추가
