# Execution Plan: Phase 1 — Core Features

> Status: ✅ 거의 완료 (2026-03 기준)

## 목표

견적서, 청구서, 고객 관리, 구독의 핵심 CRUD + PDF 생성 + Stripe 연동을 완성한다.

## 완료된 작업

### Quote Builder ✅
- [x] Quote CRUD server actions (`app/actions/quotes.ts`)
- [x] QuoteForm, QuoteTable, QuoteDetail 컴포넌트
- [x] Room/Surface 2단계 구조
- [x] Good/Better/Best 티어 가격 계산
- [x] Quote PDF 생성 (`/api/pdf/quote`)
- [x] 테스트: `quotes.test.ts`, `QuoteForm.test.tsx`, `QuoteTable.test.tsx`

### Invoice System ✅
- [x] Invoice CRUD server actions (`app/actions/invoices.ts`)
- [x] InvoiceForm, InvoiceTable, InvoiceDetail 컴포넌트
- [x] Line item 관리
- [x] Invoice PDF 생성 (`/api/pdf/invoice`)
- [x] 테스트: `invoices.test.ts`, `InvoiceForm.test.tsx`, `InvoiceTable.test.tsx`

### Customer Management ✅
- [x] Customer CRUD server actions (`app/actions/customers.ts`)
- [x] CustomerTable, CustomerForm, CustomerDetail 컴포넌트
- [x] Soft delete (is_archived)

### Subscription & Billing ✅
- [x] Stripe Checkout integration
- [x] Customer Portal
- [x] Webhook sync (5 events)
- [x] Cancellation & renewal flow
- [x] Feature gating (Starter vs Pro)

### Business Profile ✅
- [x] Onboarding flow + ABN autofill
- [x] Logo upload (Supabase Storage)
- [x] Bank details for invoices

## 남은 작업

- [ ] Jobs 페이지 구현 (현재 placeholder)
- [ ] Schedule 페이지 구현 (현재 placeholder)
- [ ] Materials & Services 페이지 구현 (현재 placeholder)

## DB Migrations 현황

13개 마이그레이션 완료 (001~013):
- 001: 초기 스키마
- 002: RLS 정책
- 003: DB 함수
- 004: onboarding_completed
- 005: Auth signup guard
- 006: businesses 테이블
- 007: Business 주소 + 로고 버킷
- 008: 멀티테넌트 무결성
- 009: Security definer 함수 강화
- 010: RLS 부모 소유권 검사 강화
- 011: 모호한 FK 제거
- 012: 구독 취소 상태
- 013: 비공개 비즈니스 스토리지 버킷
