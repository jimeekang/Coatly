# Spec: New User Onboarding

> 인증 미들웨어·ABN autofill 구현 상세 → [`design-docs/auth-onboarding.md`](../design-docs/auth-onboarding.md)

## User Story

> 호주 페인터로서, 가입 후 사업자 정보를 입력하면 바로 견적서를 만들 수 있도록 안내받고 싶다.

## Flow

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

## Acceptance Criteria

- [ ] ABN 입력 시 ABR API로 자동 검증 + 사업자명 autofill
- [ ] 필수 필드 미입력 시 다음 단계 진행 불가
- [ ] 온보딩 완료 전 대시보드 접근 불가 (middleware 강제)
- [ ] 로고 업로드는 5MB 이하 이미지만 허용
- [ ] 온보딩 도중 이탈 후 재접속 시 마지막 상태 유지

## Edge Cases

- ABR API 장애 시: 수동 입력 허용 + "나중에 확인" 옵션
- 네트워크 끊김 시: 로컬 상태 보존, 재연결 시 제출
