# Spec: Subscription Plans

> Stripe 연동 구현 상세(Webhook, Checkout 플로우) → [`design-docs/subscription-billing.md`](../design-docs/subscription-billing.md)

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

정의 파일: `config/plans.ts`

## Feature Gating Logic

```ts
// lib/subscription/access.ts
canCreateQuote()   → activeQuoteCount < plan.activeQuoteLimit
canUseAI()         → plan === 'pro'
canSyncXero()      → plan === 'pro'
canUseJobCosting() → plan === 'pro'
```

## Upgrade Flow

1. Starter 사용자가 한도 도달 또는 Pro 기능 접근
2. `UpgradePrompt` 컴포넌트 표시
3. "Upgrade to Pro" 클릭 → POST /api/stripe/checkout
4. Stripe Checkout → 결제 → webhook → DB 업데이트
5. 즉시 Pro 기능 활성화

## 취소 & 갱신

- 취소: Stripe Customer Portal → cancel_at_period_end = true
- 갱신: "Renew" 버튼 → POST /api/stripe/renew
- 기간 만료: subscription.deleted webhook → status = cancelled
