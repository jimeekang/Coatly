# Coatly — Roadmap & Phase Tracking

> 이 파일이 Phase 진행 상황의 **단일 소스**입니다.
> CLAUDE.md, AGENTS.md의 Phase 섹션은 이 파일을 참조합니다.

## Phase Overview

| Phase | 이름 | 상태 | 기간 |
|-------|------|------|------|
| 0 | Foundation | ✅ 완료 | Week 1–2 |
| 1 | Core Features | ✅ 완료 | Week 3–6 |
| 2 | AI & Advanced | 🔜 예정 | TBD |
| 3 | Integrations | 📋 계획 | TBD |

---

## Phase 0 — Foundation ✅

- [x] Project init + folder structure
- [x] Supabase schema + RLS policies (15 migrations)
- [x] Auth flows (email/password + onboarding)
- [x] Stripe subscription setup (checkout, portal, webhook)
- [x] Vercel deployment

---

## Phase 1 — Core Features ✅ (2026-03 완료)

### Quote Builder
- [x] Quote CRUD (create, read, update, delete)
- [x] Room-by-room surface breakdown
- [x] Standard/Moderate/Complex complexity pricing
- [x] Quote PDF generation (React-PDF + business branding)
- [x] Quote status workflow (draft → sent → approved/rejected/expired)

### Invoice System
- [x] Invoice CRUD
- [x] Line item management
- [x] Invoice PDF generation
- [x] Invoice types (full, deposit, progress, final)
- [x] Payment tracking (amount_paid_cents, paid_at)

### Customer Management
- [x] Customer CRUD
- [x] Customer archiving (soft delete)
- [x] Customer-Quote-Invoice relationship

### Business Profile
- [x] Onboarding flow
- [x] ABN autofill (Australian Business Register)
- [x] Business logo upload (Supabase Storage)
- [x] Bank details for invoices

### Subscription & Billing
- [x] Stripe Checkout integration
- [x] Customer Portal (manage subscription)
- [x] Webhook sync (subscription state → DB)
- [x] Cancellation & renewal flow
- [x] Feature gating (Starter vs Pro)

### Interior Estimate & Quick Quote
- [x] InteriorEstimateBuilder 컴포넌트
- [x] QuickQuoteBuilder 컴포넌트
- [x] Rate Settings (price-rates 페이지 + PriceRatesForm)
- [x] interior-estimates, rate-settings, quick-quote-mapper 라이브러리

### Testing
- [x] Vitest + Testing Library setup
- [x] 20+ test files (actions, API routes, components, utils)

### Phase 1 추가 완료
- [x] Jobs 페이지 (JobsWorkspace — CRUD, 상태 관리)
- [x] Schedule 페이지 (일정 목록, 월별 통계)
- [x] Materials & Services 페이지 (재료/서비스 CRUD, CSV 임포트)

---

## Phase 2 — AI & Advanced Features (진행 중)

> **시작:** 2026-Q2
> **기준일:** 2026-04-12

### 완료된 항목
- [x] Workspace Assistant (AI chat — dashboard, Pro-gated, Gemini 2.5 Flash)
- [x] Quote templates (Starter 5개, Pro 무제한)
- [x] Email automation (quote 발송, invoice 발송, approval notification, 리마인더 cron)

### P1 — 높은 가치 / 단기 완료 가능
- [ ] **Dashboard analytics** — 월별 매출 추이 차트, quote pipeline 현황 (현재: 당월 KPI 카드 3개만 존재)
- [ ] **AI Quote Drafting UX** — Quote 생성 화면 내 "AI로 초안 작성" 버튼 (인프라: `lib/ai/drafts.ts` + `generateWorkspaceDraft` 완비, UX 미노출)

### P2 — 중간 가치
- [ ] **Smart pricing suggestions** — 작업 유형/히스토리 기반 단가 제안
- [ ] **Job costing** — Jobs에 실제 자재비 입력 → 견적 대비 실비 비교

### P3 — 낮은 우선순위 (Phase 3으로 이월 가능)
- [ ] Xero/MYOB accounting sync

---

## Phase 3 — Integrations (계획)

- [ ] Xero/MYOB accounting sync (P3 이월 항목 포함)
- [x] Email notifications (Resend — invoice reminders cron 구현 완료)
- [x] Job costing → P2로 앞당김
- [x] Client portal (공개 견적 링크 `/q/[token]` 구현 완료 — 고객 확인/서명/날짜 선택)

---

## Out of Scope (제안 금지)

- GPS tracking
- Team scheduling
- Supplier integrations
- Native app (React Native 등)
- Multi-language (i18n)
