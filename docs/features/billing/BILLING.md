# Feature: Subscription & Billing

## Plans

2026-05-17 v1 pricing decision 기준. 고객에게 보이는 플랜명은 **Basic**과 **Pro**다. 기존 코드나 DB enum이 아직 `starter`를 내부 id로 쓰는 경우에도 v1 AI 화면과 결제 문구에서는 `Basic`으로 표시한다.

| | Basic | Pro |
|---|-------|-----|
| 가격 (월) | A$29 | A$59 |
| 첫 사용자 offer | 없음. 필요 시 launch discount 별도 검토 | 첫 cohort Pro 1개월 무료 trial |
| 취소 정책 | 언제든지 취소 가능 | 언제든지 취소 가능 |
| Quote / Invoice / Customer | 포함 | 포함 |
| PDF quote / public quote link | 포함 | 포함 |
| Price rates setup | 포함 | 포함 |
| Quick quote / manual quote | 포함 | 포함 |
| AI quote draft | 5/month | 25/month |
| Photos per quote | 3 | 5 |
| Monthly photo AI limit | 15 photos/month | 100 photos/month |
| Follow-up Writer | 10/month | 50/month |
| Today Assistant | deterministic task list only | deterministic task list + AI summary |
| Advanced AI scope/clause builder | 제한된 scope draft | 전체 Scope section + pricing candidate + clause review flow |
| Clause library | 기본 clause | 전체 clause library + custom clause 저장 |
| AI usage/cost view | 기본 사용량 표시 | 사용량, photo count, estimated cost 표시 |
| Support | 기본 support | priority support |

정의 파일: `config/plans.ts` (단일 소스)

Note: 코드에 기존 `starter` plan id가 남아 있으면 customer-facing label은 `Basic`으로 바꾼다. v1 AI surface에 "Starter" 문구를 노출하지 않는다.

## Feature Gating Logic

```ts
// lib/subscription/access.ts
const FEATURES = {
  basic: {
    aiQuoteDraftLimit: 5,
    photoAiMonthlyLimit: 15,
    photosPerQuote: 3,
    followUpWriterLimit: 10,
    todayAiSummary: false,
    advancedAiScopeBuilder: false,
  },
  pro: {
    aiQuoteDraftLimit: 25,
    photoAiMonthlyLimit: 100,
    photosPerQuote: 5,
    followUpWriterLimit: 50,
    todayAiSummary: true,
    advancedAiScopeBuilder: true,
  },
}

canUseAIQuoteDraft()    → monthly quote_draft usage < plan.aiQuoteDraftLimit
canUsePhotoAI()         → monthly photo count < plan.photoAiMonthlyLimit
canUseTodayAISummary()  → plan === 'pro' or active Pro trial
canUseFollowUpWriter()  → monthly follow_up_writer usage < plan.followUpWriterLimit
canUseAdvancedBuilder() → plan === 'pro' or active Pro trial
```

- Basic에도 제한된 AI를 제공한다. AI 기능 전체를 Pro 전용으로 숨기지 않는다.
- Pro trial 사용자는 trial 기간 동안 Pro limit을 사용한다.
- AI는 price/rate/GST/total을 만들지 않는다. 모든 금액은 quote canonical calculator가 만든다.
- 한도 도달 또는 Pro-only 기능 접근 시 `UpgradePrompt` 컴포넌트 표시
- `ai_usage_logs`에 feature, provider/model, token/cost, photo count, cache hit, plan/trial state를 기록한다.

## Stripe Integration Flow

```
1. 사용자 → "Start Pro Trial" 또는 "Upgrade to Pro" 클릭
2. POST /api/stripe/checkout → Stripe Checkout 세션 생성
3. Stripe Checkout에서 trial 또는 subscription 시작
4. Stripe → POST /api/webhooks/stripe (webhook)
5. webhook-handler.ts → subscriptions 테이블 upsert
6. 사용자 → 대시보드로 리다이렉트 (trial/구독 활성)
```

## Upgrade Flow

1. Basic 사용자가 한도 도달 또는 Pro 기능 접근
2. `UpgradePrompt` 컴포넌트 표시
3. "Start Pro Trial" 또는 "Upgrade to Pro" 클릭 → POST /api/stripe/checkout
4. Stripe Checkout → trial/subscription 생성 → webhook → DB 업데이트
5. 즉시 Pro 기능 활성화

