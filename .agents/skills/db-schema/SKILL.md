---
name: db-schema
description: >
  Supabase schema → TypeScript types + RLS policies + Zod validators를 자동 생성.
  "DB 타입 생성해줘", "RLS 정책 추가해줘", "schema 바꿨는데 코드 업데이트해줘",
  "새 테이블 추가해줘" 같은 요청에 반드시 이 skill을 사용할 것.
---

# DB Schema Skill

> **로컬 Supabase 미사용** — 모든 DB 작업은 MCP 도구로 원격 직접 제어.

## MCP Supabase 도구 (유일한 제어 방법)

project_id: `qwjpqujdykojxsisjltd`  
`.env.local`의 API 키로 자동 인증 — CLI 로그인/Docker 불필요.

| 도구 | 용도 |
|------|------|
| `apply_migration(project_id, name, query)` | DDL 실행 + migration 트래킹 기록 |
| `execute_sql(project_id, query)` | 조회/데이터 확인 (migration 기록 안 됨) |
| `list_migrations(project_id)` | 적용된 migration 목록 확인 |
| `generate_typescript_types(project_id)` | 원격 schema → TS 타입 생성 |
| `list_tables(project_id)` | 테이블 목록 확인 |

**주의**: `apply_migration`은 DDL에만 사용. 조회/존재 확인은 `execute_sql` 사용.

## 작업 순서 (agent loop)

1. `execute_sql`로 테이블/컬럼 존재 여부 확인 (중복 적용 방지)
2. `apply_migration(name, query)`으로 DDL 실행 → migration 자동 기록
3. `generate_typescript_types`로 최신 schema 기준 TS 타입 생성
4. `lib/supabase/types.ts` 업데이트
5. `lib/supabase/validators.ts` — Zod schema 업데이트 (insert/update 분리)
6. `npx tsc --noEmit` 실행해서 타입 오류 확인 후 수정

### migration 트래킹 누락 시 (DB에는 있지만 목록에 없는 경우)
```sql
-- execute_sql로 직접 삽입 (재실행 없이 기록만 추가)
insert into supabase_migrations.schema_migrations (version, name)
values ('019', 'migration_name')
on conflict (version) do nothing;
```

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
alter table {table} enable row level security;

create policy "users can only see their own {table}"
  on {table} for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

## 제약
- 절대 `any` 타입 사용 금지
- join 타입은 inline으로 정의 (별도 파일 X)
- migration 적용 전 반드시 `execute_sql`로 테이블/컬럼 존재 여부 확인
- `docs/generated/db-schema.md`는 스냅샷 참조용 — 최신 schema는 `generate_typescript_types`로 직접 가져올 것
