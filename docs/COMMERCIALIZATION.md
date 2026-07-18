# Coatly — Commercialization Strategy

> Owner: **Claude** (Opus 4.8 · extra) — 상품화 전략/가격/GTM 정본. 항목 실행(구현/DB/배포/git)은 Codex(high).
> 기준일: 2026-07-12. 경쟁사 가격은 공식 가격 페이지 교차 검증(2026-07 초) 기준. 제품 우선순위 반영은 [`PLANS.md`](./PLANS.md), 결함 추적은 [`features/audit/AUDIT.md`](./features/audit/AUDIT.md).

## TL;DR

호주 페인터 시장에는 "AU 현지화 + 페인터 전용 + 업체당 플랫 가격 + quote→follow-up 전체 루프"를 모두 갖춘 앱이 없다. 이 조합이 Coatly의 상품성이다. 권고: 단일 플랜 **A$39/월 flat + 30일 무카드 trial**, 포지셔닝 **"Your Excel price list, now an app"**. 운영 비용은 베타 기준 월 ~A$250(AI 개발 도구 포함), **손익분기 유료 7~10명**. 최대 제품 갭은 follow-up reminder 미구현(핵심 차별점이자 Excel이 못 하는 유일한 것).

## Positioning

한 줄: **"쓰던 Excel 가격표가 그대로 앱이 된다 — 당일 견적, 자동 follow-up."**

- **Anti-AI**: "We don't guess your prices. You already know them." — 자기 단가에 자부심 있는 페인터는 AI 제안 가격을 불신한다(QuoteMate의 약점을 정면 공략).
- **Anti-job-management**: 범용 작업관리 도구가 아니라 견적 루프 전용.
- 구조적 방어: 범용 앱(ServiceM8/Tradify)은 painter-first가 될 수 없고(타 직군 고객 이탈), QuoteMate는 price-book-first가 될 수 없고(AI 피치 부정), 미국 도구(PaintScout류)는 AU-first가 될 수 없다. **셋을 동시에 갖출 수 있는 건 레거시 없는 신규 진입자뿐.**

## Competitive Landscape (2026-07 검증)

4개 진영, 어느 쪽도 wedge 미점유:

| 앱 | 가격 (검증) | 성격 | 1–3인 AU 페인터 기준 약점 |
|---|---|---|---|
| ServiceM8 | A$0(30 jobs)–349/월 flat, GST 포함 ✓ | AU 범용 | painter 개념 없음, 월 작업 캡, 현장앱 iOS 전용 |
| Tradify | A$48–62/user ex GST ✓ | AU 범용 | per-user(3인 ≈ A$156+), follow-up은 Pro 티어 잠금 |
| Fergus | Essentials A$53 / Professional A$77/user (수정 반영) | AU 범용 | 배관/전기 DNA, per-user + 유료 부가 |
| AroFlo | 비공개, ~A$67–120/user + 온보딩 A$1,299, 3인 최소 (수정 반영) | AU 헤비급 | 영업 주도 판매, 체급 불일치 |
| Simpro | 비공개 견적, 구현비 US$3k–10k+ ✓ | AU 헤비급 | 다년 계약, 1인 업체 부적합 |
| Buildxact | A$199–599/월 flat ✓ | AU 빌더 | 도면 물량산출 전제, 가격 7배 |
| Groundplan | AU$99/seat ex GST (수정 반영) | AU 물량산출 | 주거 재도장엔 도면이 없음 |
| Jobber | USD, Core $49/월(무약정, 수정 반영) | 북미 범용 | USD 결제, Xero는 $99+ 티어 |
| PaintScout | US$119/월 flat(1인 포함)+시트 $20 (수정 반영) | 미국 페인터 전용 | ≈A$180+, GST/Xero/ABN 없음 |
| DripJobs | US$97–147 + 부가 (미검증) | 미국 페인터 뿌리 | 미국 번호 SMS, AU 사용 불가 수준 |
| Estimate Rocket | US$139/월~ (미검증) | 미국 | ≈A$210+, 사무직 전제 |
| **QuoteMate** | A$49/월 or A$328/년 (자사 페이지 기준, 미검증) | **AU 페인터 전용, 직접 위협** | AI-first(단가 신뢰 문제), send→follow-up→invoice 루프 얇음 |
| YourTradebase | £29/월 flat ✓ | UK, 철학적 유사 | UK 전용(VAT-first), AU 존재감 없음 |

✓ = 공식 페이지 2차 검증 통과. "수정 반영" = 1차 조사 오류를 검증에서 정정한 값.

## Market Facts (검증)

