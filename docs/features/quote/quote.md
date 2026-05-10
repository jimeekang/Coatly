# Feature: Quote Builder

견적 빌더 통합 문서. 데이터 모델 → 두 가지 견적 모드 → Detailed Estimate Quick/Advanced → Rate Settings → Close the Loop (send/accept/invoice) 순서.

---

## 1. User Stories

> 페인터로서, 현장에서 방별로 면적을 입력하면 자동으로 가격이 계산되고, 전문적인 PDF 견적서를 고객에게 보내고 싶다.

> 페인터로서, 집 타입과 방 수만 입력하면 내부 도색 견적가를 빠르게 뽑고 싶다.

---

## 2. 두 가지 견적 모드

### 2.1 Interior Estimate Builder (전체 집 견적)

1. 물건 유형 선택: Apartment (studio ~ 3bed) / House (1~3 storey)
2. 견적 모드 선택: 전체 집(`entire_property`) / 특정 구역(`specific_areas`)
3. 각 방별 scope 선택: 벽(walls), 천장(ceiling), 트림(trim)
4. 도어/윈도우 상세: 종류(standard/flush/panelled 등) × 범위(door_and_frame/door_only/frame_only)
5. 페인트 시스템 선택: 트림 — Oil Base / Water Base, 벽/천장 — Standard 2-coat / New Plaster 3-coat
6. 벽 상태(Condition): Excellent / Fair / Poor
7. 가격 자동 계산 → 견적서 저장

### 2.2 Quick Quote Builder (간편 현장 견적)

1. 방 추가: 방 이름 + 타입(Master Bedroom, Living Room 등) 선택
2. 방별 입력:
   - 크기: Small / Medium / Large
   - 상태: Good / Normal / Poor
   - scope 토글: walls / ceiling / trim
   - trim 포함 시: 도어 수/종류/범위, 윈도우 수/종류/범위, 스커팅 보드 여부
3. 페인트 시스템: 방별 트림 페인트 선택 (Oil / Water base)
4. 가격 자동 계산 → 견적서 저장

---

## 3. Data Model

```
Quote (견적서)
  ├── QuoteRoom (방/구역) × N
  │     ├── name: "Living Room"
  │     ├── room_type: interior | exterior
  │     ├── dimensions: length × width × height(m)
  │     └── QuoteRoomSurface (도색 면) × N
  │           ├── surface_type: walls | ceiling | trim | doors | ...
  │           ├── area_sqm: 자동 계산 or 수동 입력
  │           ├── coating_type: refresh_1coat | repaint_2coat | ...
  │           ├── complexity: standard | moderate | complex
  │           ├── rate_per_sqm_cents: 단가 (base × complexity multiplier)
  │           ├── material_cost_cents, labour_cost_cents
  │           └── paint_litres_needed: 필요 도료량
  └── Totals
        ├── subtotal_cents (GST 제외)
        ├── gst_cents (= subtotal × 10%)
        └── total_cents
```

### 가격 티어 (Complexity)

| Complexity | 의미 | Labour multiplier |
|------------|------|-------------------|
| Standard | 일반 조건 (쉬운 접근, 양호한 표면) | 1.0× (기준) |
| Moderate | 일부 어려움 (2층, 소규모 prep, 좁은 공간) | 1.25× |
| Complex | 난이도 높음 (비계, 대규모 prep, 헤리티지, 고천장) | 1.5× |

`config/paint-rates.ts`에 면 종류 × 코팅 방식별 기본 단가 정의. Complexity는 labour cost에만 적용.

### 상태 워크플로우

```
draft → sent → approved
                 ↓
              rejected
                 ↓
              expired (valid_until 지나면 자동)
```

### 핵심 계산 로직

위치: `lib/quotes.ts`, `utils/calculations.ts`

```ts
// 면적 자동 계산 (벽)
wallArea = 2 × (length + width) × height

// GST
gst_cents = Math.round(subtotal_cents * 0.1)

// 합계
total_cents = subtotal_cents + gst_cents
```

---

## 4. Detailed Estimate — Quick / Advanced 통합 계획

*최종 판단: 2026-05-07 / Approach A (Product Consolidation, Keep Current Foundation)*

### 4.1 Problem

