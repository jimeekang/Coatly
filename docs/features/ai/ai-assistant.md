# Feature: AI Assistant

> Phase 2 기능. Workspace Assistant와 Quote AI Draft는 구현되어 있으며, 남은 핵심 작업은 governance/usage control입니다.

## Overview

AI가 견적서 초안을 생성하고, 워크스페이스 어시스턴트로 사용자를 도와주는 기능.

## Components

### 1. AI Draft Panel

- 위치: `components/ai/AIDraftPanel.tsx`
- 기능: 작업 설명 입력 → AI가 견적 초안 생성 후 폼에 적용
- Pro 플랜 전용 (`lib/subscription/access.ts`에서 게이팅)
- Quote 생성 화면에 노출됨 (`components/quotes/QuoteCreateScreen.tsx`)

### 2. Workspace Assistant

- 위치: `components/dashboard/WorkspaceAssistant.tsx`
- 기능: 채팅 UI로 workspace context 기반 응답/초안 생성
- 서버 액션: `app/actions/workspace-assistant.ts`

## 기술 스택

- Google Gemini via Genkit (`lib/ai/drafts.ts`)
- 타입: `lib/ai/draft-types.ts`

## 사용 조건

- `subscription.plan === 'pro'`
- Starter 사용자에게는 UpgradePrompt 표시

## Current Status

- [x] Gemini/Genkit 기반 quote draft
- [x] Dashboard Workspace Assistant
- [x] Pro plan gating + Starter upgrade prompt
- [x] Quote create screen AI draft panel
- [x] basic error handling
- [ ] 월간/일간 사용량 제한
- [ ] token/cost dashboard
- [ ] streaming 응답
- [ ] AI audit event 운영 조회