- 호주 페인팅 업체 **23,984개**, 시장 **$9.6bn**, 업체당 평균 **2.3명**, 지배 사업자 없음 (IBISWorld 2026, ABS 수치와 일치 확인).
- **43%의 tradie가 종이/기초 소프트웨어로 견적**, 추적 안 된 견적으로 주당 4–5건 유실 (ServiceTitan 2025, n=1,025).
- 건축 트레이드 **follow-up 정기 실행률 ~16%** — 자동 follow-up은 성사율 15–20% 개선 데이터.
- 주거 내부 도장 견적 A$4,500–10,000, 성사율 ~20% → **월 1건 추가 성사가 어떤 구독료보다 큼**.
- 지불의향 밴드 A$29–62/월. per-user 과금·작업 캡에 강한 거부감. hipages 리드에는 월 A$200–900 지출(ROI가 보이면 지불함).

## Pricing

| 항목 | 결정 방향 | 근거 |
|---|---|---|
| 플랜 | **단일 A$39/월 (GST 포함), 업체당 flat, 3인까지, 견적 무제한** | 지불의향 밴드 중간, Tradify 2인 대비 ~60% 저렴. flat은 레거시 매출 없는 신규 진입자만 가능한 구조 |
| Trial | **30일 무카드** | YourTradebase 검증 패턴, QuoteMate(7일) 대비 우위. `subscription-sync`는 `trialing`을 이미 active 취급 — checkout `trial_period_days` 설정 중심 |
| Starter/Pro 2단 | **폐지** | 현재 Pro 차별점이 봉인된 AI뿐(AUDIT A11) — 없는 것을 팔고 있음 |
| Pro A$59 | **post-core 재도입** | Follow-up Writer 등 AI 헬퍼가 실제 동작할 때. AI는 문구만, 가격은 절대 안 씀 |
| Founding | 최초 20명 **A$29 종신** | 초기 레퍼런스/검증 픽스처 확보 |

ROI 카피: A$39 = 시간당 A$90 페인터의 26분. 주당 견적/관리 2–4시간 → 월 1시간 절약이면 본전, 견적 1건 추가 성사 시 100배 회수. 최종 확정은 A workflow 재현 후(V1-PLAN Pricing Note).

## Costs & Break-even (환율 1 USD = 1.5 AUD 가정)

| 단계 | 인프라 | Stripe | AI 개발 도구 | 월 합계 |
|---|---|---|---|---|
| 베타 0–10명 | ~US$46 (Vercel Pro 20 + Supabase Pro 25 + 도메인) | $0 | ~US$120 | **≈ A$249** |
| 유료 50명 | ~US$66 (+Resend Pro 20) | 매출의 ~3% | ~US$120 | **≈ A$353** (MRR A$1,950 대비 소액) |
| 유료 500명 | ~US$95–125 | ~3% (≈A$590) | US$120–300 | **≈ A$1,000 내외** = 매출의 ~5% |

- Supabase Free는 1주 미사용 시 정지 + 백업 없음 → **실 고객 데이터 저장 시점부터 Pro($25)가 바닥** (현재 live 프로젝트 INACTIVE P0와 연결).
- Vercel Hobby는 상업 사용 금지 → 과금 시작 전 Pro($20) 필수.
- Stripe(국내 1.7%+A$0.30 + Billing 0.7% ≈ 3%)는 매출 연동 원가.
- **손익분기: 유료 7–10명** (A$39 건당 순수취 ~A$37.5 ÷ 고정비 A$250–350). 마케팅 예산 없이 도달 가능(아래 GTM 전 채널 무료/저비용).

## Differentiation Roadmap

전부 v1 제약 준수(pre-release AI/자동해석/공급사 연동 없음). 우선순위 순:

**즉시 (작음 — 검증 차단 해제)**
1. **Send Truth Layer**: 견적 상세 Send/Resend + 영구 발송 기록 + 수동 "Mark as sent" + `reply_to`=painter 이메일 (AUDIT A17/A18)
2. **Paste-first Price Book**: 두 화면(materials-service ↔ Price Rates Manual) 단일 "Price Book"으로 통합, 붙여넣기 textarea. 목표: 첫 세션 15분 내 가격표 이전

**핵심 차별점 (중간)**
3. **Follow-up Autopilot**: 공개 링크 열람을 `public_quote_events`에 기록(테이블 존재, 미사용) → D+2/D+7 due cron(invoice-reminders 패턴) → "오늘 챙길 견적" 큐 + 저장 문구 원탭 발송. *Excel이 구조적으로 못 하는 유일한 것* (AUDIT A9)
4. **Quote Kits**: price book 항목을 "표준 침실" 등 kit로 묶고 count 배수 원탭 투입 — A의 Excel 섹션 블록 구조 재현, 단가는 painter 소유

**AU 신뢰 레이어 (작음, 기존 인프라 재사용)**
5. **GST 모드**: 등록/미등록 설정 1개로 "Tax Invoice" vs "Invoice" 문서 체계 (미등록 sole trader 경로 — 미/영 도구가 구조적으로 못 하는 것)
6. **Trust block**: ABN·주 라이선스·배상책임보험·보증을 PDF/공개 페이지/invoice에 일관 표기
7. **AU 브랜드 스타터 팩**: Dulux/Taubmans/Haymes 항목명·단위만 채우고 **가격은 빈칸** — painter 단가 입력 원칙 유지, QuoteMate AI 가격의 정면 카운터

