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
- [x] Good/Better/Best tier pricing
- [x] Quote PDF generation (React-PDF + business branding)
- [x] Quote status workflow (draft → sent → accepted/declined/expired)

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

### Phase 2로 이월 (placeholder 상태)
- [ ] Jobs 페이지
- [ ] Schedule 페이지
- [ ] Materials & Services 페이지

---

## Phase 2 — AI & Advanced Features (예정)

- [ ] AI quote drafting (Gemini integration — 기반 코드 존재)
- [ ] Workspace Assistant (AI chat — 기반 코드 존재)
- [ ] Smart pricing suggestions
- [ ] Quote templates / saved presets
- [ ] Email automation (quote/invoice 발송)
- [ ] Dashboard analytics (KPI, 매출 추이)

---

## Phase 3 — Integrations (계획)

- [ ] Xero/MYOB accounting sync
- [ ] Email notifications (Resend)
- [ ] Job costing (자재비 vs 실제 비용)
- [ ] Client portal (고객이 견적 확인/승인)

---

## Out of Scope (제안 금지)

- GPS tracking
- Team scheduling
- Supplier integrations
- Native app (React Native 등)
- Multi-language (i18n)
