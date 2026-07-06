---
name: commit
owner: codex
description: Git add, commit, push를 안전 규칙에 따라 처리 (git은 Codex(high) 도메인)
---

# Commit Skill (Codex · high)

> Owner: **Codex** (high) — git commit/push는 Codex 전용. Claude는 실행하지 않고 변경 요약만 전달한다.
> (구 `.claude/commands/commit.md`에서 이관 — 2026-07-05 역할·모델 경계 정리)

## 실행

1. `git status` — 변경 파일 확인
2. 명시적 파일만 스테이징 (`git add <files>`) — 민감 파일 제외: `.env*`, `*.local`, secrets 포함 파일
3. `git commit -m "<메시지>"` — 메시지 없으면 `git log --oneline -5` 참고해 컨벤션(`feat:`/`fix:`/`chore:`/`refactor:` + 소문자 요약)에 맞춰 생성
4. `git push`

## 규칙

- `.env`, `.env.local`, `.claude/settings.local.json`, secrets 포함 파일 절대 커밋 금지
- push 전 현재 브랜치가 `main`이면 사용자에게 확인 요청
- 커밋 범위는 요청된 변경만 — 무관한 워킹트리 변경을 함께 커밋하지 않는다
- 배포 트리거(main push → Vercel)임을 인지하고, lint/test/build 미통과 상태로 main push 금지
