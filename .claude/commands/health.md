---
description: 시간 예산 안에서 성능(perf) + QA·회귀를 훑어 우선순위 리포트 + 제안 티켓을 내는 진단 스윕. 코드는 안 고친다. 직전 리포트와 비교해 회귀를 추적한다. 설계: docs/specs/health-sweep.md.
---

# /health — 코드 건강 진단 스윕 (시간 예산 · 코드 미수정)

주기적으로 "지금 코드가 건강한가"를 점검한다. 시간 박스 안에서 **성능 + QA·회귀** 두 축을 훑고,
**직전 실행 리포트와 비교해 무엇이 나빠졌는지(회귀)**를 잡아 우선순위 리포트와 제안 티켓을 낸다.

**이 커맨드는 구현하지 않는다** — `/optimize`와 같은 불변식(진단·제안만, 코드 미수정). 고칠 일은
인계 워크플로우로 넘긴다. `/optimize`가 *한 이슈*를 깊게 판다면, `/health`는 *시간 박스로 perf+QA를
스윕*한다.

$ARGUMENTS = 시간 예산(예: `30m`, `1h`, `15m`) + 선택적 영역 힌트(예: `30m 빌더`). 비면 기본 `30m`.

---

## Step 0 — 예산 파싱 → 커버리지 티어

`$ARGUMENTS`에서 시간 예산을 읽는다(기본 `30m`). 점검 범위는 **고정**: 성능(perf) + QA·회귀.
(코드정리·DS토큰 등은 이 커맨드 범위 밖 — `/simplify`·`/optimize`로.)

예산을 커버리지 티어로 환산한다:

| 예산 | 커버리지 |
| --- | --- |
| ~15m | perf·QA 각 1패스, **상위 발견만**, 웹 리서치 없음 |
| ~30m (기본) | perf+QA **병렬 풀**, P0~P3 백로그, 회귀 diff |
| ~1h+ | + 비자명 perf 타겟 리서치(perf-diagnosis 4단계), QA 엣지케이스 심화 |

영역 힌트가 있으면 그 영역을 우선 깊게 본다. 예산으로 못 본 영역은 Step 3 리포트의 **미점검** 섹션에
반드시 명시한다 — **조용히 자르지 않는다(no silent truncation).**

## Step 1 — 병렬 진단 (두 트랙 동시)

아래 두 에이전트를 **동시에** 호출한다(독립 — 결과 공유 안 함). 둘 다 **코드 미수정**.

### 트랙 A: 성능 — `assembler-optimizer`
`.claude/rules/perf-diagnosis.md`의 7단계(현행 이해→슬로우 인터랙션 확정→코드근거 가설→타겟 리서치→
패턴 대조→P0~P3 백로그→실행계획)를 따른다. 모든 원인은 **파일:라인 또는 측정 근거**로(추정 금지).
티어가 ~15m이면 4단계(리서치) 생략, 상위 가설만.

전달: 시간 예산·티어, 영역 힌트, (있으면) 직전 health 리포트 경로.

### 트랙 B: QA·회귀 — `assembler-qa` (진단 전용)
다음을 점검한다 — **코드는 절대 수정하지 말고 진단만**:
- 빌드/타입 깨짐 위험: `npx tsc --noEmit`, `npm run lint` 신호(실행 후 결과만 보고)
- 회귀 위험: 최근 변경(`git log --oneline -20`, `git diff main...HEAD --stat`)이 기존 플로우를 깰 지점
- 엣지케이스 누락: 빈/로딩/에러 상태, 비로그인·타인 리소스 소유권, 이중 클릭·경쟁조건
- CLAUDE.md 정책 준수: 콘텐츠 검수(is_published), 세션 소유권(x-session-id RLS), 공유 스냅샷 읽기전용
각 항목 CRITICAL/HIGH/MEDIUM/LOW로 분류.

## Step 2 — 회귀 diff (시간 기반 핵심)

`docs/specs/diagnosis/` 에서 가장 최근 `health-*.md`(직전 실행)를 찾아 읽는다.
이번 발견과 대조해 **Regression-vs-Last**를 만든다:
- 🆕 새로 생긴 문제 (지난 리포트에 없던 것)
- 🔺 악화된 문제 (심각도·범위 상승)
- ✅ 해소된 문제 (지난엔 있었으나 지금 없음)

직전 리포트가 없으면(첫 실행) "기준선(baseline) — 비교 대상 없음"으로 표기한다.

## Step 3 — 통합 리포트 저장

**`docs/specs/diagnosis/health-YYYY-MM-DD.md`** 에 저장한다(날짜는 세션 환경의 현재 날짜 사용).
같은 날 재실행이면 `-2`, `-3` suffix. 섹션(모두 채운다):

```
## Summary            — 한 문단: 이번 스윕에서 가장 중요한 것
## Perf (P0~P3)        — assembler-optimizer 백로그 (항목 · Impact · Risk · 파일:라인 · 체감개선)
## QA·회귀             — assembler-qa 발견 (심각도별 · 위치 · 영향)
## Regression-vs-Last  — 🆕 / 🔺 / ✅ (또는 baseline)
## 제안 티켓           — 우선순위順 (제목 · 근거 · 추천 워크플로우)
## 미점검 (budget)     — 시간 예산으로 못 본 영역 (명시)
```

## Step 4 — 요약 + 인계

아래를 출력한다:

```
health 리포트: docs/specs/diagnosis/health-YYYY-MM-DD.md (예산 {budget}, 티어 {tier})
가장 시급: {Critical/High 한 줄}
회귀: 🆕 N · 🔺 N · ✅ N  (또는 baseline)
미점검: {영역 or 없음}

제안 티켓 (확인 후 tickets.md 반영):
- ASS-XXX {제목} — {Priority} — 인계: {/multi-team | /cowork | /autopilot}

다음 액션:
- 구현 인계: High/Critical Risk → /multi-team 병렬 3팀 + /cross-check 풀
- 티켓화 원하면 말해 주세요 — tickets.md에 반영할게요 (CLAUDE.md 자동클레임 규칙).
```

---

## 경계 (지킬 것)

- **코드 수정 금지.** `/health`와 두 트랙 에이전트는 진단만 한다(QA도 진단 전용 호출).
- **티켓은 제안만.** tickets.md 반영은 사용자 확인 후(새 개념·범위 → 확인 먼저, CLAUDE.md).
- 단일 이슈 심층 진단은 `/optimize`, 변경 diff 품질은 `/cross-check`, 버그는 `/bug`로 — 중복 진단 금지.
- **No evidence, no claim** — 모든 원인은 파일:라인·측정 근거로.

입력: $ARGUMENTS