New Quote가 견적 방법을 노출하는 방식이 모호하다. 페인터의 실제 결정은 "Detailed Estimate vs Room Flat Rate"가 아니라:

- **Quick**: 방, 크기, 벽/천장/트림, 코팅, 컨디션 선택
- **Advanced**: sqm 기반 상세 룸/면 측정

Room Flat Rate는 신규 견적의 일급 옵션이 아니어야 한다. 방 기반 가격 책정 부분만 Detailed Estimate Quick 안으로 흡수한다.

### 4.2 현재 구현 분석

브랜치에 이미 다음 기반이 있다.
- `types/quote.ts` — `PricingMethod = ... | 'detailed_quick'`
- `lib/rate-settings.ts` — `quick_estimate` 설정 (rooms, surface prices, coating multipliers, condition multipliers)
- `utils/calculations.ts` — `calculateQuickEstimate()`
- `components/rates/QuickEstimateTab.tsx` — Price Rates UI
- `components/quotes/QuickEstimateBuilder.tsx` — 방 선택, 크기, 코팅, 컨디션
- `app/actions/quotes.ts` — 서버 측 `detailed_quick` 재계산
- `supabase/migrations/041_detailed_quick_estimate.sql` — `detailed_quick` 메타데이터 컬럼

미해결 이슈:
1. **제품 framing 분리** — Quote UI가 "Quick estimate"와 "Detailed estimate"를 형제로 보여줌. 원하는 모델은 "Detailed Estimate" 하나에 Quick/Advanced 모드.
2. **Price Rates 라벨 정합성** — Quick Estimate = Detailed Quick의 룸 기반 설정, Advanced = sqm/anchor 기반.
3. **서버 스냅샷 일관성 버그** — `calculateQuickEstimate()`는 Price Rates 기준으로 계산하지만 `quote_estimate_items`는 `resolvedPricingInputs.inputs.rooms`(원본 클라이언트 입력)를 저장. Price Rates 변경 후 또는 multiplier 재계산 후 row와 quote subtotal이 어긋난다.
4. **Advanced 0 입력 시 비-0 합계** — `createEmptyInteriorEstimateState()`가 placeholder 룸을 만들고 `buildAdvancedEstimatePayload()`가 빈 룸을 anchor 가격(`Living Room median × 0.80 × 1.15 = $2,438.00 → $2,681.80 inc GST`)으로 변환.
5. **테스트 미흡** — 기존 `PriceRatesForm.test.tsx`가 옛 분리 구조를 기대.

### 4.3 Premises

1. Detailed Estimate는 신규 견적의 유일한 룸/면 기반 진입점. Quick과 Advanced는 그 안의 모드.
2. Room Flat Rate은 레거시. 기존 `room_rate` 견적은 로드 가능, 신규 견적에는 노출 X.
3. Price Rates가 가격 기본값 소유. Quote 생성은 그 기본값을 소비하고 스냅샷 저장만 한다.
4. Quick은 룸 면 가격을 직접 사용. 룸 타입 + 크기 → walls/ceiling/trim base cents. 코팅·컨디션 multiplier는 견적 전체에 적용.
5. Advanced는 기존 sqm/anchor 엔진을 그대로 사용.
6. **Advanced 빈 입력 ≠ 가격**. placeholder 룸은 가격 계산에 진입하지 않음. 사용자가 명시적으로 입력해야 가격이 나온다.

### 4.4 Target UX

**New Quote — Pricing Method 카드:**
- Detailed Estimate
- Labour × Days
- Direct Input

**Detailed Estimate 선택 시:** Quick / Advanced 모드 셀렉터 노출.
- 신규 견적 기본값: Quick
- 기존 Advanced 견적 편집 시: Advanced 기본값
- Exterior는 Advanced 또는 Detailed Estimate 안의 scope 토글

**Quick flow:**
1. **Coating**: 1-coat refresh / 2-coat repaint (baseline) / 3-coat new plaster
2. **Rooms**: Price Rates 룸 템플릿에서 선택 (Master Bedroom with/without ensuite 분리), 크기 S/M/L, walls/ceiling/trim, 같은 룸 여러 번 가능, 룸 노트 허용
3. **Condition**: Good / Average (baseline) / Poor
4. **Review**: 룸별 base, multiplier, subtotal, GST, total

