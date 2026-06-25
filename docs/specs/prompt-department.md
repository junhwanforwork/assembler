# Prompt Department — 프롬프트 부서 (charter)

Assembler의 프롬프트를 **작성·폴리싱·평가**하는 다역할 부서의 단일 출처.
런타임 프롬프트(`src/lib/prompts/*`)와 사용자가 붙여넣는 임의 프롬프트를 모두 다룬다.

확정일: 2026-06-23.

---

## Origin

프롬프트 전담은 `prompt-engineer`(+`/improve-prompt`) 하나뿐이었고, 그나마 **등록된 엔드포인트 표에
하드와이어**돼 있었다. 그 결과 (1) 사용자가 붙여넣는 임의 프롬프트의 정문이 없고, (2) 프롬프트
품질 회귀를 책임지는 오너가 없고(`assembler-qa`는 앱 동작만), (3) 제품의 노스스타 비전을 담은
단일 문서가 없었다.

동시에 사용자는 Assembler를 **"AI Product Team"** 으로 키우려 한다 — 프롬프트 작업이 *런타임
프롬프트 + 붙여넣은 프롬프트 + 노스스타 프레이밍*으로 넓어졌다. 흩어지지 않게 charter가 필요하다
(`optimization-planner.md`가 진단 자산을 한 곳에 모으는 것과 같은 이유).

OPINION: 폴리싱(의미 불변)과 최적화(동작 변경)는 **다른 일**이다. 이 둘을 한 에이전트에 뭉치면
"이 변경이 동작을 바꿨나?"가 흐려진다. 그래서 역할을 쪼갠다.

---

## North Star — Assembler as an AI Product Team

Assembler-the-product는 단일 챗봇이 아니라 **세계 수준 전문가 팀**처럼 행동한다:
PM · Product Designer · UX Writer · User Researcher · Business Analyst · Software Architect ·
Frontend / Backend / DevOps Engineer · QA Engineer · Technical Writer.

런타임 루프:

```
User Input
  → Intent Detection   (create / update / review / import / explain)
  → Target Detection   (project / feature / page / api / db / ticket)
  → Context Retrieval   (현재 artifact · 연결 artifact · 최근 decision · source · prompt history)
  → Apply Priority Weights  (MVP / Enterprise / UX / Refactor / Growth preset)
  → Generate Output    (artifact 생성·수정 · diff · 누락 정보 질문 · decision 기록)
  → User Review        (Accept / Reject / Edit / Ask follow-up)
  → Save Version       (artifact · decision log · source link)
```

Artifacts: Product Brief · Requirement · Feature Spec · Page Spec · Flow · API Spec · Database Spec ·
Decision Log · QA Checklist · Ticket.

> ⚠️ **이 페르소나·루프는 프롬프트 *콘텐츠*다 — Claude Code 서브에이전트가 아니다.**
> 부서의 일은 런타임 프롬프트가 이 비전을 표현하게 만드는 것이지, PM/디자이너 에이전트를 새로
> 만드는 게 아니다. (제품 팀 역할은 이미 `assembler-*` 에이전트가 맡는다.)

---

## Roles (유지 1 + 신규 3)

| Agent | Role | Tools | 왜 구분되나 |
| --- | --- | --- | --- |
| `prompt-engineer` *(유지)* | 장인 — XML 태그·Iron Law·few-shot·캐싱·모델 라우팅 | Read, Write, Edit, Bash, Glob, Grep | 동작을 바꾸는 최적화 |
| `prompt-lead` *(신규)* | 디렉터 — 의도·대상 감지·라우팅·charter 수호 | Read, Grep, Glob | no-Write 판단자. 부서 정문 |
| `prompt-polisher` *(신규)* | **의미 불변** 명료성·톤·구조 다듬기 | Read, Write, Edit, Grep | Iron Law·few-shot·지시를 바꾸지 않음 |
| `prompt-evaluator` *(신규)* | 골든셋·회귀·토큰 측정 | Read, Grep, Glob, Bash | no-Write. "회귀 났나?"의 단독 오너 |

**Polish vs Optimize 경계 (핵심):**
- *Polish* = 동작 1:1 보존. 지시 수·출력 계약·few-shot 분포·모델 파라미터 불변. 가독성·일관성만.
- *Optimize* = 동작 변경 허용. Iron Law 추가, 제약 신설, few-shot 조정, 모델/캐싱 변경.
- 폴리싱 중 동작을 바꿔야 하면 → 더 이상 폴리싱이 아니다. `prompt-engineer`로 인계.

---

## Workflow

부서 정문은 `/prompt`. 등록된 런타임 엔드포인트(표 고정)는 `/improve-prompt` 빠른 경로.

```
/prompt
 Step 0  Fast floor — 오탈자·1줄 문구 → prompt-polisher 단독
 Step 1  prompt-lead: intent(optimize|polish|evaluate|author|triage-pasted) + target 판정
 Step 2  라우팅:
           polish        → prompt-polisher
           optimize      → prompt-engineer (+런타임이면 evaluator 게이트)
           evaluate      → prompt-evaluator
           triage-pasted → 진단 후 polish/optimize 인계
           author(런타임) → 릴레이
 Step 3  릴레이(= /multi-team 순차, 프롬프트 렌즈):
           A prompt-engineer / B prompt-evaluator / C prompt-polisher → A 개선 → 재평가 게이트
 Step 4  런타임만: tsc + 골든셋 eval 게이트, 동작 변하면 assembler-qa 회귀
```

병렬 3팀은 쓰지 않는다 — 프롬프트는 단일 텍스트 산출물이라 릴레이가 맞고 더 싸다. evaluator 지표가
릴레이의 빌드 게이트 역할을 한다.

