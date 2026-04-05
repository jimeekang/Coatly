---
description: gstack canary workflow 실행, 배포 후 화면/오류/성능 이상 여부 모니터링
argument-hint: [배포 URL]
allowed-tools: Read, Bash
---

모니터링 대상: $ARGUMENTS

`~/.codex/skills/gstack-canary/SKILL.md`를 읽고 그 workflow를 따른다.

규칙:

1. 배포 URL 기준으로 라이브 상태를 확인
2. 콘솔 오류, 페이지 실패, 시각 이상, 성능 이상 징후를 점검
3. 결과는 ship 가능 여부 중심으로 간단히 요약
