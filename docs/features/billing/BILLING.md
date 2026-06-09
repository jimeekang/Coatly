# Feature: Subscription & Billing

## Plans

2026-06-03 product reframe 기준. v1은 AI Quote Writer가 아니라 **Excel quote workflow replacement**다. 따라서 plan value도 AI 사용량이 아니라 quote workflow 사용량과 운영 자동화 기준으로 본다.

현재 코드 기준 customer-facing plan은 `Starter`와 `Pro`다.

| | Starter | Pro |
|---|---------|-----|
| 가격 (월) | A$39 | A$59 |
| 가격 (연) | A$450 | A$680 |
| 대상 | sole trader / 낮은 quote volume | 전업 painter / growing small team |
| Active quotes | 월 10 active quotes | unlimited quotes |
| Quote / Invoice / Customer | 포함 | 포함 |
| PDF quote / public quote link | 포함 | 포함 |
| Price rates setup | 포함 | 포함 |
| Quick quote / manual quote | 포함 | 포함 |
| Quote templates | 5개 | unlimited |
| Email send | 포함 | 포함 |
| Follow-up status/reminder | 기본 | 고급 workflow automation 검토 |
| Branding | 기본 | 확장 branding |
| Support | 기본 | priority support |

이전 Basic A$29 + AI limits 정책은 AI-first plan 가정이므로 superseded 상태다. A의 workflow recreation과 경쟁 가격(QuoteMate/WonDeal A$29, ServiceM8 Starter A$29 등)을 바탕으로 별도 pricing review를 진행한다.

정의 파일: `config/plans.ts` (현재 구현 단일 소스)

## Feature Gating Logic

Core workflow gating은 아래 기준을 우선한다.

```ts
starter:
  maxActiveQuotesPerMonth = 10
  quoteTemplates = 5
  coreQuoteWorkflow = true

pro:
  maxActiveQuotesPerMonth = null
  quoteTemplates = unlimited
  coreQuoteWorkflow = true
  workflowAutomation = expanded
```

AI gating은 core workflow release 이후 새 plan에서 다시 정의한다. 현재 v1 release gate에는 포함하지 않는다.

## Stripe Integration Flow

```
1. 사용자 → "Upgrade to Pro" 클릭
2. POST /api/stripe/checkout → Stripe Checkout 세션 생성
3. Stripe Checkout에서 subscription 시작
4. Stripe → POST /api/webhooks/stripe (webhook)
5. webhook-handler.ts → subscriptions 테이블 upsert
6. 사용자 → 대시보드로 리다이렉트 (구독 활성)
```

## Upgrade Flow

1. Starter 사용자가 active quote/template 한도 도달 또는 Pro 기능 접근
2. `UpgradePrompt` 컴포넌트 표시
3. "Upgrade to Pro" 클릭 → POST `/api/stripe/checkout`
4. Stripe Checkout → subscription 생성 → webhook → DB 업데이트
5. 즉시 Pro 기능 활성화

## AI / Trial Note

Free Pro Trial, AI usage limits, photo AI limits, AI cost view는 post-core AI planning으로 보류한다.

재개 조건:

- A의 실제 workflow가 Coatly에서 재현됨
- quote/PDF/email/follow-up/invoice/schedule release gate 통과
- production release verified
- AI admin layer plan approved

## Webhook Events

| Event | 처리 |
|-------|------|
| `checkout.session.completed` | 신규 subscription 레코드 생성 |
| `customer.subscription.created` | 상태 동기화 |
| `customer.subscription.updated` | 플랜/상태/기간 업데이트 |
| `customer.subscription.deleted` | status = cancelled |
| `invoice.payment_failed` | status = past_due |

**멱등성**: stripe_subscription_id 기준 upsert → 중복 webhook 안전.

## Subscription States

| 상태 | 앱 동작 |
|------|---------|
| `active` | plan 기능 활성. current period end 표시 |
| `cancel_at_period_end` | 기간 종료일까지 plan 기능 유지. cancel reason 기록 검토 |
| `cancelled` | Starter 또는 expired state로 downgrade |
| `past_due` | 결제 문제 안내 + grace policy 적용 |

## Cancellation & Renewal

**취소:**

```text
1. Settings > Billing > "Cancel" 클릭
2. POST /api/stripe/portal → Stripe Customer Portal
3. Portal에서 취소 확인
4. Stripe → webhook: subscription.updated (cancel_at_period_end = true)
5. UI: "구독이 [날짜]에 종료됩니다" + "Renew" 버튼 표시
```

취소 reason은 Stripe portal만으로 충분히 수집되지 않으면 앱 내 lightweight form으로 별도 저장한다.

**갱신:**

```text
1. "Renew" 클릭
2. POST /api/stripe/renew → cancel_at_period_end = false
3. Stripe → webhook: subscription.updated
4. DB: cancel_at_period_end = false, cancel_at = null
```

## 설계 결정

### 왜 Stripe Customer Portal?

결제 수단 변경, 청구 내역 조회, 취소 등을 Stripe UI에 위임한다. 직접 구현 대비 PCI 컴플라이언스 부담을 줄이고 유지보수를 최소화한다.

### 왜 subscriptions 테이블에 INSERT/UPDATE를 service_role만?

구독 상태는 Stripe가 유일한 진실의 원천(source of truth)이다. 클라이언트가 직접 수정하면 Stripe와 DB가 불일치할 위험이 있다.

## Related Docs

- [../../PLANS.md](../../PLANS.md) — current progress and release gate
- [../ai/V1-PLAN.md](../ai/V1-PLAN.md) — workflow-first v1 plan
- [../ai/V1-APP-BUILD-PLAN.md](../ai/V1-APP-BUILD-PLAN.md) — build order before AI
