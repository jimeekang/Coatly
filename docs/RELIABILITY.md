# Coatly — Reliability & Recovery

> Owner: **Codex** (high) — 구현/DB/보안/배포/git 문서. 기획·디자인 결정은 Claude(Opus 4.8·extra) 영역.

## Error Handling Strategy

### 계층별 에러 처리

```
Layer 1: Page-level error.tsx     → 전체 페이지 에러 fallback
Layer 2: Component ErrorBoundary  → 섹션별 격리
Layer 3: Server Action try/catch  → 액션별 에러 반환
Layer 4: API route try/catch      → HTTP 에러 응답
```

### Server Action 에러 패턴

```ts
export async function createQuote(formData: FormData) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data, error } = await supabase.from('quotes').insert({...}).select().single()
    if (error) return { error: error.message }

    revalidatePath('/quotes')
    return { data }
  } catch (e) {
    return { error: 'Unexpected error occurred' }
  }
}
```

### API Route 에러 패턴

```ts
export async function POST(req: Request) {
  try {
    // ... logic
    return NextResponse.json({ data })
  } catch (error) {
    console.error('[API Error]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Stripe Webhook Recovery

Stripe webhook 실패 시 자동 재시도 메커니즘:

1. Stripe는 실패한 webhook을 최대 **3일간 자동 재시도**
2. `webhook-handler.ts`는 subscription ID 기준 upsert로 **상태 동기화**를 안전하게 처리:
   - 단 이는 상태 동기화일 뿐 event-level 멱등성이 아니다. `event.id` 중복 방어는 미구현(AUDIT A10)이므로 non-idempotent 부수효과(예: 이메일 발송, 카운터 증가)는 재전송 시 중복될 수 있다.
3. 수동 복구: Stripe Dashboard → Events → 재전송

### 처리 이벤트

| Event | 처리 |
|-------|------|
| `checkout.session.completed` | 구독 레코드 생성 |
| `customer.subscription.created` | 구독 상태 동기화 |
| `customer.subscription.updated` | 플랜/상태 업데이트 |
| `customer.subscription.deleted` | 구독 취소 처리 |
| `invoice.payment_failed` | 현재 no-op — `console.warn`만 하고 subscription 상태를 `past_due`로 반영하지 않음(AUDIT A10, 매출 누수). 상태 동기화 구현 예정 |

## Database Migration Recovery

### 안전한 마이그레이션 원칙

1. **Forward-only**: 롤백보다 새 마이그레이션으로 수정
2. **Non-destructive**: `DROP` 대신 `ALTER`, soft delete 활용
3. **순서 보장**: 파일명 번호순 (001, 002, ...)

### 마이그레이션 실패 시

로컬 Docker/Supabase CLI에 의존하지 않는다. CLAUDE.md 원칙대로 원격 Supabase MCP 도구를 사용한다:

1. **보정 마이그레이션 작성**: 되돌리기 대신 새 forward-only 마이그레이션으로 수정하고 `apply_migration`으로 원격에 적용한다.
2. **적용 상태 검증**: `execute_sql`로 스키마/제약/데이터 상태를 확인한다.
3. **타입 재생성**: `generate_typescript_types`로 `types/database.ts`를 갱신한다.

migration history와 로컬 timestamped 파일명이 어긋난 경우는 SECURITY.md의 migration bookkeeping 항목을 따라 정리한다.

## Vercel Deployment Recovery

### 배포 실패 시

1. Vercel Dashboard → Deployments → 이전 성공 빌드 확인
2. "Promote to Production" 클릭으로 이전 버전 복원
3. 또는 CLI: `vercel rollback`

### 환경변수 관련 실패

필수 환경변수 목록:

| 변수 | 필수 | 용도 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase 공개 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase 서비스 롤 키 |
| `STRIPE_SECRET_KEY` | ✅ | Stripe API 키 |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe 웹훅 서명 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe 공개 키 |
| `ABR_GUID` | ✅ | ABN 조회 API 키 |
| `NEXT_PUBLIC_APP_URL` | ✅ | 앱 기본 URL |

## Branch Strategy

```
main (production)
  └── feature/xxx (기능 개발)
        └── PR → main (리뷰 후 머지)
```

### 규칙

- `main`에 직접 push 최소화 — PR 통해 머지 권장
- force push 금지 (`main` 브랜치)
- `.env` 파일 커밋 금지
- quality PASS 없이 release 금지

## Monitoring (Phase 2+)

현재 관측성은 `console.*` 로그뿐이며 Sentry는 미도입(AUDIT A12) — 도입 예정. 아래는 목표 상태다.

| 영역 | 도구 | 용도 |
|------|------|------|
| Error Tracking | Vercel Analytics / Sentry (미도입) | 런타임 에러 추적 |
| Performance | Vercel Speed Insights | Core Web Vitals |
| Uptime | Vercel Status | 배포 상태 |
| Billing | Stripe Dashboard | 결제 상태, 실패 이벤트 |
