# Design Doc: Auth & Onboarding

> 사용자 스토리·수용 기준 → [`product-specs/new-user-onboarding.md`](../product-specs/new-user-onboarding.md)

## Overview

이메일/비밀번호 인증 + 신규 사용자 온보딩 플로우.

## Auth Flow

```
/signup → 이메일 확인 → /login → middleware 체크
                                      │
                                      ├── onboarding_completed = false → /onboarding
                                      └── onboarding_completed = true  → /dashboard
```

### Middleware Routing

```ts
// lib/supabase/middleware.ts
const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password']
const onboardingPath = '/onboarding'

// 1. 인증 안 됨 + 보호 경로 → /login
// 2. 인증 됨 + 공개 경로 → /dashboard
// 3. 인증 됨 + onboarding 미완료 + 보호 경로 → /onboarding
// 4. 인증 됨 + onboarding 완료 → 통과
```

## Onboarding Steps

| Step | 입력 | 필수 |
|------|------|------|
| Business Name | 상호명 | ✅ |
| ABN | 11자리 → ABR API 자동 검증 | ✅ |
| Phone | 연락처 | 선택 |
| Address | 사업장 주소 | 선택 |
| Logo | 로고 업로드 (Supabase Storage) | 선택 |

완료 시 `profiles.onboarding_completed = true` → /dashboard 리다이렉트.

## ABN Autofill

```
1. 사용자가 ABN 11자리 입력
2. useAbnLookup hook → GET /api/abn-lookup?abn=XXX
3. API → ABR (Australian Business Register) 웹서비스 호출
4. 결과: { abn, name, state } → 사업자명 자동 채우기
```

## Profile vs Business

| Table | 용도 |
|-------|------|
| `profiles` | 인증 연동 프로필 (user_id = PK, 1:1 auth.users) |
| `businesses` | 비즈니스 상세 (주소, 로고, 기본 단가, PDF 브랜딩) |

## Password Reset Flow

```
/forgot-password → 이메일 입력 → Supabase 리셋 이메일 발송
                                          ↓
/reset-password → 새 비밀번호 입력 → 변경 완료 → /login
```

## 설계 결정

### 왜 소셜 로그인 없이 이메일만?

타겟 사용자(호주 페인터)가 Google/Apple 로그인보다 이메일이 더 친숙.
소셜 로그인은 Phase 2+ 고려.

### 왜 onboarding을 별도 경로로?

- 첫 로그인 시 필수 정보(사업자명, ABN)가 없으면 견적서를 생성할 수 없음
- middleware 레벨에서 강제하여 누락 방지
- 온보딩 완료 전에는 대시보드 접근 불가
