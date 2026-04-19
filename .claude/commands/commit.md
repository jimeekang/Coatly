---
description: Git add, commit, push를 최소 토큰으로 처리
argument-hint: [커밋 메시지]
allowed-tools: Bash(git add*), Bash(git status*), Bash(git commit*), Bash(git push*), Bash(git log*)
model: haiku
---

커밋 메시지: $ARGUMENTS

## 실행

1. `git status` — 변경 파일 확인
2. `git add -p` 대신 명시적 파일만 스테이징 (민감 파일 제외: .env*, *.local)
3. `git commit -m "$ARGUMENTS\n\nCo-Authored-By: Claude Haiku <noreply@anthropic.com>"`
4. `git push`

## 규칙
- .env, .env.local, secrets 포함 파일 절대 커밋 금지
- 커밋 메시지 없으면 `git log --oneline -5` 참고해서 컨벤션 맞춰 자동 생성
- push 전 현재 브랜치가 main이면 사용자에게 확인 요청
