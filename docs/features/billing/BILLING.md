# Feature: Subscription & Billing

> Owner: **Shared** — 기획 판단: Claude(Opus 4.8·extra) · 구현 사실: Codex(high).

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

### 정책 모순 — Pro 판매 카피가 보류된 AI 기능을 노출 (AUDIT A11)

`config/plans.ts:50-51`의 Pro `features` 배열에 `AI Quote Drafting`과 `AI Workspace Assistant`가 판매 카피로 들어가 있다. 그러나 AI(Qwen)는 `QWEN_API_KEY` env-gated dormant 상태이고, AI gating은 core workflow release 이후로 보류(dormant)된 항목이다. 즉 **판매 카피와 실제 활성 기능이 불일치**한다. 조치:

- Pro `features`에서 두 AI 항목을 workflow-first 가치 카피(예: 고급 follow-up/workflow automation, 확장 branding, priority support)로 교체
- `AIDraftPanel` 등 AI 진입점은 gating 처리해 dormant 상태에서 노출되지 않도록 유지

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
4. Stripe → webhook POST (아래 라우트 중복 주의)
5. lib/stripe/webhook-handler.ts → subscriptions 테이블 upsert
6. 사용자 → 대시보드로 리다이렉트 (구독 활성)
```

**webhook 라우트 중복 (AUDIT A10):** 현재 두 라우트가 공존한다 — `app/api/webhooks/stripe/route.ts`와 `app/api/stripe/webhook/route.ts`. 둘 다 `handleStripeWebhook`(`lib/stripe/webhook-handler.ts`)로 위임하는 얇은 wrapper라 동작은 동일하지만, Stripe dashboard endpoint 설정이 어느 쪽을 가리키는지 모호하고 유지보수 표면이 갈린다. 단일 정본 라우트로 통합 필요.

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
| `invoice.payment_failed` | **미구현 no-op** — `console.warn`만, `past_due` 미기록 |

**멱등성 (AUDIT A10 — 현행 실제 상태):**

- **event-level 멱등성 미구현** — 처리한 Stripe event id를 기록·중복 차단하는 저장소가 없다. Stripe가 같은 event를 재전송하면 subscription upsert가 반복 실행된다. subscription upsert 자체는 `stripe_subscription_id` 기준이라 최종 상태는 수렴하지만, `invoice.payment_failed` 같은 부수효과성 event에는 event-level 중복 방어가 없다.
- **`invoice.payment_failed`는 no-op** — 위 표의 "status = past_due"는 목표 동작이며, 현재 핸들러(`lib/stripe/webhook-handler.ts:83-86`)는 `console.warn`만 하고 `subscriptions.status`를 갱신하지 않는다. past_due grace policy가 실제로 트리거되지 않는다.
- 조치: 처리된 event id 저장 + `payment_failed` → `past_due` 반영 + 라우트 단일화(위 참조).

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
