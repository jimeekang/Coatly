---
name: test-writer
description: >
  컴포넌트/함수/API route를 받아서 Vitest + Testing Library 테스트를 자동 작성하고 실행.
  "테스트 짜줘", "테스트 커버리지 추가해줘", "이 함수 테스트해줘",
  "테스트 실패하는데 고쳐줘" 요청에 반드시 이 skill을 사용할 것.
---

# Test Writer Skill

## 작업 순서 (agent loop)

1. 대상 파일 읽기 — 함수 시그니처, props, 사이드이펙트 파악
2. 테스트 파일 생성 (`__tests__/` 또는 같은 디렉터리에 `.test.ts`)
3. `npx vitest run {파일}` 실행
4. 실패하면 실패 메시지 읽고 코드 수정 → 3번 반복 (최대 3회)
5. 통과하면 커버리지 리포트 출력

## 테스트 우선순위

| 유형 | 도구 | 우선도 |
|------|------|--------|
| Server Action / API route | `vitest` + `supertest` | 최우선 |
| Supabase query 함수 | `vitest` + mock | 높음 |
| React 컴포넌트 | `@testing-library/react` | 중간 |
| 유틸 함수 | `vitest` | 항상 |

## 패턴

### Server action 테스트
```ts
import { describe, it, expect, vi } from 'vitest'
import { createQuote } from '@/app/actions/quotes'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ data: mockQuote, error: null }) })),
  }))
}))

describe('createQuote', () => {
  it('creates quote with correct user_id', async () => {
    const result = await createQuote({ customer_id: 'cust-1', status: 'draft' })
    expect(result.data?.user_id).toBe('user-1')
  })

  it('returns error when unauthenticated', async () => {
    // mock auth to return null user
    const result = await createQuote({ customer_id: 'cust-1', status: 'draft' })
    expect(result.error).toBeDefined()
  })
})
```

### 컴포넌트 테스트
```ts
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuoteCard from '@/components/quotes/QuoteCard'

it('shows total price formatted in AUD', () => {
  render(<QuoteCard quote={{ ...mockQuote, total: 1500 }} />)
  expect(screen.getByText('A$1,500.00')).toBeInTheDocument()
})
```

## 제약
- Supabase 실제 호출 절대 금지 — 모두 mock
- 테스트당 하나의 assertion 원칙
- `any` 타입 금지
- 사용자 노출 UI를 테스트할 때는 기본 카피가 영어인지 확인
- 면적 관련 UI를 테스트할 때는 `sqm` 표기를 기대값으로 사용하고 `m²`/`㎡` 표기는 허용하지 않음