**Post-core (릴리즈 후, [`../TODOS.md`](../TODOS.md) 추적)**: Driveway Quote 3단계 위저드(당일 견적) → Pro A$59 + AI 헬퍼(Follow-up Writer 등) → post-job 리뷰 루프 → kit 성사율 인사이트. Kits+이벤트 데이터가 만들 데이터 모트는 QuoteMate가 price-book-first로 전환하지 않는 한 복제 불가.

## GTM — 첫 10–50명 (전 채널 founder-scale, CAC ≈ A$0)

1. **Painter A 검증 = 런칭 케이스 스터디**: 기존 release gate(A의 실제 Excel + 최근 견적 재현)를 통과시키면 그대로 마케팅 자산 — "일요일 밤 Excel 견적에서 전화기 15분 견적으로".
2. **Founding Painter 20명 (A$29 종신)**: A의 트레이드 네트워크 + 호주 페인터 Facebook 그룹 2–3곳(광고 아닌 가치 포스팅 — 견적 분해, follow-up 스크립트). 각자 20분 온보딩 콜. Founding 2–5호는 추가 검증 픽스처로 취급.
3. **"Switched by Sunday" 컨시어지 이전**: 첫 20명은 founder가 Excel을 직접 5컬럼 템플릿으로 정리해 익일 price book 세팅 완료 상태로 시작. PaintScout은 이걸 US$999–1,999에 판다. 제품 아님(사람이 하는 서비스) — arbitrary auto-import 제약 위반 아님. 부산물: 실제 가격표 20개 = post-core import 자동화 판단 근거.
4. **템플릿 SEO 퍼널**: "painting quote template Australia" 류 무료 Excel/Sheets 템플릿 3–5페이지. **템플릿 컬럼 = Coatly CSV import 스키마** → 리드 마그넷이 곧 온보딩. 3–6개월 배경 채널로 취급.
5. **페인트 매장 카운터 채널**: Dulux Trade/Haymes/독립 Paint Place 카운터 QR 카드 + 매장 리퍼럴(A$50 기프트카드). 소프트웨어 경쟁사가 없는 유일한 물리 채널. 독립 franchisee부터.
6. **랜딩 카피 교체**: "Job Management" 프레임 → 포지셔닝 한 줄 + 8단계 루프 시연 영상 + 비교 페이지 2종(vs Tradify: flat vs per-user / vs QuoteMate: 내 단가 vs AI 단가).

## Risks

- **시장 소폭 수축** (2026 -3.3%): 도구 침투율이 낮아 wedge 영향 제한적 — 모니터링만.
- **Painter A 단일 레퍼런스**: A의 워크플로우가 특이할 수 있음 → Founding 2–5호를 검증 픽스처로.
- **QuoteMate의 price-book-first 선회**: 가능성 낮음(자기 피치 부정)이나, follow-up 루프+kit 데이터 선점이 방어책. 분기 모니터링(TODOS #8).
- **Anti-AI 프레임 노후화**: "AI 반대"가 아니라 "내 단가 우선"으로 표현 — post-core AI 헬퍼 여지 유지.

## Execution Order

| 순서 | 작업 | 추적 위치 |
|---|---|---|
| 1 | P0 해소: Supabase live 복구, RESEND_FROM_ADDRESS, 저장 원자성 | LAUNCH-READINESS / AUDIT A1 |
| 2 | Painter A end-to-end 검증 → 케이스 스터디화 | AUDIT A3 / V1-PLAN release gate |
| 3 | Send Truth Layer + reply_to + AI 카피 제거 | AUDIT A17/A18/A11 |
| 4 | Follow-up Autopilot | AUDIT A9 / PLANS P1 |
| 5 | 가격 개편: A$39 단일 + 30일 무카드 trial | AUDIT A19 / PLANS P1 |
| 6 | Price Book 통합·붙여넣기, Quote Kits, GST 모드, Trust block, 스타터 팩 | PLANS P2 |
| 7 | GTM 실행 (Founding 20 → FB 그룹/매장/SEO) | 본 문서 |
| 8 | Post-core: Driveway 위저드, Pro A$59 + AI 헬퍼 | TODOS 7A/7B |

## Verification Notes

- 경쟁 가격 10건 2차 검증: 6건 확정, 4건 정정(Fergus AU, Jobber, PaintScout 과금 모델, Groundplan AU). QuoteMate/DripJobs/Estimate Rocket은 1차 조사만.
- 시장 팩트 4건 검증: 3건 확정, 1건 정정(업체당 평균 2.6명 → **2.3명**, IBISWorld 2026 갱신치).
- 분기별 경쟁 재점검: [`../TODOS.md`](../TODOS.md) #8 (다음 2026-10).