## Free Pro Trial

첫 cohort에는 Pro 1개월 무료 trial을 제공한다. trial 사용자는 trial 기간 동안 Pro limit을 사용하고, trial 종료 후 A$59/month 결제 전환을 측정한다. 사용자는 언제든지 cancel 가능해야 하며, cancel reason은 별도 metadata 또는 운영 로그에 기록한다.

Readiness 조건:

- quote draft, photo helper, usage log, cost limit, Pro trial state, cancel path가 모두 동작
- `ai_usage_logs`가 provider/model/token/cost/photo count를 기록
- trial 종료일과 current period end를 Settings/Billing에서 명확하게 표시

## Webhook Events

| Event | 처리 |
|-------|------|
| `checkout.session.completed` | 신규 trial/subscription 레코드 생성 |
| `customer.subscription.created` | 상태 동기화 |
| `customer.subscription.updated` | 플랜/상태/기간 업데이트 |
| `customer.subscription.deleted` | status = cancelled |
| `invoice.payment_failed` | status = past_due |

**멱등성**: stripe_subscription_id 기준 upsert → 중복 webhook 안전.

## Trial And Conversion

첫 cohort는 Pro 1개월 무료 trial을 받는다. Trial 종료 후 A$59/month Pro 결제 전환을 측정한다.

| 상태 | 앱 동작 |
|------|---------|
| `trialing` | Pro limit 활성. Billing UI에 trial end date 표시 |
| `active` | Pro limit 활성. current period end 표시 |
| `cancel_at_period_end` | 기간 종료일까지 Pro limit 유지. cancel reason 기록 |
| `cancelled` | Basic 또는 expired state로 downgrade |
| `past_due` | 결제 문제 안내 + grace policy 적용 |

- Trial 시작 전 price_rates setup, 첫 quote smoke test, usage logging, cancel path가 준비되어야 한다.
- 사용자는 언제든지 cancel 가능해야 한다.
- Cancel reason은 trial-to-paid conversion 분석에 필요하므로 기록한다.

## Cancellation & Renewal

**취소:**
```
1. Settings > Billing > "Cancel" 클릭
2. POST /api/stripe/portal → Stripe Customer Portal
3. Portal에서 취소 확인
4. Stripe → webhook: subscription.updated (cancel_at_period_end = true)
5. UI: "구독이 [날짜]에 종료됩니다" + "Renew" 버튼 표시
```

취소 reason은 Stripe portal만으로 충분히 수집되지 않으면 앱 내 lightweight form으로 별도 저장한다.

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

---

## Implementation Patterns

### Webhook Route

```ts
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe'
import { headers } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()  // Raw body for signature verification
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  await handleWebhookEvent(event)
  return new Response('OK', { status: 200 })
}
```

### Event Handling

```ts
async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      // 신규 구독 생성
      break
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await syncSubscription(event.data.object as Stripe.Subscription)
      break
    case 'customer.subscription.deleted':
      // 구독 취소
      break
    case 'invoice.payment_failed':
      // status = past_due
      break
  }
}
```

### Subscription Sync (Idempotent Upsert)

```ts
// lib/stripe/subscription-sync.ts
async function syncSubscription(sub: Stripe.Subscription) {
  const supabaseAdmin = createAdminClient()  // service_role — bypasses RLS

  await supabaseAdmin.from('subscriptions').upsert({
    user_id: sub.metadata.user_id,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    plan: sub.metadata.plan || 'basic',
    status: sub.status,
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
  }, { onConflict: 'user_id' })
}
```

### Key Points

- Raw body 사용 (JSON parse 전) — signature verification 필수
- Admin client (service_role) 사용 — `subscriptions`에 RLS INSERT 정책 없음
- Upsert on `user_id` — 멱등성 보장 (중복 webhook 안전)
- Stripe 자동 재시도: 실패 시 최대 3일

## Related Docs

- [../ai/PHASE0-CHECKLIST.md](../ai/PHASE0-CHECKLIST.md) — Basic/Pro pricing decision, Pro trial policy, cost economics
- [../ai/V1-APP-BUILD-PLAN.md](../ai/V1-APP-BUILD-PLAN.md) — plan/trial gating build tasks
- [../ai/V1-TASK1-RATE-SOURCE-AUDIT.md](../ai/V1-TASK1-RATE-SOURCE-AUDIT.md) — quote total parity before trial
