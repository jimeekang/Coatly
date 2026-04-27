# Feature: AI Assistant (Phase 2)

> ⚠️ 이 기능은 Phase 2 예정. 기반 코드가 존재하지만 아직 프로덕션 준비 안 됨.

## Overview

AI가 견적서 초안을 생성하고, 워크스페이스 어시스턴트로 사용자를 도와주는 기능.

## Components

### 1. AI Draft Panel

- 위치: `components/ai/AIDraftPanel.tsx`
- 기능: 작업 설명 입력 → AI가 방/면적/가격 초안 생성
- Pro 플랜 전용 (`lib/subscription/access.ts`에서 게이팅)

### 2. Workspace Assistant

- 위치: `components/dashboard/WorkspaceAssistant.tsx`
- 기능: 채팅 UI로 질문 응답 (견적 팁, 가격 조언 등)
- 서버 액션: `app/actions/workspace-assistant.ts`

## 기술 스택

- Google Gemini via Genkit (`lib/ai/drafts.ts`)
- 타입: `lib/ai/draft-types.ts`

## 사용 조건

- `subscription.plan === 'pro'`
- Starter 사용자에게는 UpgradePrompt 표시

## TODO (Phase 2)

- [ ] Gemini API 키 환경변수 설정
- [ ] 프롬프트 튜닝 (호주 페인팅 컨텍스트)
- [ ] 스트리밍 응답 구현
- [ ] 사용량 제한 (일일/월간)
- [ ] 에러 핸들링 (API 장애 시 graceful degradation)
- [ ] AIDraftPanel을 Quote 생성 화면에 노출 (Phase 3 Stage 3에서 권장됨)