**Price Rates — Detailed Estimate 탭:**
- Quick setup: 룸 템플릿, 크기 × 면 가격, 코팅 multiplier, 컨디션 multiplier
- Advanced setup: 상세 anchors, walls/ceiling sqm rates, trim rates, doors, windows, exterior rates

Room Flat Rate Presets는 메인 UI에서 숨김. JSON은 보존(레거시 fallback + Quick estimate hydration).

### 4.5 Pricing Rules

```text
base =
  selected walls ? walls_cents : 0
+ selected ceiling ? ceiling_cents : 0
+ selected trim ? trim_cents : 0

room_total = round(base * coating_multiplier_pct / 100 * condition_multiplier_pct / 100)

subtotal = sum(room_total) + selected line items - discount
gst = round(subtotal * 0.10)
total = subtotal + gst
```

Baseline:
- 2 coats repaint = 100%
- average condition = 100%

Editable: 1-coat refresh %, 3-coat new plaster %, good condition %, poor condition %.

### 4.6 Build Order

**Phase 1 — Lock the product model**
- `detailed_quick` 표시명 = `Detailed Estimate - Quick`
- `hybrid` 표시명 = `Detailed Estimate - Advanced`
- New Quote에서 top-level Quick Estimate 카드 제거, top-level Room Flat Rate 카드 제거 (legacy edit/read fallback만 유지)
- Detailed Estimate 모드 셀렉터 추가, 기존 견적은 자기 모드로 자동 진입

**Phase 2 — Fix Advanced empty-state pricing** (먼저 진행)
- 초기 placeholder 룸 → UI-only. priceable predicate 도입:
  - 룸 이름 텍스트 있음, OR length/width 입력, OR anchor 룸 타입 명시 선택
- preview/submit 모두 같은 predicate 사용
- 빈 placeholder만 있는 specific_areas → `$0.00` + empty-state 카피
- entire-property 모드는 명시 선택이므로 default가 가격 만들어도 OK

**Phase 3 — Authoritative Quick pricing snapshot**
- 서버 create 흐름: `quote_estimate_items`를 `calculateQuickEstimate()` 결과 룸에서 insert (raw 클라이언트 룸 X)
- update 흐름도 동일 (delete + reinsert from calculated rows)
- `pricing_snapshot`에 quick estimate rate settings 또는 calculated 룸 row 보관

**Phase 4 — Price Rates UX**
- Detailed Estimate를 메인 estimate 영역으로
- Quick setup → Advanced setup 순
- Day Rate / Manual은 별개 설정으로 유지
- Master Bedroom with/without ensuite 기본 템플릿
- 모든 룸 라벨/가격 사용자 편집
- 2-coat repaint와 average condition은 100%에 lock
- 레거시 Room Rate Presets UI 숨김 (data 보존, hydration fallback)

**Phase 5 — Quote quick flow polish**
- QuickEstimateBuilder를 4단계 위저드(coating → room/size/surface → condition → review)
- Validation: 룸 0개 / 룸에 surface 0개 / 모든 룸 가격 합 0 → block save
- 개별 룸 0원 → warn (총 0이 아닌 한 허용)
- Summary 카피 예: `Bedroom, Medium, Walls + Ceiling, 2 coats repaint, Poor condition`

**Phase 6 — Compatibility**
- 기존 `room_rate` 견적은 렌더/편집 가능 + deprecated 배너
- Advanced는 기존 `calculateInteriorEstimate()` 유지 (sqm anchors 재작성 X)
- Public quote / PDF에서 `detailed_quick` 같은 내부 키 노출 X

**Phase 7 — Tests & verification**
- Advanced default specific-area placeholder → `$0.00` (not `$2,681.80`)
- Blank Advanced 룸은 preview/submit payload에서 필터
- Entire-property Advanced는 explicit 선택 시 estimate 정상 생성
- `calculateQuickEstimate()`가 Price Rates 기준 계산 (stale 클라이언트 룸 X)
- 동일 룸 두 번 추가 → 별도 row
- 코팅·컨디션 multiplier 일관 적용
- 0 totals 의도적으로 처리
- Server action: create/update detailed_quick → `quotes.total_cents` = sum(quick item rows) + line items - discount + GST
- `quote_estimate_items`가 calculated total 사용
- Component: New Quote 카드 = Detailed Estimate / Labour×Days / Direct Input. Detailed Estimate가 Quick/Advanced 셀렉터 노출. Advanced blank → `$2,681.80` 노출 X. Room Flat Rate 부재 (신규). 레거시 `room_rate` deprecated fallback. Master Bedroom with/without ensuite 편집 가능.
- Browser QA: 모바일 quick flow, Advanced `$0.00` 시작, Price Rates quick setup 모바일, 견적 저장→재오픈 totals 안정, Price Rates 변경 후 옛 견적 totals 유지.
- Build: tsc, vitest, production build.

