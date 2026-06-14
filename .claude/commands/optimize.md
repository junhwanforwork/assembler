---
description: 진단·최적화 계획 — assembler-optimizer로 현재 코드·구조·API·DB를 분석해 근본원인·공수·우선순위 리포트를 만든다. 코드는 안 고친다. 설계: docs/specs/optimization-planner.md.
---

# /optimize — 진단·최적화 계획 (구현 전 판단)

코드를 고치기 전에 "왜 느린가/뭐가 문제인가/어디 고치나/얼마 걸리나/리스크/뭐부터"에 답하는 진단 리포트를 만든다. **이 커맨드는 구현하지 않는다** — 진단만 하고 다음 워크플로우로 인계한다.

$ARGUMENTS = 이슈 서술(예: "프로젝트 로드가 느림") 또는 티켓 ID(예: `ASS-033`).

---

## Step 0 — 입력 정리

`$ARGUMENTS`가 비었으면 무엇을 진단할지 한 줄로 물어본다(이슈·증상·대상 범위).
티켓 ID면 `memory/tickets.md`에서 해당 항목 맥락을 읽어 함께 전달한다.

## Step 1 — assembler-optimizer 호출

`assembler-optimizer` 에이전트를 호출한다. 전달:
- 이슈 서술 / 티켓 맥락
- 의심 범위(파일·라우트·API·DB)가 있으면 함께

에이전트는 `docs/specs/optimization-planner.md`의 워크플로우(Analyze→Identify→Root Cause→Research→Recommend→Estimate→Prioritize→Plan)와 출력 포맷을 따른다. 성능은 perf-diagnosis 7단계 위임, 버그는 `/investigate`로 넘긴다.

## Step 2 — 리포트 저장

에이전트 산출물을 **`docs/specs/diagnosis/{slug}.md`**에 저장한다.
- `{slug}` = 이슈를 요약한 kebab-case (예: `project-load-latency`). 티켓이면 `ASS-0XX-{slug}`.
- 섹션 누락 없이(Summary/Problem/Root Cause/Recommendation/Effort/Priority/Implementation Plan/Risk).

## Step 3 — 요약 + 다음 액션

아래를 출력한다:

```
진단: docs/specs/diagnosis/{slug}.md
우선순위: {Critical/High/Medium/Low} — {한 줄 근거}
핵심 원인: {한 문장}
추천 1순위: {방안} (공수 {Total}, Risk {레벨})

다음 액션:
- 구현 인계: /cowork 또는 /autopilot 또는 /multi-team (티켓화 필요 시 tickets.md 추가)
- High/Critical Risk면 /multi-team 병렬 3팀 + /cross-check 풀
```

---

## 경계 (지킬 것)

- **코드 수정 금지.** 이 커맨드와 assembler-optimizer는 진단만 한다. 고치고 싶으면 인계 워크플로우로.
- 버그 → `/investigate`, 변경 diff 리뷰 → `/cross-check`로 보낸다(중복 진단 금지).
- 추정 금지 — 모든 원인은 파일:라인·측정 근거로.

입력: $ARGUMENTS
