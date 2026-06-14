# Optimization Planner — 진단·계획 전용 에이전트 설계

코드를 고치기 전에 **진단하고 다음 액션을 결정하는** 판단 에이전트의 단일 출처.
구현체: `.claude/agents/assembler-optimizer.md`(에이전트) · `.claude/commands/optimize.md`(커맨드).
확정일: 2026-06-14.

## Origin

우리에겐 진단 자산이 흩어져 있다 — `/investigate`는 **버그** 한정, `perf-diagnosis.md`는 **성능**
한정, `code-reviewer`는 **변경된 diff** 리뷰 한정. 하지만 "API 호출 과다·중복 로직·복잡한 상태
관리·유지보수 비용·높은 개발 비용"처럼 **버그도 성능도 아닌 구조적 문제**를 진단하고, 그걸
공수·우선순위로 정량화해 "뭐부터 할지" 답하는 상위 진단자가 없다. Optimization Planner가
그 빈틈을 메운다.

핵심 불변식: **이 에이전트는 코드를 작성·수정하지 않는다.** 도구 수준에서 강제한다
(에이전트 `tools`에 Edit/Write 없음). 산출물은 진단 리포트뿐 — 구현은 별도 워크플로우로 인계.

## 역할 경계 (중복 금지)

| 상황 | 담당 | optimizer는 |
| --- | --- | --- |
| 버그(재현되는 오작동) | `/investigate` (근본원인·3-strike) | 넘긴다 |
| 성능(체감 느림) | `perf-diagnosis.md` 7단계 | **방법론으로 위임**해 진단 |
| 변경 diff 품질·보안 | `code-reviewer` | 넘긴다 |
| 구조·비용·중복·유지보수·아키텍처 | **optimizer** | 직접 진단 |

성능 케이스를 다룰 땐 perf-diagnosis의 7단계(증거→가설→타겟 리서치→패턴 대조)를 그대로
따른다 — 새 절차를 만들지 않는다.

## 워크플로우 (엄수 — 바로 구현으로 점프 금지)

```
Analyze → Identify Problem → Root Cause → Research → Recommend → Estimate → Prioritize → Plan
```

- **No evidence, no claim.** 모든 원인은 파일:라인 또는 측정 근거로 짚는다(추정 금지).
- 리서치 우선순위: 공식문서 > 프레임워크 메인테이너 > 제품 엔지니어링 블로그 > GitHub 이슈 > 개인 블로그.
- 다관점 평가가 필요하면 `team-perspectives.md`의 A(실용)/B(안정)/C(구조) 렌즈를 적용.

## 출력 — 진단 리포트

저장 위치: **`docs/specs/diagnosis/{slug}.md`** (cross-review 보드 패턴 계승).
섹션(모두 채운다):

```
## Summary           — 현재 문제 한 문단
## Problem           — 문제 목록: 설명 · Impact · Location(파일:라인/엔드포인트)
## Root Cause        — 문제별: Cause · Evidence(파일:라인/측정값)
## Recommendation    — 방안별: Description · Benefit · Drawback · Complexity · Risk · Expected Impact
## Effort Estimate   — FE · BE · DB · QA · Migration 분해 + Total
## Priority          — Critical/High/Medium/Low + Reason
## Implementation Plan — Step 1..N (구현은 안 함, 단계만)
## Risk              — 변경에 따른 리스크
```

## 모델

**Complexity** — XS(≤30m) · S(1~4h) · M(1~3d) · L(3~7d) · XL(1w+).
**Risk** — Low(변경 제한적) · Medium(기존 기능 영향 가능) · High(핵심 기능·데이터 영향) · Critical(서비스 장애 가능).
**Priority** — Critical/High/Medium/Low. 산정 기준: User Impact · Business Impact · Engineering Cost · Technical Debt · Risk.
**Effort 단위** — 30m · 1h · 4h · 1d · 3d · 1w · 2w+ · 1m+.

## 워크플로우 통합

1. **독립 실행:** `/optimize <이슈 서술 또는 티켓 ID>` → 리포트 생성.
2. **`/route` 진단 트랙:** 원인불명·느림·중복 로직·고비용·대규모 리팩터 신호면 구현 전 `/optimize`를
   먼저 돌리고, 리포트의 Priority·Implementation Plan으로 트랙(Full/Fast)·티켓을 정한다.
3. **구현 인계:** 진단 후 실제 구현은 `/cowork`·`/autopilot`·`/multi-team`으로 넘긴다 — optimizer는
   고치지 않는다.

## QA 연결 (사용자 요청 "qa rule" 접점)

- Recommendation의 **Risk가 cross-check 깊이를 정한다**: High/Critical → `/cross-check` 풀
  (code-reviewer + assembler-qa + API면 assembler-be), Low → 경량 검토.
- **Effort Estimate에 QA 시간을 반드시 포함**한다 — QA를 공짜로 치지 않는다(Bug Triage·cross-check 비용 반영).
- High/Critical Risk 방안은 구현 시 `/multi-team` 병렬 3팀 후보로 표시한다.

## 범위 밖

`/autopilot` 자동 트리아지(planner가 티켓 우선순위를 무인 사이클에 주입)는 다음 단계 — 이번엔
독립 `/optimize` + `/route` 진단 트랙까지.
