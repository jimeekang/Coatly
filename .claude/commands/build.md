---
description: UI + backend + Supabase 통합 구현. 컴포넌트, server action, DB query, RLS를 한 번에 처리
argument-hint: [구현할 기능 또는 파일명]
allowed-tools: Read, Write, Bash(npx tsc*), Bash(npx eslint*), Bash(npx vitest*)
---

구현할 기능: $ARGUMENTS

## 실행 순서

1. CLAUDE.md를 읽고 스택/제약사항 확인
2. 작업 유형에 따라 skill 파일 읽기:
   - UI 포함 → .claude/skills/ui-spec/SKILL.md 읽기
   - DB 변경 포함 → .claude/skills/db-schema/SKILL.md 읽기
3. 변경/생성할 파일 목록 먼저 출력
4. 아래 레이어 순서로 구현:
   1. DB schema 변경 (필요 시) + migration 파일
   2. TypeScript types 업데이트
   3. Server Action (app/actions/)
   4. React 컴포넌트 (components/)
   5. Page (app/(dashboard)/)
5. npx tsc --noEmit 실행
6. npx eslint 변경된 파일들 실행
7. 오류 있으면 수정 후 5번부터 반복 (최대 3회)

## 구현 체크리스트

- [ ] Server Component에서 auth.getUser() 확인
- [ ] 모든 Supabase query에 .eq('user_id', user.id)
- [ ] 모든 숫자 입력에 inputMode="numeric"
- [ ] 모든 CTA 버튼 h-12 이상 (44px+)
- [ ] loading/error 상태 처리
- [ ] 금액 표시는 formatAUD() 사용
- [ ] Server Action에서 revalidatePath() 호출

## 금지 사항

- onClick 안에서 직접 Supabase 호출 금지
- any 타입 사용 금지
- components/ui/ 파일 수정 금지
- Puppeteer 사용 금지 (PDF는 React-PDF만)
- tsc 에러 무시하고 넘어가기 금지

## 완료 후 출력

구현된 파일 목록과 함께 아래 출력:
tsc: PASS / lint: PASS
다음 단계: /quality [구현된 파일들]