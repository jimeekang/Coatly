# Feature: Subscription & Billing

## Plans

| | Starter | Pro |
|---|---------|-----|
| 가격 (월) | A$39 | A$59 |
| 가격 (연) | A$450 (A$37.50/mo) | A$680 (A$56.67/mo) |
| 활성 견적 | 월 10건 | 무제한 |
| 사용자 | 1명 | 3명 |
| AI 드래프트 | ❌ | ✅ |
| Xero 연동 | ❌ | ✅ |
| Job Costing | ❌ | ✅ |
| 우선 지원 | ❌ | ✅ |
| 브랜딩 (PDF) | 기본 | 커스텀 |

정의 파일: `config/plans.ts` (단일 소스)

## Feature Gating Logic

```ts
// lib/subscription/access.ts
const FEATURES = {
  starter: { activeQuoteLimit: 10, ai: false, xeroSync: false, jobCosting: false },
  pro:     { activeQuoteLimit: Infinity, ai: true, xeroSync: true, jobCosting: true },
}

canCreateQuote()   → activeQuoteCount < plan.activeQuoteLimit
canUseAI()         → plan === 'pro'
canSyncXero()      → plan === 'pro'
canUseJobCosting() → plan === 'pro'
```

- 견적 생성 시 `activeQuoteLimit` 확인
- Pro 기능 접근 시 `subscription.plan === 'pro'` 확인
- 한도 도달 시 `UpgradePrompt` 컴포넌트 표시

## Stripe Integration Flow

```
1. 사용자 → "Subscribe" 클릭
2. POST /api/stripe/checkout → Stripe Checkout 세션 생성
3. 사용자 → Stripe Checkout 페이지에서 결제
4. Stripe → POST /api/webhooks/stripe (webhook)
5. webhook-handler.ts → subscriptions 테이블 upsert
6. 사용자 → 대시보드로 리다이렉트 (구독 활성)
```

## Upgrade Flow

1. Starter 사용자가 한도 도달 또는 Pro 기능 접근
2. `UpgradePrompt` 컴포넌트 표시
3. "Upgrade to Pro" 클릭 → POST /api/stripe/checkout
4. Stripe Checkout → 결제 → webhook → DB 업데이트
5. 즉시 Pro 기능 활성화

## Webhook Events

| Event | 처리 |
|-------|------|
| `checkout.session.completed` | 신규 subscription 레코드 생성 |
| `customer.subscription.created` | 상태 동기화 |
| `customer.subscription.updated` | 플랜/상태/기간 업데이트 |
| `customer.subscription.deleted` | status = cancelled |
| `invoice.payment_failed` | status = past_due |

**멱등성**: stripe_subscription_id 기준 upsert → 중복 webhook 안전.

## Cancellation & Renewal

**취소:**
```
1. Settings > Billing > "Cancel" 클릭
2. POST /api/stripe/portal → Stripe Customer Portal
3. Portal에서 취소 확인
4. Stripe → webhook: subscription.updated (cancel_at_period_end = true)
5. UI: "구독이 [날짜]에 종료됩니다" + "Renew" 버튼 표시
```

**갱신:**
```
1. "Renew" 클릭
2. POST /api/stripe/renew → cancel_at_period_end = false
3. Stripe → webhook: subscription.updated
4. DB: cancel_at_period_end = false, cancel_at = null
```

## 설계 결정

### 왜 Stripe Customer Portal?

결제 수단 변경, 청구 내역 조회, 취소 등을 Stripe UI에 위임.
직접 구현 대비 PCI 컴플라이언스 부담 제거, 유지보수 최소화.

### 왜 subscriptions 테이블에 INSERT/UPDATE를 service_role만?

구독 상태는 Stripe가 유일한 진실의 원천(source of truth).
클라이언트가 직접 수정하면 Stripe와 DB가 불일치할 위험.
