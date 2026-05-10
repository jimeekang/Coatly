---
description: 새 기능 요청을 분석하고 subtask로 분해한 뒤 Codex 구현 브리프를 출력
argument-hint: [기능 설명]
allowed-tools: Read
---

구현 요청: $ARGUMENTS

## 작업 순서

1. `CLAUDE.md`를 읽고 Out of Scope 확인
2. `docs/PLANS.md`에서 현재 Phase + 우선순위 확인
3. `docs/features/audit/audit.md`에서 활성 audit 항목과 충돌하는지 확인
4. 요청이 Out of Scope면 거절하고 이유 설명
5. 요청을 독립적인 subtask로 분해
6. UI/UX 결정이 필요하면 `.claude/skills/ui-spec/SKILL.md` 호출하여 스펙 작성
7. subtask별 Codex 구현 브리프 출력 — Codex가 받아 직접 구현·테스트

## 출력 형식

```
## 작업 분석
- Phase 적합 여부:
- Out of scope 여부:
- 우선순위 (P1/P2/P3 또는 신규):
- Audit 충돌 여부 (audit.md 참조):

## 디자인/UX 결정 (Claude Code가 산출)
- [ui-spec skill 결과 또는 핵심 UX 결정]

## Subtasks (Codex 구현용 브리프)

### Subtask 1: <title>
- 변경 파일: app/..., components/..., types/...
- DB 변경: <O / X — db-schema skill 필요 여부>
- 테스트: test-writer skill로 회귀 추가
- 수용 기준:
  - [ ] ...

### Subtask 2: <title>
...

## 다음 단계
사용자에게: "Codex로 전환해서 위 Subtask 1부터 구현하세요. DB 변경은 db-schema skill, 테스트는 test-writer skill 사용."
```

## 참고

- 현재 Phase 상태와 우선순위는 `docs/PLANS.md`가 단일 소스 — 여기에 하드코딩하지 말 것
- 활성 audit 위험은 `docs/features/audit/audit.md` 참조 (저장 비-원자성, Google Calendar fail-closed, AI 거버넌스, reminder 멱등성 등)
- 이 명령은 Claude Code 전용. Codex는 plan을 받아 구현만 담당.