**개소리 대응:** prompt-lead는 모호·엉성·은어·비프롬프트형 입력도 추론해 한 경로로 전진한다. 지시
없는 raw 블록은 `triage-pasted` 기본값. 의도가 진짜 갈릴 때만 선택지 질문 1개. 절대 반려·정지 금지.

---

## Evaluation Contract (구현됨 — ASS-062)

북극성 = `/api/generate` **생성 품질 점수(Generation Quality Score)**. 하네스가 이 계약을 실행 가능하게 만든다.

- **하네스:** `scripts/eval-generate.ts`(라이브, 프로덕션과 동일 파이프라인 호출) + `scripts/lib/eval-metrics.ts`
  (순수 채점). 실행: `npx tsx scripts/eval-generate.ts [--k=3] [--ideas=todo,gym] [--label=…]`.
- **Ground truth:** `src/lib/prompts/golden-set.ts`(4개). 골든은 정의상 self-score 1.0 —
  `scripts/verify-goldenset.ts`가 단위테스트로 강제(드리프트 차단).
- **점수(0..1):** `qualityScore = 0.55·coverage + 0.45·normalizeHealth`
  - `coverage = 0.45·countScore + 0.40·mappingCompleteness + 0.15·chainPresence`
  - `normalizeHealth = 1 − clamp(fixSignals.total / max(8, 0.5·|uiElements|), 0, 1)`
  - `fixSignals.total = markerCount + refsPruned + edgesAutoCreated + enumCoercion`
- **하드 무결성 게이트(점수와 별개, 0이어야 PASS):** dangling wireframe ref · dangling userFlow edge ·
  빈 pages/uiElements.
- **타깃(정지 조건, 잠정 — baseline 후 보정):** `mean ≥ 0.92` AND `min ≥ 0.85` AND 하드위반 0.
  비결정성 대응 아이디어당 K=3회 중앙값, 하드위반은 K회 전부 통과.
- **리포트:** `docs/specs/diagnosis/eval-generate/<ISO>.json`(`gitSha`·`usage`·`targetMet` 포함) — 반복 비교용.
- **게이트:** 변경 전후 JSON 비교로 go/no-go. 회귀면 어느 sub-metric이 왜 나빠졌는지 수치 근거.
- Opus 4.8 최소 캐시 prefix 4096 토큰 — 프롬프트 길이 변화가 캐시·비용에 영향(`ai-prompt-generation.md` §3).
- 실비 경고: Opus × 골든 × K — 풀런 12회/16k, 루프 반복 시 최대 ~72회. 저비용 반복은 `--k=1 --ideas=todo`.

---

## Collaboration Boundary

**부서는 프롬프트 TEXT만 소유한다. 도메인 계약도, 런타임 배선도 소유하지 않는다.**

- vs. `rules/assembler/{object-model,mapping,generation,flow,content-style}.md` — **도메인 단일 출처.**
  부서는 다운스트림 소비자로 이를 충실히 주입할 뿐, 객체모델·생성 규칙을 발명하지 않는다. 프롬프트
  변경이 도메인 규칙 변경을 함의하면 → `assembler-pm`이 규칙을 먼저 고치게 에스컬레이션.
- vs. `assembler-pm` — PM은 *어떤* AI 기능이 있는지·정책을 정의. 부서는 그걸 전달하는 프롬프트를 엔지니어링.
- vs. `assembler-be` — BE는 `/api/generate`·`anthropic.ts`·모델 파라미터·캐싱 배선 소유. 부서는
  프롬프트 문자열·few-shot만 편집하고 라우트/래퍼 변경은 BE로 위임.
- vs. `assembler-qa` — QA는 앱/행동 회귀. `prompt-evaluator`는 프롬프트 품질 지표. 런타임 변경 시
  둘 다 도는데 evaluator 먼저, QA 다음.
- vs. `ux-writing.md` / `content-style.md` — *앱 노출 문구*는 해요체, *생성 객체 문구*는 명사구·관계
  명시. 두 레이어를 섞지 않는다.

---

## Two-Layer Reminder

런타임 프롬프트 작성은 **도메인 단일 출처(`rules/assembler/*`)** 를 따른다. `assembler.ts` 헤더가
이미 "도메인 단일 출처는 `.claude/rules/assembler/*` — 이 파일은 그 계약을 LLM에 주입한다"라고
못박는다. 부서는 그 계약을 표현할 뿐, 새 도메인 규칙을 만들지 않는다.

---

## Scope of This Spec

지금 범위는 **스캐폴딩**(에이전트 3 + `/prompt` 스킬 + 이 charter + CLAUDE.md 등록)이다.

런타임 `ASSEMBLER_SYSTEM`을 위 AI-Product-Team 비전으로 재작성하는 것은 **부서의 첫 게이트 작업**으로
남긴다 — 손으로 고치지 않고 `/prompt` author 릴레이 + `prompt-evaluator` 골든셋 게이트를 거친다.

**진행 상태:** ASS-062 eval 하네스는 구현됨(위 §Evaluation Contract). 다음 순서:
1. baseline 측정 — `npx tsx scripts/eval-generate.ts --k=3` 으로 현 `ASSEMBLER_SYSTEM`의 mean/min 확보 →
   타깃(잠정 0.92/0.85)을 baseline 기준으로 보정.
2. 지표 신뢰 검증 — 수동 2~3 사이클(`/prompt optimize` → evaluator 재측정)로 점수가 실제 품질과 맞는지 확인.
3. 그 뒤에야 자동 루프(Plan #2): `/loop`로 eval 타깃까지 부서 릴레이 반복.
미측정/미검증 재작성은 회귀 위험(`ai-prompt-generation.md` §3-4가 라이브 few-shot 주입을 같은 이유로 보류 중).
