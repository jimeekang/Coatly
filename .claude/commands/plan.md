---
description: 새 기능 요청을 분석하고 subtask로 분해한 뒤 어떤 커맨드를 실행할지 알려줌
argument-hint: [기능 설명]
allowed-tools: Read
---

구현 요청: $ARGUMENTS

아래 순서로 진행:

1. CLAUDE.md를 읽고 Current Phase와 Out of Scope를 확인
2. 요청이 Out of Scope면 거절하고 이유 설명
3. 요청을 독립적인 subtask로 분해
4. 각 subtask마다 어떤 커맨드를 실행해야 하는지 출력

출력 형식:
## 작업 분석
- Phase 적합 여부:
- Out of scope 여부:

## Subtasks
1. [subtask 내용] → /build [...]
2. [subtask 내용] → /build [...]

## 시작 커맨드
/build [첫 번째 subtask]