# Feature: Quote Builder

## Goal

페인터가 현장에서 빠르게 견적을 만들고, 고객에게 PDF/공개 링크로 보내고, 승인 이후 invoice/job으로 이어지게 합니다.

## Current Status

| 영역 | 상태 | 구현 근거 |
|------|------|-----------|
| Quote CRUD | 구현됨 | `app/actions/quotes.ts`, `app/(dashboard)/quotes/*` |
| Room/surface 견적 | 구현됨 | `QuoteForm`, `quote_rooms`, `quote_room_surfaces` |
| Quick/Detailed estimate | 구현됨 | `QuickQuoteBuilder`, `QuickEstimateBuilder`, migration 041–042 |
| Exterior estimate | 구현됨, 감사 항목 남음 | `ExteriorEstimateBuilder`, audit 참고 |
| Rate settings | 구현됨 | `PriceRatesForm`, `lib/rate-settings.ts` |
| Material/service line items | 구현됨 | `material_items`, `quote_line_items` |
| Quote templates | 구현됨 | `quote_templates`, `TemplatePicker` |
| AI quote drafting | 구현됨 | `AIDraftPanel`, `generateAIDraft()` |
| PDF | 구현됨 | `app/api/pdf/quote/route.ts`, `lib/pdf/quote-template.tsx` |
| Email send | 구현됨 | Resend quote email, status `sent` |
| Public approval | 구현됨 | `/q/[token]`, signature, approve/reject |
| Public booking | 구현됨 | approved quote → job booking |
| Quote → invoice | 구현됨 | invoice quote option/line item 흐름 |

## Quote Modes

| Mode | 용도 | 핵심 데이터 |
|------|------|-------------|
| Detailed room/surface | 방별 벽/천장/트림 상세 견적 | `quote_rooms`, `quote_room_surfaces` |
| Quick estimate | 현장 빠른 방/크기/표면 matrix | `quote_estimate_items`, `pricing_snapshot` |
| Average property preset | 2 bed 2 bath apartment 같은 평균 interior anchor | `pricing_method_inputs`, `quote_estimate_items`, rate snapshot |
| Day rate | 일수 × 일당 + 자재 | `pricing_method_inputs` |
| Manual | 직접 금액 입력 | manual line items |
| Exterior | 외부 작업 카테고리 | `estimate_category = exterior` |

## Data Model

| 테이블/필드 | 역할 |
|-------------|------|
| `quotes` | 번호, 고객, 상태, 유효기간, margins, totals, public token |
| `quote_rooms` | 방 이름/종류/치수 |
| `quote_room_surfaces` | 표면별 면적, coating, rate, material/labour cost |
| `quote_estimate_items` | quick/detailed estimate snapshot |
| `quote_line_items` | 자재/서비스/custom line item |
| `quote_templates` | 반복 견적 재사용 |
| `public_quote_events` | 공개 링크 접근/승인/거절 감사 |

## Status Workflow

```text
draft -> sent -> approved -> booked/job/invoice
             -> rejected
             -> expired
```

## Pricing Rules

- 모든 금액은 cents 정수입니다.
- GST는 10% 기준으로 계산합니다.
- Labour/material margin은 별도 percent로 저장합니다.
- Quick estimate는 저장 시 authoritative snapshot을 남겨 이후 단가 변경에 흔들리지 않게 합니다.
- Basic은 제한된 AI/usage limit을 적용하고 Pro는 full AI Quote Form Builder와 높은 usage limit을 제공합니다.
- Room anchor를 선택해도 walls/ceiling/trim/doors/windows는 quote 안에서 개별 선택 가능해야 합니다.
- Average property preset과 room anchor는 같은 base subtotal 안에서 중복으로 더하지 않습니다.
- Prep, access, paint upgrade, travel, scaffold 같은 add-on은 이미 포함된 scope와 겹칠 때 block 또는 warning이 필요합니다.

## UX Rules

- Quote 생성 첫 화면에서 AI draft, template, manual form을 사용할 수 있습니다.
- AI draft는 plan-aware입니다. Basic은 제한된 notes-based AI, Pro/Pro trial은 full AI Quote Form Builder를 사용하며, 사용자는 저장 전 반드시 폼을 검토합니다.
- Quote CTA는 `+ New Quote` 패턴을 사용합니다.
- Public quote는 고객이 optional item, PDF, 승인/거절, 예약 날짜를 볼 수 있어야 합니다.

## Planned Price Rates Expansion

v1 pricing foundation은 세션 `019e32de-aaa3-7940-aaa6-9c773d3ec251`의 Rate Library + Modifiers 방향을 따른다.

| 그룹 | 필요한 항목 |
|------|-------------|
| Average Property Prices | Apartment 1 bed 1 bath, Apartment 2 bed 1 bath, Apartment 2 bed 2 bath, Apartment 3 bed 2 bath, House 3 bed 2 bath, House 4 bed 2 bath |
| Room Prices | Bedroom, bathroom, living, hallway, stairwell 등 full repaint price + walls-only/ceiling-only/trim-only % |
| Base Surface Rates | interior walls/ceiling `/sqm`, trim/skirting `/lm`, doors/windows `/each`, exterior surfaces |
| Prep & Repairs | patching, cracks, sanding, caulking, mould, stain/tannin block, oil-to-water prep |
| Access & Complexity | high ceiling, stairwell, furnished/occupied, poor access, second-storey/ladder, scaffold |
| Paint Systems | 1 coat refresh, 2 coat repaint, new plaster 3 coats, wet-area paint, premium washable, enamel, exterior full system |
| Business Rules | minimum job/room, callout/travel, material markup, target daily earning warning |

## Completed Acceptance Criteria

- [x] 견적 번호 자동 채번
- [x] 방별 면적/표면 기반 계산
- [x] GST 10% 계산
- [x] AUD 포맷 표시
- [x] PDF 비즈니스 브랜딩
- [x] Basic/legacy Starter 월간 active quote 제한
- [x] 유효기간 필드
- [x] quick/detailed estimate snapshot
- [x] material/service line items
- [x] quote email send
- [x] public approve/reject/signature
- [x] approved quote booking
- [x] quote templates
- [x] AI draft panel 노출

## Active Risks / Next Work

| 우선순위 | 항목 | 내용 |
|----------|------|------|
| P0 | 저장 원자성 | quote + rooms + surfaces + line items 저장을 transaction/RPC로 묶는 방향 검토 |
| P1 | Exterior edit safety | 편집 시 exterior snapshot 손실 여부 회귀 테스트 강화 |
| P1 | Exterior PDF/detail | 모든 exterior cost/line item이 상세/PDF에 일관 렌더되는지 검증 |
| P1 | Rate library expansion | Average Property Prices, Room Prices surface split, Prep/Access modifiers 구현 필요 |
| P1 | Public audit | public token 접근/오류/승인 이벤트 운영 조회 강화 |
| P2 | Read receipt | 고객 링크 열람/다운로드 이벤트를 영업 후속 조치에 활용 |
| P2 | Smart pricing | 히스토리 기반 가격 제안은 아직 미구현 |

## Non-Goals

- GPS tracking
- Supplier integrations
- Native mobile app
- Multi-language

## Test Focus

- `app/actions/quotes.test.ts`
- `components/quotes/*test.tsx`
- `app/api/pdf/quote/route.test.ts`
- `components/quotes/public/*test.tsx`
