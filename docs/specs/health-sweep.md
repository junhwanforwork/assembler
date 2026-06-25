# Health Sweep — 시간 예산 기반 perf + QA·회귀 진단 루틴 설계

주기적으로 코드 건강을 점검하는 진단 스윕의 단일 출처.
구현체: `.claude/commands/health.md`(커맨드). 재사용: `assembler-optimizer`(perf) · `assembler-qa`(QA).
확정일: 2026-06-23.

## Origin

진단 자산이 흩어져 있다 — `/optimize`는 **단일 이슈**를 깊게, `perf-diagnosis.md`는 **성능**,
`/cross-check`는 **변경된 diff**, `/bug`는 **버그** 한정. 하지만 "누가 시키지 않아도 *주기적으로*
코드 전반의 건강(느려진 곳·회귀·깨질 위험)을 훑고, **지난번보다 나빠졌는지**를 추적"하는 루틴이 없었다.

세션에서 체감 느림을 진단하다(생성 비스트리밍·첫 로딩 워터폴) "이런 점검을 시간 기반으로 돌리고
싶다"는 필요가 드러났다. Health Sweep이 그 빈틈을 메운다 — 시간 박스 안에서 perf+QA를 스윕하고
직전 리포트와 비교(회귀 추적)해 우선순위 리포트 + 제안 티켓을 낸다.

핵심 불변식: **코드를 작성·수정하지 않는다.** `/optimize`와 같은 경계. 산출물은 진단 리포트뿐 —
구현은 별도 워크플로우로 인계. QA 트랙도 진단 전용으로 호출한다(수정 위임 금지).

## 역할 경계 (중복 금지)

| 상황 | 담당 | health는 |
| --- | --- | --- |
| 단일 이슈 심층 진단 | `/optimize` (Analyze→…→Plan) | 넘긴다 |
| 변경 diff 품질·보안 | `/cross-check` (code-reviewer+qa) | 넘긴다 |
| 버그(재현 오작동) | `/bug` (QA 트리아지) | 넘긴다 |
| **시간박스 perf+QA 스윕 + 회귀 추적** | **health** | 직접 진단 |

`/health`는 새 진단 방법론을 만들지 않는다 — perf는 perf-diagnosis 7단계, 출력은
optimization-planner 모델(Complexity/Risk/Priority)을 그대로 따른다.

## 시간 예산 → 깊이 다이얼

| 예산 | 커버리지 |
| --- | --- |
| ~15m | perf·QA 각 1패스, 상위 발견만, 웹 리서치 없음 |
| ~30m (기본) | perf+QA 병렬 풀, P0~P3 백로그, 회귀 diff |
| ~1h+ | + 비자명 perf 타겟 리서치, QA 엣지케이스 심화 |

**No silent truncation** — 예산으로 못 본 영역은 리포트 "미점검" 섹션에 명시한다.

## 출력 — Health 리포트

저장: **`docs/specs/diagnosis/health-YYYY-MM-DD.md`** (diagnosis 보드 패턴 계승, 날짜 prefix로 시계열).
섹션(모두 채운다):

```
## Summary            — 이번 스윕 핵심 한 문단
## Perf (P0~P3)        — 항목 · Impact · Risk · 파일:라인 · 체감개선
## QA·회귀             — 심각도별(CRITICAL~LOW) · 위치 · 영향
## Regression-vs-Last  — 🆕 새로 생김 · 🔺 악화 · ✅ 해소 (없으면 baseline)
## 제안 티켓           — 우선순위順 · 근거 · 추천 인계 워크플로우
## 미점검 (budget)     — 예산으로 못 본 영역
```

## 모델 (optimization-planner 계승)

**Complexity** XS(≤30m)·S(1~4h)·M(1~3d)·L(3~7d)·XL(1w+).
**Risk** Low·Medium·High·Critical. **Priority** Critical/High/Medium/Low
(User Impact·Business Impact·Engineering Cost·Technical Debt·Risk).

## 회귀 추적 (시간 기반의 의미)

"시간 기반"은 cron 스케줄이 아니라 **시계열 비교**다. 매 실행이 날짜별 리포트를 남기고,
다음 실행이 직전 리포트를 읽어 delta(🆕/🔺/✅)를 계산한다. 이로써 "지난주보다 느려졌나/
회귀가 생겼나"에 답한다. 구동은 수동(`/health 30m`) — 무인 cron은 범위 밖(아래).

## 워크플로우 통합

1. **독립 실행:** `/health [예산]` → 리포트 생성.
2. **구현 인계:** 제안 티켓을 사용자 확인 후 tickets.md 반영 → `/multi-team`·`/cowork`·`/autopilot`.
   High/Critical Risk → `/multi-team` 병렬 3팀 + `/cross-check` 풀.

## 범위 밖

- 클라우드 cron 무인 실행(`/schedule` 연동)·자동 수정/자동 머지 — 사용자 결정 "수동+제안만".
  추후 원하면 health 리포트를 `/autopilot`에 주입하는 후속 epic.
- 코드 품질·정리(중복·죽은코드·DS토큰) 점검 축 — 이번 범위(perf+QA) 제외, `/simplify`·`/optimize`로.
