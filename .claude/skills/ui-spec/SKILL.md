---
name: ui-spec
description: >
  Frontend UI/UX 스펙/기획을 받아서 mobile-first Tailwind + shadcn/ui React 컴포넌트를 생성.
  "화면 만들어줘", "UI 짜줘", "컴포넌트 만들어줘", "이 디자인 구현해줘",
  "UX 개선해줘", "프론트엔드 UI/UX 만들어줘" 요청에 반드시 이 skill을 사용할 것.
---

# UI Spec Skill

## 작업 순서 (agent loop)

1. 스펙 분석 — 모바일 UX 포인트, 데이터 흐름, 엣지케이스 파악
2. 컴포넌트 파일 생성
3. `npx tsc --noEmit` + `npx eslint {파일}` 실행
4. 오류 수정 후 완료 보고

## 설계 원칙 (Coatly 전용)

**사용자 = 현장 페인터**: 장갑 낀 손, 햇빛 반사 화면, 빠른 입력 필요

| 규칙 | 이유 |
|------|------|
| 터치 타겟 최소 44px | 장갑 낀 손 |
| 핵심 액션은 화면 하단 | 엄지 범위 |
| 숫자 입력은 항상 `inputMode="numeric"` | 키패드 바로 열림 |
| 로딩/에러 상태 필수 | 현장 네트워크 불안정 |
| 금액은 항상 AUD 포맷 | 호주 사용자 |
| 사용자 노출 문구 기본값은 영어 | 앱 기본 언어는 English |
| 면적 단위 표기는 항상 `sqm` | `m²`, `㎡`, `제곱미터` 표기 금지 |

## 카피/단위 규칙

- 새 화면/폼/버튼/라벨/placeholder/empty state/success message/error message의 기본 문구는 영어로 작성
- 사용자가 명시적으로 다국어 또는 다른 언어를 요청하지 않으면 영어 이외의 UI 카피를 추가하지 않음
- 면적 관련 라벨, 도움말, 테이블 헤더, 계산 결과, PDF용 UI 카피는 항상 `sqm`로 표기
- `m²`, `㎡`, `square meter`, `square metre`, `제곱미터` 표기는 새 UI에서 사용하지 않음

## 컴포넌트 패턴

```tsx
// components/quotes/QuoteForm.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatAUD } from '@/lib/utils'

interface QuoteFormProps {
  onSubmit: (data: QuoteFormData) => Promise<void>
  defaultValues?: Partial<QuoteFormData>
}

export function QuoteForm({ onSubmit, defaultValues }: QuoteFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <form className="flex flex-col gap-4 p-4" onSubmit={...}>
      {/* 숫자 입력 — 항상 inputMode */}
      <Input
        inputMode="numeric"
        className="h-12 text-lg"  {/* 44px+ 터치 타겟 */}
        placeholder="Area (sqm)"
      />

      {/* 에러 상태 */}
      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      {/* CTA — 하단 고정, 엄지 범위 */}
      <Button
        type="submit"
        className="h-14 w-full text-base"
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Create Quote'}
      </Button>
    </form>
  )
}
```

## 파일 위치 규칙
```
components/
  quotes/     → QuoteForm, QuoteCard, QuoteList
  customers/  → CustomerPicker, CustomerForm
  invoices/   → InvoicePreview, InvoiceSend
  pdf/        → QuotePDF, InvoicePDF (React-PDF only)
  ui/         → shadcn primitives only (직접 수정 금지)
```

## 금지 사항
- `components/ui/` 파일 직접 수정 금지 (shadcn 소유)
- `onClick` 안에서 직접 Supabase 호출 금지 — Server Action 사용
- 인라인 스타일 금지 — Tailwind 클래스만
