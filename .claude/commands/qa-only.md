---
description: gstack QA 리포트 전용 workflow 실행, 테스트만 하고 코드는 수정하지 않음
argument-hint: [테스트 대상 또는 URL]
allowed-tools: Read, Bash
---

테스트 대상: $ARGUMENTS

`~/.codex/skills/gstack-qa-only/SKILL.md`를 읽고 그 workflow를 끝까지 따른다.

규칙:

1. 실제 브라우저 QA를 수행
2. 버그를 재현하고 증거를 수집
3. 코드 수정은 하지 말고 리포트만 남긴다
