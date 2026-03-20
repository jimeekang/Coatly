---
description: git commit + push + Vercel 배포 + Notion PRD 동기화. quality PASS 없으면 실행 거부
argument-hint: [커밋 메시지]
allowed-tools: Read, Write, Bash(git*), Bash(vercel*)
---

커밋 메시지: $ARGUMENTS

## 실행 전 확인

현재 대화에서 "Quality 리포트: PASS"가 없으면 즉시 중단하고 아래 출력:
"먼저 /quality [파일명] 을 실행하세요."

## 실행 순서

1. .claude/skills/doc-sync/SKILL.md 읽기
2. git add -p (변경사항 확인)
3. git commit -m "$ARGUMENTS"
4. git push origin main
5. Vercel 배포 확인 (자동 트리거 또는 vercel --prod)
6. Notion PRD 업데이트 (doc-sync skill 지침 따르기)
7. CLAUDE.md의 Current Phase 체크리스트 업데이트

## 커밋 메시지 규칙

- feat: 새 기능
- fix: 버그 수정
- chore: 설정/의존성
- refactor: 코드 개선 (기능 변경 없음)
- test: 테스트 추가/수정
- docs: 문서만 변경

## 절대 금지

- quality PASS 없이 push
- .env 파일 커밋
- main 브랜치에 --force push

## 완료 후 출력

커밋: [hash] [message]
배포: [Vercel URL]
Notion: [업데이트된 항목]
CLAUDE.md: [체크된 항목]