### 4.7 Acceptance Criteria

- New Quote가 Detailed Estimate vs Room Flat Rate 선택을 묻지 않는다.
- Detailed Estimate가 Quick/Advanced 모드를 명확히 노출한다.
- Quick은 모든 룸의 walls/ceiling/trim 선택을 지원한다.
- Master Bedroom with/without ensuite 모두 가용 + 편집 가능.
- 코팅·컨디션 percentage 설정은 Price Rates에 산다.
- 2-coat repaint와 average condition은 100% baseline.
- Advanced는 사용자 입력 전 `$2,681.80` (또는 그 어떤 비-0) 표시 X.
- Advanced는 기존 sqm/anchor 동작 유지.
- Quick quote saved line items = server-calculated totals.
- 레거시 room rate 견적은 deprecated 메시지와 함께 read/edit 가능.
- Public quote / PDF는 사용자-facing 라벨만 사용 (내부 method 키 X).

### 4.8 Non-Goals

- `room_rate`를 DB에서 삭제
- 기존 room rate 견적 일괄 마이그레이션
- Advanced sqm 엔진 재작성
- Per-room 코팅/컨디션 override
- S/M/L 외 사이즈 라벨

### 4.9 Immediate Next Build Task

Phase 2를 UI 폴리시보다 먼저. Advanced empty-state의 `$2,681.80`이 첫 신뢰 깨짐 — 페인터가 입력하지 않았는데 견적이 발명된 것처럼 보인다. Advanced empty-state → quick snapshot 일관성 → UI 재배치 순서.

---

## 5. Rate Settings (단가 설정)

### 5.1 Goal & Decision

기본 rate preset 관리는 `Price Rates`에 있다. `Quote`는 그 기본값을 읽어 견적 계산에만 쓴다. `Quote` 안에서는 read-only 안내와 settings 이동 링크만.

이유:
- "이번 견적만 vs 글로벌" 모호함 제거
- 견적 저장과 설정 저장 흐름 분리
- 같은 설정 UI 중복 구현 회피
- 글로벌 단가 실수 변경 위험 제거

### 5.2 Terminology

사용자 라벨:
- `Refresh (1 coat)`
- `Repaint (2 coats)`
- `New Plaster (3 coats)`

내부 키 리네임은 별도 refactor (`touch_up_2coat → refresh_1coat` 등). 우선 UI 라벨만 변경.

### 5.3 Information Architecture

**Surface Rates (walls / ceiling)**

| 행 | Refresh (1 coat) | Repaint (2 coats) | New Plaster (3 coats) |
|----|------------------|-------------------|----------------------|
| Walls | rate | rate | rate |
| Ceiling | rate | rate | rate |

`New Plaster (3 coats)`는 walls/ceiling에만 노출. coating matrix(rate/m²) 역할.

**Trim Rates** — 별도 섹션. Refresh / Repaint만. New Plaster 미노출. Skirting/trim metre pricing 연결 가능.

**Door Rates** — 현재 구조 유지. paint base/system별 unit price (Oil/Water), door type × scope 조합. `new_plaster_3coat` 미사용.

**Window Rates** — Door와 동일 구조.

### 5.4 Quote UX

**Quick Quote** 상단 `Paint System` 라벨: `Standard repaint (2 coats)` / `New plaster (3 coats)`. trim은 별도 `Trim Paint Base`: Oil / Water.

**Interior Estimate Builder** — 누락된 wall/ceiling coating selector 추가 (property/scope 다음, room list 이전). 필드: Refresh / Repaint / New Plaster. Trim/doors/windows는 selector 공유 X.

