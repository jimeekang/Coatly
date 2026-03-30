# Coatly — Design Philosophy

## User Persona

**Alex, 호주 소규모 페인터**
- 1~3인 업체 운영, 기술에 익숙하지 않음
- 현장에서 장갑 끼고 스마트폰 사용
- 햇빛 아래 화면 확인, 불안정한 네트워크
- 견적서를 빠르게 작성하고 고객에게 전문적인 PDF를 보내고 싶음

## Core Design Principles

### 1. Mobile-First, Touch-First

모든 화면은 모바일 뷰포트에서 먼저 설계한다.

| 규칙 | 값 | 이유 |
|------|-----|------|
| 최소 터치 타겟 | 44px (h-12+) | 장갑 낀 손으로 탭 가능 |
| 핵심 CTA 위치 | 화면 하단 | 엄지 도달 범위 |
| 숫자 입력 | `inputMode="numeric"` | 키패드 즉시 표시 |
| 폼 간격 | `gap-4` 이상 | 오탭 방지 |

### 2. Progressive Disclosure

- 첫 화면은 최소 정보만 표시
- 상세 정보는 탭/확장으로 접근
- 필수 입력 최소화, 선택 입력은 "고급 옵션"으로 분리

### 3. Instant Feedback

- 모든 액션에 로딩 상태 표시 (Skeleton, Spinner)
- 에러는 인라인으로 즉시 표시
- 성공은 toast 또는 페이지 전환으로 확인

### 4. Professional Output

- PDF 견적서/청구서는 비즈니스 로고, ABN, 연락처 자동 포함
- 깔끔한 레이아웃으로 고객에게 전문적 이미지 전달

## Color System

| Token | 용도 | 참고 |
|-------|------|------|
| `primary` | 핵심 CTA, 브랜드 | Coatly 메인 컬러 |
| `secondary` | 보조 액션 | |
| `destructive` | 삭제, 에러 | 빨간 계열 |
| `muted` | 비활성, 플레이스홀더 | |
| `accent` | 하이라이트, 배지 | |

## Typography

- 본문: `text-base` (16px) — 가독성 우선
- 제목: `text-lg` ~ `text-2xl` — 계층 구조
- 금액: `text-xl font-semibold` — 시각적 강조
- 모든 금액은 AUD 포맷: `$1,234.56`

## Component Architecture

```
components/
  ui/              → shadcn/ui primitives (수정 금지)
  auth/            → 인증 관련 클라이언트 컴포넌트
  quotes/          → 견적서 (Form, Table, Detail, CreateScreen)
  invoices/        → 청구서 (Form, Table, Detail, CreateScreen)
  customers/       → 고객 (Form, Table, Detail, CreateScreen)
  dashboard/       → Sidebar, WorkspaceAssistant
  branding/        → BrandLogo
  onboarding/      → OnboardingForm
  settings/        → BusinessProfileForm, PricingSection
  subscription/    → UpgradePrompt
  ai/              → AIDraftPanel
  pdf/             → React-PDF 템플릿 (QuotePDF, InvoicePDF)
```

## Design Rules

1. **shadcn/ui 수정 금지** — `components/ui/` 파일 직접 편집하지 않음
2. **Tailwind만 사용** — 인라인 스타일 금지
3. **Server Action 패턴** — onClick에서 직접 Supabase 호출 금지
4. **상태 3종 필수** — 모든 비동기 UI에 loading/error/empty 상태 구현
5. **접근성** — aria-label, 키보드 네비게이션, 충분한 색상 대비
