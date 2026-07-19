# Coatly 전앱 디자인/UX 감사 — 2026-07-12

> Owner: **Claude** (Opus 4.8 · extra) — 분석/QA 리포트. 여기 기재된 컴포넌트 수정은 **Codex(high) 구현 대상**.

방법: 전 화면 소스 감사(병렬 에이전트 5) + 정량 grep 인벤토리 + 로컬 브라우저 QA(모바일 375/데스크탑, before/after 스크린샷·computed style 검증). 기준: `docs/DESIGN.md` + CLAUDE.md Design Conventions.
결과: **총 91건** (Critical 3 · Major 29 · Minor 43 · Nit 16). 글로벌 토큰층은 리프레시 v1.1로 해결(§1), 컴포넌트층은 **2026-07-19 집행 완료**(§5 현황).

## 0. 집행 결과 (2026-07-19, 사용자 직접 지시로 실행)

13-에이전트 워크플로(프리미티브 → 12모듈 병렬 → build gate)로 §2–§4 실행. 일부는 직전 커밋 `aefa34d`가 선반영. 검증: `next build` exit 0 (39 pages) · lint 0 · **테스트 530/530** · 브라우저 QA(랜딩/login/forgot/캘린더+모달 시맨틱/Esc, 콘솔·서버 에러 0).

- **인벤토리 최종**: `bg-white` 241→**0** · `text-outline`(텍스트) 70→**0** · `alert()`/`window.confirm` 10→**0** (예외: PDF 템플릿·global-error·canvas API)
- **회귀 2건 복구**: `aefa34d`가 남긴 ScheduleCalendar undefined `STATUS_BADGE` 참조(스케줄 화면 파손), PublicApprovalForm 미배선 Decline 핸들러(공개 견적 파손)
- **신설**: `SectionLabel` 프리미티브 · `loading.tsx` 9개 라우트 · signup 비밀번호 토글 · `sendQuoteToClient`의 stale-column 수정(gate)
- **삭제**: `components/ui/button.tsx` · `JobsWorkspace.tsx` (死코드, import 0건 재검증 후)
- 변경 규모: 50파일 수정 + 9파일 신규, +838/−977 라인 (워크트리 uncommitted — 커밋은 Codex)

## 1. 이번 세션에서 해결됨 — 글로벌 디자인 리프레시 v1.1

`app/globals.css` + `app/layout.tsx` + `public/manifest.json`만 변경(컴포넌트 무변경, uncommitted). 상세 값은 DESIGN.md Color System v1.1 참조.