**Quote Settings Link** — `Using default rates from Price Rates` + `Edit default rates` 링크.

### 5.5 Data Model

**Preferred shape:**

```ts
surface_rates: {
  walls:   { refresh_1coat: number; repaint_2coats: number; new_plaster_3coats: number };
  ceiling: { refresh_1coat: number; repaint_2coats: number; new_plaster_3coats: number };
  trim:    { refresh_1coat: number; repaint_2coats: number };
}
```

별도 유지: `door_unit_rates`, `window_unit_rates`, `pricing`, `room_rate_presets`.

**Transitional compatibility** — DB shape 크게 안 바꿔도 됨.
- `businesses.default_rates` 유지
- UI에서만 walls/ceiling/trim 다르게 렌더
- `trim.new_plaster_3coat`, `doors.new_plaster_3coat`, `windows.new_plaster_3coat`는 UI에서 숨김
- 계산 로직도 필요한 항목만 read

### 5.6 Calculation Rules

- **Walls / Ceiling**: 선택 coating에 해당하는 직접 rate 사용. 현재 quick quote의 `new_plaster_3coat = 1.2x multiplier` 임시 → 직접 rate table 참조로 정리.
- **Trim**: Refresh / Repaint만. New Plaster 없음.
- **Doors / Windows**: unit rate, paint base 기준. coating matrix와 분리.

### 5.7 Implementation Plan

**Phase 1 UX 정리**: `Touch-up → Refresh` 라벨, Surface Rates 재배치, New Plaster를 walls/ceiling 전용으로, Quote에 `Edit default rates` 링크.

**Phase 2 Quote 선택지 정리**: Quick Quote wall/ceiling 라벨, Interior Estimate Builder selector 추가, trim/door/window는 base selector 유지.

**Phase 3 계산 로직 정리**: quick의 `new_plaster`를 multiplier가 아니라 명시 coating으로, interior estimate가 coating별 surface rate 직접 참조, trim/door/window 경로의 `new_plaster_3coat` 참조 제거.

**Phase 4 (선택) 내부 키 리네임**: `touch_up_2coat → refresh_1coat` 등. 영향 범위 큼 → 별도 작업.

---

## 6. Close the Loop — Send / Accept / Invoice

*Generated by /gstack-office-hours on 2026-04-27. Status: APPROVED*

### 6.1 Problem

호주 솔로 페인터(스프레드시트 + 수동 PDF + 개인 Gmail)는 견적당 ~2시간을 쓰지만, GST 자동, 전문 PDF, 발송 + 열람 추적이 없다. Coatly는 quote builder, PDF, invoicing, customer CRM, schedule, AI drafting, Stripe billing은 있지만 loop가 닫혀있지 않다.

### 6.2 Demand Evidence

- 창업자 도메인 전문성: 페인팅 업계 직접 경험
- 구체적 통증: spreadsheet 견적당 ~2시간
- 시장 검증: Tradify (~$48/mo), Ascora (~$29/mo) 호주 솔로 트레이더 수천 명 유료 사용

### 6.3 Status Quo

1. 현장 방문 → 폰 메모
2. 집 → 스프레드시트 면적·도료·인건비 수동 계산
3. GST 수동 (자주 틀림)
4. PDF/스크린샷 export
5. 개인 Gmail 발송
6. 열람 여부 모름
7. 어색한 follow-up 전화

### 6.4 Wedge

**User**: Jim, 35, 시드니 서부 솔로 트레이더, ABN 등록, 직원 0, 월 10-15건 견적, iPhone 현장.

**Wedge**: "전문 견적을 2시간이 아니라 10분에."

### 6.5 Premises (Status)

| # | Premise | 상태 |
|---|---------|------|
| 1 | 솔로 페인터는 ~30 hrs/month spreadsheet 견적에 쓰고 fix에 돈 낼 의향 | AGREED — Tradify/Ascora 시장 검증 |
| 2 | Wedge는 speed-to-quote, not job mgmt/scheduling | AGREED — schedule 컴포넌트 이미 제거 |
| 3 | 첫 *accepted* quote까지의 시간이 activation metric | AGREED — CC-first 모델, session 1 필수 |
| 4 | Good/better/best 티어 차별화 | NOT ENDORSED — 보류 |

