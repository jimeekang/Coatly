---
description: 테스트 작성/실행, 코드 리뷰, RLS 보안 체크. 배포 전 필수 게이트
argument-hint: [검증할 파일 또는 기능명]
allowed-tools: Read, Write, Bash(npx tsc*), Bash(npx eslint*), Bash(npx vitest*)
---

검증 대상: $ARGUMENTS

## 실행 순서

1. .claude/skills/test-writer/SKILL.md 읽기
2. npx tsc --noEmit 실행
3. npx eslint 변경된 파일들 실행
4. 대상 파일마다 테스트 작성:
   - Server Action → mock 기반 단위 테스트
   - React 컴포넌트 → Testing Library 테스트
   - 유틸 함수 → 순수 단위 테스트
5. npx vitest run 실행
6. 실패하면 원인 분석 후 코드 수정, 다시 실행 (최대 3회)
7. 보안 체크:
   - RLS 없는 테이블 쿼리 있는지
   - user_id 필터 누락 있는지
   - 환경변수 하드코딩 있는지

## 통과 기준

- tsc 에러 0개
- eslint 에러 0개
- 테스트 전부 통과
- RLS + user_id 필터 확인 완료

## 완료 후 출력

### PASS인 경우

Quality 리포트: PASS
tsc: PASS / eslint: PASS / 테스트: N개 통과
다음 단계: /release "feat: [기능명]"

### FAIL인 경우

Quality 리포트: FAIL
원인: [구체적 문제]
다음 단계: /build [수정 필요한 내용]
