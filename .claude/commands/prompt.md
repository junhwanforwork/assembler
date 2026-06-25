---
description: 프롬프트 부서 정문. 붙여넣은 임의 프롬프트·런타임 프롬프트·평가 요청을 받아 의도를 판정하고 적임 에이전트로 라우팅한다. 런타임 프롬프트 신규·재작성은 멀티팀 릴레이로 처리한다. 등록된 엔드포인트는 /improve-prompt를 쓴다.
---

# /prompt — 프롬프트 부서 정문

프롬프트 관련 작업의 단일 진입점. 의도(intent)·대상(target)을 판정해 부서 에이전트로 라우팅한다.

- 역할·경계·평가 계약 단일 출처: `docs/specs/prompt-department.md`
- 등록된 런타임 AI 엔드포인트(표 고정) 빠른 경로는 `/improve-prompt` — 그 외 전부 이 스킬.
- 부서 = 프롬프트 **텍스트**만 소유. 도메인 계약(`rules/assembler/*`)·라우트/래퍼(`/api/generate`,
  `anthropic.ts`)는 소유하지 않는다(각각 `assembler-pm`·`assembler-be`로 위임).

입력: 붙여넣은 프롬프트 / 엔드포인트명 / "이 프롬프트 ~해줘" / 런타임 프롬프트 경로

$ARGUMENTS

---

## Step 0 — Fast floor (릴레이 스킵)

아래는 부서 릴레이가 아까운 변경이다. `prompt-polisher` 단독으로 처리하고 종료:

- 오탈자·1줄 문구/카피 수정
- 단일 표현 교체, 동작·지시 무변경

해당 시 "fast floor — polisher 단독" 출력 후 종료.

## Step 1 — prompt-lead 판정

`prompt-lead`를 호출해 **intent + target**을 판정한다.

- intent: `optimize`(동작 바꾸는 최적화) / `polish`(의미 불변) / `evaluate`(측정) /
  `author`(런타임 신규·재작성) / `triage-pasted`(붙여넣은 프롬프트 진단)
- target: 런타임 프롬프트(`src/lib/prompts/*`) / 등록 엔드포인트 / 붙여넣은 임의 프롬프트
- charter(`docs/specs/prompt-department.md`) 로드.

**개소리 대응:** 입력이 모호·엉성·은어·비프롬프트형이어도 prompt-lead가 추론해 한 경로로 전진한다.
지시 없는 raw 블록은 `triage-pasted` 기본값. 정말 갈릴 때만 선택지 있는 질문 1개. 절대 반려 금지.

## Step 2 — 라우팅

| intent | 경로 |
| --- | --- |
| `polish` | `prompt-polisher` 단독 |
| `optimize` | `prompt-engineer` → (런타임이면) `prompt-evaluator` 게이트 |
| `evaluate` | `prompt-evaluator` 단독 |
| `triage-pasted` | 진단 후 polish 또는 optimize로 인계 |
| `author` (런타임 신규·재작성) | Step 3 릴레이 |

## Step 3 — 릴레이 (런타임 author 전용)

`/multi-team` 순차 릴레이 패턴을 그대로 쓴다(새 절차 만들지 않음). 프롬프트는 단일 텍스트
산출물이므로 **병렬 3팀은 쓰지 않는다** — 한 산출물을 B·C가 리뷰하고 A가 갈고닦는 릴레이가 맞다.
렌즈는 `.claude/rules/team-perspectives.md`를 프롬프트용으로 재적용:

```
A = prompt-engineer  (Pragmatist: 초안/최적화 — XML·Iron Law·few-shot·캐싱)
B = prompt-evaluator (Guardian: 골든셋 회귀·factuality·토큰/비용 게이트)
C = prompt-polisher  (Architect: 명료성·구조·톤 — 의미 불변)
→ A가 B·C 지적 반영해 개선 → prompt-evaluator 재평가 게이트
```

도메인 계약은 고정 — `ASSEMBLER_OUTPUT_SHAPE`·연결 그래프 계약·`rules/assembler/*`는 보존하고
프레이밍/페르소나 레이어만 바꾼다.

## Step 4 — 게이트 (런타임 변경만)

```bash
npx tsc --noEmit
```

+ `prompt-evaluator` 골든셋 게이트(스키마 유효성·dangling/orphan=0·navigate↔edge 정합·토큰/캐시 델타).
`/api/generate` 출력 동작이 바뀌면 `assembler-qa`에 행동 회귀 검증을 인계(evaluator 먼저, QA 다음).

## 출력 요약 형식

```
## 프롬프트 부서 결과  [intent: _ · target: _]

경로: prompt-lead → {polisher / engineer(+evaluator) / 릴레이 A·B·C}
변경 요약: …
게이트(런타임만): tsc ✅ · eval go/no-go: _ · QA: _

→ 또는 ⚠️ 질문 1개(의도 모호) / 에스컬레이션(도메인 규칙 변경 필요 → assembler-pm)
```
