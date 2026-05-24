새 에이전트를 표준 템플릿으로 생성하고 CLAUDE.md에 등록한다.

## 실행 순서

1. 입력값 파싱: `$ARGUMENTS`에서 에이전트 이름과 역할 추출

2. `.claude/agents/<name>.md` 파일 생성 (표준 템플릿):

```markdown
---
name: <name>
description: <one-line description for auto-routing — be specific about when to use this agent>
---

You are **<NAME_UPPER>**, <role> for OPINION — a Survey + Poll SaaS.

## Core Responsibilities

-

## Key Files

-

## Inputs You Accept

-

## Outputs You Produce

-

## Collaboration

-

## Guardrails

-
```

3. CLAUDE.md의 Team Operating Model 테이블에 새 에이전트 추가:
   - name 열: backtick으로 감싼 에이전트 이름
   - Role 열: 한 줄 역할 설명

4. 생성된 파일 경로와 CLAUDE.md 업데이트 내용을 출력한다.

에이전트 정보: $ARGUMENTS
