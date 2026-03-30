# Design Doc: Subscription & Billing

## Overview

Stripe를 통한 구독 관리. Checkout → Webhook → DB 동기화.

## Plans

| Plan | Monthly | Annual | 핵심 제한 |
|------|---------|--------|-----------|
| Starter | A$39/mo | A$450/yr | 월 10건 활성 견적, 1 user |
| Pro | A$59/mo | A$680/yr | 무제한 견적, 3 users, AI, Xero |

정의: `config/plans.ts`

## Feature Gating

```ts
// lib/subscription/access.ts
const FEATURES = {
  starter: { activeQuoteLimit: 10, ai: false, xeroSync: false, jobCosting: false },
  pro:     { activeQuoteLimit: Infinity, ai: true, xeroSync: true, jobCosting: true },
}
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

## Webhook Events

| Event | 처리 |
|-------|------|
| `checkout.session.completed` | 신규 subscription 레코드 생성 |
| `customer.subscription.created` | 상태 동기화 |
| `customer.subscription.updated` | 플랜/상태/기간 업데이트 |
| `customer.subscription.deleted` | status = cancelled |
| `invoice.payment_failed` | status = past_due |

**멱등성**: stripe_subscription_id 기준 upsert → 중복 webhook 안전.

## Cancellation Flow

```
1. 사용자 → Settings > Billing > "Cancel" 클릭
2. POST /api/stripe/portal → Stripe Customer Portal
3. 사용자 → Portal에서 취소 확인
4. Stripe → webhook: subscription.updated (cancel_at_period_end = true)
5. DB: cancel_at_period_end = true, cancel_at = period_end
6. UI: "구독이 [날짜]에 종료됩니다" + "Renew" 버튼 표시
```

### 취소 철회

```
1. 사용자 → "Renew" 클릭
2. POST /api/stripe/renew → Stripe API에서 cancel_at_period_end = false
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
