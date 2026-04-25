# Coatly — Frontend Patterns

## Server Component Pattern (기본)

모든 보호된 페이지는 Server Component로 작성한다.

```ts
// app/(dashboard)/quotes/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function QuotesPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RLS가 user_id를 자동 필터링 — 추가 .eq() 불필요
  const { data: quotes } = await supabase.from('quotes').select('*')

  return <QuoteTable quotes={quotes ?? []} />
}
```

## Client Component 규칙

`"use client"`는 아래 경우에만 사용:

| 사용 O | 사용 X |
|--------|--------|
| 폼 상태 관리 (useState) | 데이터 fetch |
| 이벤트 핸들러 (onClick) | Supabase 직접 호출 |
| 브라우저 API (localStorage) | auth 체크 |
| 애니메이션/인터랙션 | 페이지 레이아웃 |

### React 19 lint 제약

- 초기 데이터는 Server Component나 route loader에서 가져와 Client Component props로 전달한다.
- Client Component의 `useEffect`에서 mount 직후 `setState`를 연쇄 호출하는 패턴은 피한다.
- 공개 견적 날짜 선택처럼 재시도가 필요한 UI는 서버에서 받은 초기값을 먼저 렌더링하고, 사용자가 누른 retry/action에서만 비동기 state 전환을 수행한다.

## Form Pattern (Server Actions)

```tsx
'use client'
import { useFormStatus } from 'react-dom'
import { createQuote } from '@/app/actions/quotes'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="h-14 w-full" disabled={pending}>
      {pending ? 'Saving...' : 'Create Quote'}
    </Button>
  )
}

export function QuoteForm() {
  return (
    <form action={createQuote}>
      <Input name="title" required className="h-12" />
      <SubmitButton />
    </form>
  )
}
```

## Server Action Pattern

```ts
// app/actions/quotes.ts
'use server'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createQuote(formData: FormData) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('quotes')
    .insert({ user_id: user.id, title: formData.get('title') as string })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/quotes')
  return { data }
}
```

## State Management

| 우선순위 | 방식 | 사용 |
|----------|------|------|
| 1 | URL Search Params | 필터, 정렬, 탭 상태 |
| 2 | Server Component props | 데이터 전달 |
| 3 | React useState | 폼 입력, UI 토글 |
| 4 | Context | 테마, 모달 상태 (최소한으로) |

## Loading & Error States

### Loading (Skeleton)

```tsx
// app/(dashboard)/quotes/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  )
}
```

### Error Boundary

```tsx
// app/(dashboard)/quotes/error.tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <p className="text-destructive">{error.message}</p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  )
}
```

### Empty State

```tsx
{quotes.length === 0 && (
  <div className="flex flex-col items-center gap-4 py-12">
    <p className="text-muted-foreground">No quotes yet</p>
    <Button asChild><Link href="/quotes/new">Create First Quote</Link></Button>
  </div>
)}
```

## File Placement Rules

| 파일 유형 | 위치 |
|-----------|------|
| 페이지 | `app/(dashboard)/{feature}/page.tsx` |
| 서버 액션 | `app/actions/{feature}.ts` |
| 도메인 컴포넌트 | `components/{feature}/{Name}.tsx` |
| UI 프리미티브 | `components/ui/` (수정 금지) |
| PDF 템플릿 | `lib/pdf/{feature}-template.tsx` |
| 비즈니스 로직 | `lib/{feature}.ts` |
| 타입 | `types/{feature}.ts` |
| 유틸리티 | `utils/{name}.ts` |
| 커스텀 훅 | `hooks/use{Name}.ts` |
| 상수/설정 | `config/{name}.ts` |

## Forbidden Patterns

1. `components/ui/` 파일 직접 수정
2. `onClick` 핸들러에서 Supabase 직접 호출
3. 인라인 스타일 (`style={{}}`) 사용
4. `any` 타입 사용
5. Puppeteer 사용 (PDF는 React-PDF만)
6. `tsc` 에러 무시