### 6.6 Approach: Close the Loop

| Approach | Effort | Risk | Verdict |
|----------|--------|------|---------|
| A. Close the Loop (선택) | S (~1-2주) | Low | 핵심 가치 입증, 인프라 존재 (Resend, /q/, PDF) |
| B. Activation-First Redesign | M (~3-4주) | Medium | 후순위 |
| C. AI as Hook (Pro AI → Starter 3건/월) | M (~3-4주) | Medium-High | 후순위 |

### 6.7 Priority 1 — Email Send (Resend)

- Quote detail에서 one-tap "Send Quote to Customer"
- PDF 생성 → Resend 첨부 → 고객 이메일 → 본문에 `/q/` 공개 링크
- Resend API 응답 성공 시 status `sent`로 즉시 갱신

**Resend 디버그 체크리스트:**
- API key가 Vercel env에 설정 (로컬 .env만 X)
- 발송 도메인 verified (SPF + DKIM)
- 거절/바운스 사유 Resend 로그 확인
- `from` 주소가 verified 도메인 (개인 Gmail X)
- 첫 테스트는 non-Gmail 수신자 (Gmail spam aggressive)

**PDF 전달**: PDF 생성 → Supabase Storage public bucket(영구 URL) 업로드 → 본문에 Storage URL (첨부 X). Vercel function timeout: React-PDF + 업로드 ≤ 10s. 업로드 실패 시 quote status 갱신 X.

### 6.8 Priority 2 — Customer-Facing Accept

- `/q/[id]` public page (no login)
- "Accept This Quote" → status `approved`

**Security**: signed token URL `/q/[id]?token=[hmac]`
- Algorithm: HMAC-SHA256(quote_id, `QUOTE_ACCEPT_SECRET`)
- 발송 시 생성, URL에 포함
- Server validate: `expectedToken === createHmac('sha256', secret).update(quoteId).digest('hex')`
- Limitation: token이 서버 로그/Resend click-tracking에 남음 — v1 허용 (결제 X). Mitigate: `/q/` query params 로깅 회피
- Token 미만료 (v1) — 만료는 `valid_until` 필드로

**Idempotency**: Accept 클릭 후 disabled + "Quote Accepted" 표시. 서버 측: 현재 status가 `sent`일 때만 갱신.

**Expired**: Accept 전 `valid_until < now()` 체크. 만료 시 422 + 안내.

**Painter notification**: 페인터 등록 이메일로 Resend "Quote #[number] accepted by [customer name]" — fire-and-forget.

**Status transitions**: draft → sent (email dispatch), sent → approved (customer accept), sent → rejected (future), sent → expired (cron, future).

### 6.9 Priority 3 — Read Receipt (the "aha")

서버사이드 view tracking, **email pixel X** (Apple Mail Privacy Protection 차단 — iPhone 우세 세그먼트).

`quote_views` 테이블:
- `quote_id` uuid FK → quotes.id, **UNIQUE**
- `first_viewed_at` timestamptz NOT NULL DEFAULT now()
- `INSERT ... ON CONFLICT (quote_id) DO NOTHING`

RLS:
- INSERT: service role only (admin client 호출)
- SELECT: authenticated where `quote_id IN (SELECT id FROM quotes WHERE user_id = auth.uid())`

**Dashboard widget**: "Opened [relative time ago]" 또는 "Not opened yet — follow up?" — 페이지 로드 시 정적 read (realtime push X).

### 6.10 Priority 4 — Quote → Invoice (one click)

승인된 quote에서 "Create Invoice from Quote" CTA → 사전 입력: customer_id, line items (rooms/surfaces), subtotal_cents, gst_cents, total_cents, default_payment_terms.

`lib/invoices.ts`와 invoice 생성 액션에서 quote_id 입력 경로 검증 필수. 페인터가 payment terms 조정 후 발송.

### 6.11 Backlog (out of scope this sprint)

- Starter 한도 10건/월 — 10-15건/월 페인터에게 too restrictive
- Schedule 페이지 → 단순 "upcoming jobs" 리스트
- Materials/services 카탈로그 UX → "common items" 설정 화면
- Demo 모드 — 가입 없이 완성된 견적 표시
- AI on Starter — Pro 트라이얼 hook으로 3건/월
- 인앱 알림 — 보류 (이메일 알림이 v1 충분)

