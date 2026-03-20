---
name: db-schema
description: >
  Supabase schema → TypeScript types + RLS policies + Zod validators를 자동 생성.
  "DB 타입 생성해줘", "RLS 정책 추가해줘", "schema 바꿨는데 코드 업데이트해줘",
  "새 테이블 추가해줘" 같은 요청에 반드시 이 skill을 사용할 것.
---

# DB Schema Skill

## 작업 순서 (agent loop)

1. `supabase gen types typescript --local` 실행해서 최신 schema 확인
2. `lib/supabase/types.ts` 파일 생성/업데이트
3. `lib/supabase/validators.ts` — Zod schema 생성 (insert/update 분리)
4. RLS policy SQL 생성 → `supabase/migrations/` 에 파일 저장
5. `npx tsc --noEmit` 실행해서 타입 오류 확인 후 수정

## 출력 규칙

### types.ts 패턴
```ts
// lib/supabase/types.ts
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Insert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type Update<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// 편의 타입 (항상 생성)
export type Quote = Tables<'quotes'>
export type QuoteInsert = Insert<'quotes'>
```

### validators.ts 패턴
```ts
// lib/supabase/validators.ts
import { z } from 'zod'

export const quoteInsertSchema = z.object({
  customer_id: z.string().uuid(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected']),
  valid_until: z.string().datetime().optional(),
})
export type QuoteInsertInput = z.infer<typeof quoteInsertSchema>
```

### RLS 패턴 (모든 테이블 동일)
```sql
-- supabase/migrations/{timestamp}_rls_{table}.sql
alter table {table} enable row level security;

create policy "users can only see their own {table}"
  on {table} for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

## 제약
- `supabase` CLI 없으면 현재 CLAUDE.md의 schema 섹션 기준으로 생성
- 절대 `any` 타입 사용 금지
- join 타입은 inline으로 정의 (별도 파일 X)
