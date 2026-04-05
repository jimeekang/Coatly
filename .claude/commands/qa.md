---
description: gstack QA workflow 실행, 브라우저 테스트 후 버그를 수정하고 재검증
argument-hint: [테스트 대상 또는 URL]
allowed-tools: Read, Write, Bash
---

테스트 대상: $ARGUMENTS

`~/.codex/skills/gstack-qa/SKILL.md`를 읽고 그 workflow를 끝까지 따른다.

규칙:

1. 단순 체크리스트 답변으로 끝내지 말고 실제 QA를 수행
2. 가능하면 dev 또는 preview URL을 찾아 브라우저 기반으로 검증
3. 버그를 찾으면 원인 수정, 재검증, 결과 요약까지 포함
4. skill 내부의 AskUserQuestion, 검증 단계, 보고 형식을 유지
