# Coatly — Security

## RLS (Row Level Security) Policy Matrix

모든 테이블에 RLS가 활성화되어 있으며, 클라이언트는 자신의 데이터에만 접근 가능하다.

### Direct Ownership Tables

`user_id = auth.uid()` 직접 비교.

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | ✅ own | ✅ own + trigger | ✅ own | ❌ |
| customers | ✅ own | ✅ own | ✅ own | ✅ own |
| quotes | ✅ own | ✅ own | ✅ own | ✅ own |
| invoices | ✅ own | ✅ own | ✅ own | ✅ own |
| subscriptions | ✅ own | ❌ (service_role only) | ❌ (service_role only) | ❌ |

### Parent-Chain Tables

user_id 컬럼 없음 — 부모 테이블 EXISTS 서브쿼리로 소유권 확인.

| Table | Parent Chain | 정책 |
|-------|-------------|------|
| quote_rooms | → quotes.user_id | EXISTS (quotes WHERE id = quote_id AND user_id = auth.uid()) |
| quote_room_surfaces | → quote_rooms → quotes.user_id | EXISTS chain |
| invoice_line_items | → invoices.user_id | EXISTS (invoices WHERE id = invoice_id AND user_id = auth.uid()) |

## Authentication Flow

```
사용자 요청
    │
    ├── middleware.ts (Supabase Auth 세션 확인)
    │   ├── /login, /signup → 로그인 상태면 /dashboard 리다이렉트
    │   └── /dashboard/* → 미로그인 시 /login 리다이렉트
    │                       로그인 + onboarding 미완료 → /onboarding
    │
    ├── Server Component
    │   └── supabase.auth.getUser() → 실패 시 redirect('/login')
    │
    └── Server Action / API Route
        └── supabase.auth.getUser() → 실패 시 { error: 'Unauthorized' }
```

## Admin Client 격리

```ts
// lib/supabase/admin.ts
import 'server-only'  // 클라이언트 번들에 포함 방지

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // RLS 우회
)
```

**사용처 제한:**
- Stripe webhook handler (구독 상태 동기화)
- 번호 생성 함수 (quote_number, invoice_number)
- 그 외 사용 금지

## Webhook Security

### Stripe Webhook 서명 검증

```ts
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET!
)
```

- 서명 불일치 시 400 반환
- Raw body 사용 (JSON parse 전)

## Environment Variables

### 노출 금지 (서버 전용)

| 변수 | 용도 |
|------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | RLS 우회 — 서버에서만 사용 |
| `STRIPE_SECRET_KEY` | Stripe API 호출 |
| `STRIPE_WEBHOOK_SECRET` | 웹훅 서명 검증 |
| `ABR_GUID` | ABN 조회 API 인증 |

### 공개 가능 (NEXT_PUBLIC_)

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 (RLS로 보호) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 결제 UI |
| `NEXT_PUBLIC_APP_URL` | 앱 기본 URL |

## Security Checklist

배포 전 `/quality` 커맨드가 검증하는 보안 항목:

- [ ] 모든 테이블에 RLS 활성화
- [ ] user_id 필터 누락 없음
- [ ] Admin client 사용처가 webhook/번호생성으로 제한
- [ ] 환경변수 하드코딩 없음
- [ ] .env 파일 .gitignore에 포함
- [ ] Stripe webhook signature 검증
- [ ] Server Action에서 auth 체크
- [ ] API route에서 auth 체크
- [ ] `server-only` import guard 적용 (admin.ts)