### 6.12 Reviewer Concerns (acknowledged, deferred)

1. **HMAC token forwarding**: 고객이 accept 링크를 제3자에 전달 가능. v1 허용 (페인팅 견적은 신뢰 기반). v2: one-time tokens.
2. **Invoice line-item mapping**: `lib/invoices.ts`에서 실제 필드 매핑 검증 후 Priority 4 구현.
3. **PDF Vercel timeout**: 프로덕션 instrument 먼저. 8s 초과 시 background job.

### 6.13 Success Criteria

1. Session 1에 페인터가 첫 견적 작성 + 발송
2. 고객이 모바일에서 quote 링크 열고 "Accept" (no login)
3. 고객 방문 후 다음 페이지 로드에서 페인터가 "Quote opened [time ago]" 확인
4. 승인된 quote → invoice 변환 < 30초
5. 첫 20건 발송 후 Resend 대시보드 deliverability > 95%

### 6.14 Dependencies

- Resend SPF/DKIM/도메인 verification
- `/q/` 공개 라우트 실제 모바일 테스트
- `quote_views` Supabase migration

### 6.15 The Assignment

신기능 빌드 전 — 호주 페인터 3명(친구, 트레이드 지인, Facebook groups)에게 Coatly를 보여주고 견적 작성·발송을 시켜라. 도와주지 말고, 설명하지 말고, 무엇이 깨지는지 본다. 60분 관찰 세션이 2주 빌드보다 가치 있다.

---

## 7. Acceptance Criteria (전체)

- [ ] 견적 번호 자동 채번 (QUO-0001, user별 unique)
- [ ] 방별 면적 자동 계산 (2 × (L+W) × H for 벽)
- [ ] GST 10% 자동 계산
- [ ] 금액 AUD 포맷 ($1,234.56)
- [ ] PDF에 비즈니스 브랜딩 (로고, ABN, 연락처) 포함
- [ ] Starter 플랜 월 10건 제한
- [ ] 유효기간(`valid_until`) 기본 30일
- [ ] 집 타입 + 방 조합으로 자동 가격 (anchor 가격 × 조건 보정)
- [ ] 방 크기 S/M/L → size_multiplier 자동 적용
- [ ] 단가 미설정 시 `config/paint-rates.ts` 기본값 사용

## 8. Constraints

- 숫자 입력: `inputMode="numeric"` 필수
- 터치 타겟: 44px+ 필수
- 견적 수정은 draft 상태에서만 가능

## 9. Edge Cases

- 단가 0 설정: 0으로 계산 허용 (의도적 설정)
- 방 0개: "방을 추가해주세요" 안내 + 저장 불가
- 도어/윈도우 0개: 트림 scope에서 자동 제외

## 10. 설계 결정

### Room → Surface 2단계 구조
페인터는 "거실 벽, 거실 천장, 거실 트림"처럼 방 단위 작업. 한 방 여러 면, 면별 코팅/단가 다름. 플랫 구조(quote → items)로는 표현 불가.

### Cents 정수
부동소수점 오류 방지. 모든 금액 cents 저장, 표시 시에만 /100.

### 마진 별도 필드
페인터마다 인건비/자재비 마진 다름. `labour_margin_percent`, `material_margin_percent` 분리.

---

## 11. Workflow Bug Fix Log

### 2026-04-22 — Customer → Quote → Invoice 핸드오프

- `+ New Quote` from CustomerDetail이 quotes/new에서 customer 사전 선택
- `+ New Invoice` from CustomerDetail이 invoices/new에서 customer 사전 선택
- QuoteCreateScreen에서 AI/template 입력 전에도 사전 선택된 customer 보존
- InvoiceCreateScreen에서 빈 invoice draft 시 customer 보존
- `app/actions/quotes.ts` quote duplication typing — nullable `pricing_method` insert 정규화
- 회귀 테스트 추가: customer preselection
- 통과: QuoteCreateScreen.test.tsx, InvoiceCreateScreen.test.tsx, quotes.test.ts, invoices.test.ts

당시 잔여: jobs/schedule 영역 `npx tsc --noEmit` 실패 — 2026-04-25 critical audit (`audit.md`)에서 해결.
