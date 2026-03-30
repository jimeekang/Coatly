# Coatly — Reliability & Recovery

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
2. `webhook-handler.ts`는 멱등성(idempotency) 보장:
   - subscription ID 기준 upsert (중복 처리 안전)
3. 수동 복구: Stripe Dashboard → Events → 재전송

### 처리 이벤트

| Event | 처리 |
|-------|------|
| `checkout.session.completed` | 구독 레코드 생성 |
| `customer.subscription.created` | 구독 상태 동기화 |
| `customer.subscription.updated` | 플랜/상태 업데이트 |
| `customer.subscription.deleted` | 구독 취소 처리 |
| `invoice.payment_failed` | 결제 실패 상태 기록 |

## Database Migration Recovery

### 안전한 마이그레이션 원칙

1. **Forward-only**: 롤백보다 새 마이그레이션으로 수정
2. **Non-destructive**: `DROP` 대신 `ALTER`, soft delete 활용
3. **순서 보장**: 파일명 번호순 (001, 002, ...)

### 마이그레이션 실패 시

```bash
# 1. 로컬에서 먼저 테스트
supabase db reset  # 로컬 DB 초기화 + 전체 마이그레이션 재실행

# 2. 문제 마이그레이션 수정 후
supabase db push   # 리모트에 적용

# 3. 타입 재생성
supabase gen types typescript --local > types/database.ts
```

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

| 영역 | 도구 | 용도 |
|------|------|------|
| Error Tracking | Vercel Analytics / Sentry | 런타임 에러 추적 |
| Performance | Vercel Speed Insights | Core Web Vitals |
| Uptime | Vercel Status | 배포 상태 |
| Billing | Stripe Dashboard | 결제 상태, 실패 이벤트 |