| 문제 (before) | 해결 (after) |
|---|---|
| surface 계층 붕괴: `container`=`container-high`=`lowest`=**전부 #FFFFFF** → SecondaryActionLink hover 불가시, FormFooter disabled 버튼 흰색-on-흰색 | 5단 실계층 `#FFF→#F4F0E9→#EEE9E0→#E8E2D7→#E1DACD` — hover/disabled 상태 자동 복원 (런타임 computed 검증됨) |
| 웜 surface(#FBFAF7) + 쿨 slate outline(#CBD5E1/#E2E8F0) 온도 충돌 | 단일 웜 뉴트럴 세계: paper surface `#FAF7F2` + stone outline `#C9C1B2`/`#E5DFD3` |
| `primary-container`(#0B9E80)를 텍스트색으로 쓰는 곳 대비 ~2.8:1 미달 (PricingSection·signup 등 9곳) | 딥 pine `#095F4E`로 조정 — 동일 사용처가 흰 배경 7.9:1로 **토큰값만으로 AA 통과**. 극성(강조칩+라이트텍스트)은 코드 사용처 실측 후 보존 |
| primary #0D8068 흰 텍스트 4.9:1 (경계선) | `#0B7A64` 5.2:1 — 햇빛 페르소나 여유 확보 |
| success(#0B6E5A)가 primary와 동계열 teal → paid/sent 스캔 구분 약함 | leaf green `#177D53`로 분리 |
| 폰트 이중 로드: Geist(`--font-sans`) 다운로드만 되고 미사용 + body는 "Manrope" 하드코딩 → `font-sans` 클래스 쓰는 순간 서체 혼합 지뢰 | **Manrope 단일** (`--font-sans`), Geist 제거 — `document.fonts` Geist 0건 검증. 폰트 페이로드 감소 |
| PWA 테마 3색 분열: manifest `#1e40af`(무관한 블루) vs viewport `#0F2943` vs 브랜드 | 전부 surface `#FAF7F2`로 통일 — 브라우저 크롬이 앱과 이음새 없음 |
| radius 10px 베이스, 카드 18px — 다소 딱딱 | 12px 베이스 (xl≈17/2xl≈22) 소프트 스케일 |
| `text-4xl`=36px 페이지 타이틀 과대(DESIGN 상한 위반) | 글로벌 스케일에서 32px로 재정의 (사용처 4곳 전부 페이지/히어로 타이틀) |
| 금액 자릿수 정렬 없음(tabular-nums 7파일만) | body 전역 `font-variant-numeric: tabular-nums` — 모든 금액·날짜 자동 정렬 |
| `.dark` 블록이 stock shadcn 회색(무브랜드) | 브랜드 정합 placeholder로 교체 (토글 없음=미지원 문서화) |
| 랜딩/auth/subscribe/공개견적의 하드코딩 크림(#fcf9f4 등)이 토큰 세계와 단절 | 새 surface를 이 웜 세계로 수렴시켜 시각 단절 제거 — 토큰 치환 시 무손실 (컴포넌트 치환 자체는 Codex) |

검증: `next build` exit 0 · 로그인/데모 캘린더/랜딩 모바일+데스크탑 스크린샷 · 주입 프로브로 ladder/radius/폰트/tabular-nums computed 값 확인.

## 2. Critical (3)

| # | 위치 | 문제 | 제안 |
|---|---|---|---|
| C1 | `modules/quotes/ui/QuoteActions.tsx:229-391` | **money screen(견적 상세)에 발송 액션 부재** — 발송이 QuoteForm footer에만 있어 draft 저장 후 상세에서 Edit로 우회해야 발송 가능 | 상세 액션 바에 `Send to Client`(draft일 때 primary) + 재전송 추가 |
| C2 | `modules/materials/ui/MaterialItemList.tsx:142,399,448` | **가격북(v1 핵심) 아이템 삭제가 확인 없이 즉시 영구 삭제**, undo 없음 | 기존 `ConfirmDialog` 연결 |
| C3 | `app/page.tsx` · `modules/auth/ui/AuthShell.tsx` · `app/subscribe/page.tsx` · `app/q/[token]/page.tsx` | 첫인상 화면 전부가 토큰 밖 하드코딩 그라디언트/그림자(#fcf9f4·brown rgba 등) | 팔레트 수렴 완료(§1) → hex를 토큰으로 치환만 남음 |

## 3. Major — 주제별 클러스터 (29)

**A. 토큰 위반 (값은 §1로 정리됨, 치환은 Codex)**
- `bg-white` **241회/50파일**: PriceRatesForm 34 · ScheduleCalendar 28(문서 기록과 정확히 일치, 미해결) · QuoteForm 15 · PublicQuoteClient 14 · QuickQuoteBuilder 14 · WorkspaceAssistant 12 · JobEditForm 10 등 → `bg-surface-container-lowest`(카드) 또는 계층 토큰
- `text-white`/`border-white` 16회: 공개 견적 hero(`PublicQuoteClient:323-345`), PricingSection Starter CTA(`:441` — `bg-on-surface text-white` 역할 오용 + 보조 CTA가 Pro보다 강조되는 위계 역전) → `text-on-primary`/`text-on-tertiary` 계열
- className hex 5곳(랜딩·AuthShell·subscribe·q/[token] 장식) — §1 수렴 후 토큰 치환
- `border-black/5` (CustomerTable:79, JobsWorkspace:400) → `border-outline-variant`

**B. 접근성 (페르소나: 장갑+햇빛)**
- **`text-outline`을 정보 텍스트로 오용 — 대비 ~1.5:1**: InvoiceDetail 16곳 · InvoiceTable 9 · InvoiceKpiBand · InvoiceForm 4 (송장번호, 'AUD', KPI 라벨) → `text-on-surface-variant`
- **공유 프리미티브 15개 focus-visible 부재** (BackButton, BackLink, modal, ConfirmDialog, table 등 — input/select만 보유) → `focus-visible:ring` 표준화
- 커스텀 모달 3종 dialog 시맨틱/focus trap/Esc 부재: QuoteActions 삭제모달(:432), ScheduleCalendar 2종(:537,761), ConfirmDialog(기존 부채)
- 아이콘 전용 버튼 aria-label 누락: LineItemPicker:113,228,348
- 44px 미달 인터랙티브 ~15곳: quotes/[id] Edit `h-8`(:192) · JobEditForm inline input h-8/h-9(:255,301,331) · MaterialItemList 아이콘버튼 32/36px(:392,401,441,450) · PricingSection 토글/버튼(:262-310) · WorkspaceAssistant 칩(:215) · SignaturePad 탭(:144)

**C. 정본 컴포넌트 미사용 (드리프트)**
- `ErrorAlert` — **모듈 UI에서 0회 사용**, 인라인 `bg-error-container` 박스 29곳 재구현 (CustomerForm:761, JobEditForm:353, quotes/[id]:146, invoices/[id]/edit:34, auth 5곳 등)
- 상태 배지 스타일 맵 3곳 로컬 재구현 (quotes/[id]:20, QuoteTable:14, PublicQuoteClient:40) — `StatusBadge`+`QUOTE_STATUS_TONE`로 통일
- `PageHeader` 미사용: settings/billing:35(raw h2) · 뒤로가기 3종 혼재(BackButton/BackLink/PageHeader.backHref — 정본 1종 확정 필요)
- 네이티브 `alert()`/`window.confirm` 잔존: JobDetail:107,111 · PricingSection:95-157 · DuplicateQuoteButton:21 → ConfirmDialog/ErrorAlert/toast
- inline FIELD/LABEL const 폐기 미이행: MaterialItemForm:13 · InteriorEstimateBuilder:42 · signup:26 · OnboardingForm:47 · BusinessProfileForm:33 → FormField 이관

**D. 상태 3종**
- `loading.tsx` 누락 5 라우트: jobs · schedule(Google fetch로 특히 느림) · materials-service · price-rates · settings(+billing/subscribe)
- quotes/[id]·q/[token] 스켈레톤 부재 (money/고객 화면), customers/[id]는 list 스켈레톤 오용
- invoices/[id]:28 — DB 오류를 `notFound()`로 위장(에러≠부재) → error boundary로 분리
- 빈 상태 CTA 부재: QuoteTable:178 · InvoiceTable:284 ("No X yet"에 + New CTA 없음)

**E. UX 흐름**
- 대시보드(Starter)에서 UpgradePrompt가 미수금 KPI보다 상단 — 일일 우선순위 역전 (dashboard:324)
- 'Revenue this month'(dashboard:111)가 KPI 밴드의 'Paid this month'와 다른 정의(paid_at vs paid_date·상태 무검사) — 같은 달 두 금액 표시
- 온보딩 하드월: 7필드 전부 필수 + skip 없음 (OnboardingForm:27-43) — 최소필수(상호+ABN)로 축소 권고
- 공개 견적 Decline 확인 없음 (PublicApprovalForm:215) — 비가역 액션
- `/demo/schedule` 인증 없이 공개 + 실 mutation 서버액션 배선 + "DEMO MODE" 개발자 배너 노출 — 프로덕션 제외/가드 필요
- schedule/page:40 비로그인 시 `return null` 빈 화면 (타 페이지는 redirect('/login'))

## 4. Minor/Nit 요약 (59)

- **타이포**: arbitrary px **171곳**(10px 80 · 10.5px 42 · 11px 28 …) — `text-[10.5px] font-bold uppercase tracking-[…]` 라벨 패턴 40+ 복붙 → `SectionLabel` 프리미티브 신설로 수렴. `tracking-[…]` 79곳은 0.14em/0.18em/-0.02em 3종으로 수렴 가능
- **radius 표류**: rounded-lg 262 vs xl 349 vs 2xl 137 — 정본 컴포넌트도 위반(PrimaryActionLink=lg, ErrorAlert=lg, card.tsx=xl) → 규칙(button/input=xl, 카드=2xl)로 정렬
- **입력 규격**: ScopeBuilder h-11 rounded-lg 다수 · QuoteTable 검색 rounded-lg border-none · JobEditForm h-8/9/11 혼재 · auth/onboarding rounded-lg+bg-white+text-sm(iOS 줌 유발) → h-12 rounded-xl text-base
- **focus 스타일 이원화**: 레거시 `focus:border-primary-container`+`ring-primary-fixed/30`(약함) vs 정본 `focus:border-primary`+`ring-primary/20` → 정본 통일
- **금액**: tabular-nums 갭은 §1 전역 적용으로 해소. formatAUD 로컬 재구현 2곳(LineItemsSection:11, MaterialItemList:16) → 공용 import
- **카피**: "+ Add event"(ScheduleCalendar)·"Add First Item"(MaterialItemList:289)·"New Job"(+ 누락, JobsWorkspace:180)·"New Invoice"(+ 누락, dashboard:229) → "+ New {Entity}" · 로그인 서브카피 "without losing the warm Coatly tone" 메타 카피 → 사용자 가치 문구로 · 랜딩/manifest 포지셔닝은 "quotes/invoices/follow-ups"로(manifest는 반영 완료)
- **컨테이너**: quotes/[id]/edit `lg:max-w-7xl`(규칙 6xl) · jobs/[id]/edit `lg:max-w-4xl`(복합폼인데 축소) · dashboard wrapper `space-y-5 sm:space-y-8` · settings `gap-8 sm:gap-10` → 정본 `gap-4 sm:gap-6`
- **레이어**: Sidebar 데스크탑 `z-50`→`z-40` · PriceRatesForm sticky bar `z-10 bg-white/92`→`z-30`+토큰 · toast `z-[100]`는 문서화 완료
- **일관성**: auth 셸 이원화(login/signup=AuthShell vs forgot/reset=단순 카드) · signup만 monolithic page(타 auth는 PageClient 분리) · Sidebar 로고 하드코딩("C" 박스, BrandLogo 미사용) + inline letterSpacing · UpgradePrompt 두 CTA 동일 목적지 · InvoiceDetail 타임라인 sent 시각을 created_at로 대체 표기 · 비밀번호 show/hide 토글 부재 · Follow-up 카드 aging 신호 부재 · QuickEstimateTab만 raw type="number"(NumericInput 미사용) · 진행바 inline width(동적 예외 — 문서화 필요)

## 5. 집행 현황 (2026-07-19 갱신)

- **P0 — 전부 완료**: C1 발송 액션(`sendQuoteToClient` + Send/Resend UI) · C2 삭제 ConfirmDialog · text-outline→on-surface-variant 일괄 · loading.tsx 9 라우트 · /demo/schedule 프로덕션 가드 + schedule 비로그인 redirect
- **P1 — 전부 완료**: bg-white 0건 치환 · ErrorAlert/StatusBadge/ConfirmDialog/toast 정본 채택 · focus-visible 표준화 · 44px 터치 타겟 · 온보딩 최소필수(상호+ABN, 서버 검증 동기화) · 대시보드 KPI/업셀 순서 + Revenue 정의를 KPI 밴드 시맨틱으로 통일
- **P2 — 대부분 완료**: SectionLabel 신설·채택 · radius/입력 규격 정렬 · 카피(+ New 패턴, 로그인 서브카피) · auth 셸 통일(forgot/reset→AuthShell) · 死코드 제거 · 컨테이너 너비 3곳
- **잔여 (Codex 후속)**: ① `types/database.ts` 재생성(quotes.customer_email/address 미타입 → cast 우회 제거) ② QuickEstimateTab→NumericInput(테스트 12+ 동반 수정) ③ JobDetail/jobs 로컬 status map 3곳 StatusBadge 통합 + overline 10곳 SectionLabel(디자인 판단 필요) ④ 밀집 UI 의도적 예외 유지: PriceRatesForm rate-matrix rounded-lg, Sidebar 탭바 10px 캡션, JobDetail 헤더 compact Edit
- **회귀 가드 결과**: build exit 0 · lint 0 · test 530/530 · `bg-white`/`text-outline`/`alert(` grep 0건 달성 (예외: PDF 템플릿·global-error·SignaturePad canvas API)

## 6. 잘된 점 (유지)

- 원색 Tailwind 팔레트 직접 사용 **0건** — MD3 색 토큰 규율 자체는 정착
- `formatAUD` 단일 유틸 197 호출 · InvoiceKpiBand의 paid_this_month Sydney 월 정의 정확 · 좌보더 상태 매핑 전역 일치
- InvoiceForm = 정본 프리미티브 풀세트 모범 사례 · PriceRatesForm 저장바 3상태 피드백 · PublicDatePickerStep 상태/접근성 레퍼런스급
- auth 흐름 완결성(reset 4상태+복구 경로) · 폼 라벨/aria/inputMode 기본기 · JobDetail 완료→인보이스 유도 흐름
