# Feature: Auth & Onboarding

## User Story

> 호주 페인터로서, 가입 후 사업자 정보를 입력하면 바로 견적서를 만들 수 있도록 안내받고 싶다.

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

### 단계별 상세 흐름

1. `/signup` → 이메일 + 비밀번호 입력
2. 이메일 확인 → `/login`
3. 첫 로그인 → middleware가 `onboarding_completed = false` 감지
4. `/onboarding` 리다이렉트
5. 단계별 폼:
   - Step 1: 상호명 (필수) + ABN (필수, 자동 검증)
   - Step 2: 연락처 + 주소 (선택)
   - Step 3: 로고 업로드 (선택)
6. 완료 → `profiles.onboarding_completed = true`
7. `/dashboard` 리다이렉트

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

## Acceptance Criteria

- [ ] ABN 입력 시 ABR API로 자동 검증 + 사업자명 autofill
- [ ] 필수 필드 미입력 시 다음 단계 진행 불가
- [ ] 온보딩 완료 전 대시보드 접근 불가 (middleware 강제)
- [ ] 로고 업로드는 5MB 이하 이미지만 허용
- [ ] 온보딩 도중 이탈 후 재접속 시 마지막 상태 유지

## Edge Cases

- ABR API 장애 시: 수동 입력 허용 + "나중에 확인" 옵션
- 네트워크 끊김 시: 로컬 상태 보존, 재연결 시 제출

## 설계 결정

### 왜 소셜 로그인 없이 이메일만?

타겟 사용자(호주 페인터)가 Google/Apple 로그인보다 이메일이 더 친숙.
소셜 로그인은 Phase 2+ 고려.

### 왜 onboarding을 별도 경로로?

- 첫 로그인 시 필수 정보(사업자명, ABN)가 없으면 견적서를 생성할 수 없음
- middleware 레벨에서 강제하여 누락 방지
- 온보딩 완료 전에는 대시보드 접근 불가
