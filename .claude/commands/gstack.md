---
description: 외부 gstack skill을 slash command에서 호출하는 공용 라우터
argument-hint: [skill 이름] [나머지 인자]
allowed-tools: Read, Write, Bash
---

입력: $ARGUMENTS

## 목적

첫 번째 인자를 gstack skill 이름으로 해석하고, 해당 외부 skill 문서를 읽은 뒤 그 workflow를 그대로 따른다.

## 지원 skill

- `qa` → `~/.codex/skills/gstack-qa/SKILL.md`
- `qa-only` → `~/.codex/skills/gstack-qa-only/SKILL.md`
- `browse` → `~/.codex/skills/gstack-browse/SKILL.md`
- `design-review` → `~/.codex/skills/gstack-design-review/SKILL.md`
- `canary` → `~/.codex/skills/gstack-canary/SKILL.md`
- `investigate` → `~/.codex/skills/gstack-investigate/SKILL.md`
- `review` → `~/.codex/skills/gstack-review/SKILL.md`
- `ship` → `~/.codex/skills/gstack-ship/SKILL.md`

## 실행 순서

1. `$ARGUMENTS`에서 첫 번째 토큰을 skill 이름으로 분리
2. 나머지 문자열은 해당 skill의 입력 컨텍스트로 전달
3. 위 매핑에 맞는 `SKILL.md`를 읽기
4. 해당 skill의 preamble, 체크리스트, 실행 규칙을 생략하지 말고 그대로 따르기
5. ad-hoc 답변으로 대체하지 말고 skill workflow를 우선 실행

## 예시

- `/gstack qa quote form`
- `/gstack qa-only https://coatly.vercel.app`
- `/gstack browse http://localhost:3000/login`
- `/gstack design-review quotes page`
- `/gstack canary https://coatly.vercel.app`

## 예외 처리

지원하지 않는 skill이면 아래 형식으로만 출력하고 중단:

`지원 skill: qa, qa-only, browse, design-review, canary, investigate, review, ship`
