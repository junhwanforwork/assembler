# Research Planner — 오케스트레이터를 먹여주는 제품 리서치 루틴 설계

레퍼런스·외부 제품 리서치를 웨이브 편성 입력으로 바꾸는 리서치 루틴의 단일 출처.
구현체: `.claude/commands/research.md`(커맨드) · `.claude/agents/product-researcher.md`(에이전트).
확정일: 2026-07-09.

## Origin

오케스트레이터가 웨이브를 편성하려면 두 입력이 필요하다 — `docs/specs/roadmap-milestones.md`의
탈출 조건과 `memory/tickets.md`. 그런데 그 입력을 **바깥에서 채우는 경로**가 두 곳에서만 반쪽으로
돌았다:

- **그림 레퍼런스 해석** — 지금까지 `docs/specs/ux-references.md`에 사람이 손으로 "관찰/차용/차별/
  출처/미확인"을 적는 관례뿐. 전용 에이전트 없음(`ui-ux-designer`는 범용 디자인 비평, assembler
  문서와 미연결).
- **제품 리서치** — `product-strategist`가 있으나 범용(영어·GTM)이라 "웨이브를 먹여주는 리포트
  포맷"이 아니다.

반면 **"진단 에이전트 → 리포트 → 오케스트레이터가 웨이브 편성"** 배관은 이미 검증돼 있다
(`/optimize` = assembler-optimizer + optimization-planner, `/health` = health-sweep). Research
Planner는 그 패턴을 그대로 복제해 빈틈을 메운다.

핵심 불변식: **코드·티켓·문서를 작성·수정하지 않는다.** `/optimize`·`/health`와 같은 경계.
산출물은 리서치 리포트뿐 — 티켓·문서 반영은 오케스트레이터가 한다.

## 역할 경계 (중복 금지)

| 상황 | 담당 | research는 |
| --- | --- | --- |
| 코드·구조·성능·비용 진단 | `/optimize` (assembler-optimizer) | 넘긴다 |
| 변경 diff 디자인 품질·구현 비평 | `ui-ux-designer` | 넘긴다 |
| UX 검증·상태 정의·접근성 | `assembler-design` | 넘긴다 |
| 기능 정의·PRD·정책 설계 | `assembler-pm` | 넘긴다 |
| **레퍼런스 해석 + 외부 리서치 → 적용처·제안 티켓** | **research** | 직접 한다 |

## 두 모드

- **모드 A — 레퍼런스 해석 (그림 입력):** Read로 스크린샷을 보고 `ux-references.md` §4~6 스키마
  (관찰 → 차용(실존 컴포넌트·스펙 지정) → 차별 → 출처 → 미확인)를 그대로 출력.
- **모드 B — 제품 리서치 (웹 조사):** WebSearch/WebFetch. 출처 URL 인용(공식문서 우선), 복원 실패는
  "미확인". 심층 다출처는 `/deep-research`로 인계.

두 모드 모두 **제안 티켓** 꼬리를 반드시 붙인다(아래).

## 출력 — 리서치 리포트

저장: **`docs/specs/research/{slug}.md`** (`docs/specs/diagnosis/` 보드 패턴 계승). `{slug}` =
주제를 요약한 kebab-case. 에이전트는 본문만 반환하고, 저장은 오케스트레이터(`/research`)가 한다.

섹션(모두 채운다 — 빈 섹션 금지):

```
## Summary            — 무엇을 왜 리서치했나 한 문단
## 본문                — 모드 A: 레퍼런스별 관찰/차용/차별/출처/미확인
                        모드 B: 발견별 사실 + 출처 URL + Assembler 적용 시사점
## 제안 티켓           — 우선순위順 · 근거 · roadmap 탈출조건 매핑(P1~P9) 또는 "새 파트 후보"
## 미확인              — 확인 못 한 것(스크린샷 밖 · 로그인 벽 뒤 · 복원 실패)
```

## roadmap 연결

제안 티켓은 반드시 `docs/specs/roadmap-milestones.md`의 파트별 100% 표(P1~P9 상태 문장)에 매핑하거나
"새 파트 후보"로 표시한다. 백로그 소진은 사유가 아니다(roadmap 중단 규칙 1) — 탈출 조건에 기여하지
않는 제안은 내지 않는다. 크로스체크발과 달리 리서치발 제안은 우선순위 무관하게 리포트에 담되, 현
웨이브 편입은 오케스트레이터가 탈출 조건 기준으로 판정한다.

## 워크플로우 통합

1. **독립 실행:** `/research [주제]` 또는 그림 첨부 + `/research` → 리포트 생성.
2. **인계:** 제안 티켓을 **사용자 확인 후 오케스트레이터가** `memory/tickets.md`에 반영(레퍼런스면
   `docs/specs/ux-references.md`에도 관례 형식으로 추가) → `/wave-prep`로 편성.
   (health-sweep.md:70-71과 동일 흐름 — 리포트는 제안, 반영·편성은 오케스트레이터.)

## 범위 밖

- 코드·디자인 구현, 티켓·문서 직접 편집, 자동 머지 — 전부 리포트 밖(오케스트레이터·구현 워크플로우 몫).
- 코드·성능·비용 진단 — `/optimize`. 변경 diff 품질 — `/cross-check`·`ui-ux-designer`.

---

## 리서치 레인 (오케스트레이터 조율)

리서치를 멀티터미널 오케스트레이션에 태우는 규약. **패킷/리포트/워처 신호 배관은 코드 레인 것을
그대로 재사용**하되, 리서치는 산출물이 코드가 아니라 리포트라 완료 후 처리가 다르다.

### 코드 레인과 다른 점 (핵심)

| | 코드 레인 | 리서치 레인 |
|---|---|---|
| 산출물 | 코드 커밋 → **머지** | 리포트(`docs/specs/research/<slug>.md`) + 제안 티켓 |
| 브랜치 | 티켓 브랜치(작업 목적) | `research-<slug>`(리포트 md 커밋 + 가드 통과용) |
| 완료 후 | code-reviewer+qa 크로스체크 → `/wave-integrate` 머지 | **검수**(evidence-first) → 제안 티켓을 **다음 웨이브**로 큐잉 |
| 검증 | tsc·lint·build | evidence-first 자가점검(지어낸 것 0·차용 실존·매핑 유효) |
| 들어가는 웨이브 | **현재** | **다음** |

### 두 실행 모드

- **인세션(기본):** 오케스트레이터가 `/research` 직접 실행 → 리포트 → 검수 → 제안 티켓. 위 "워크플로우
  통합"이 이 흐름. 별도 터미널 불필요.
- **레인(병렬 옵션):** 오케스트레이터가 코드 웨이브 워처로 바빠(통합 대기 등) 리서치에 손 못 댈 때만,
  리서치를 별도 레인 슬롯에 패킷으로 하달 → REPORT.md로 보고 → **기존 워처가 수거**.

### 리서치 패킷 템플릿 (레인 모드)

`/lane-start`는 "패킷 브랜치와 현재 브랜치 불일치면 중단"(lane-start.md:13) + "패킷 본문 그대로 이행 ·
/goal의 Verification·Constraints 준수"(:23-25)로 동작한다. 따라서 리서치 패킷도 **실제 브랜치
`research-<slug>` 위에 얹어**(리포트 md도 커밋되는 파일) 브랜치 가드를 통과시키고, `/goal`을 리서치용으로
재정의하면 `/lane-start`가 코드 대신 리서치를 그대로 이행한다(코드 무변경).

```
[리서치 패킷 · 레인 R · X차 웨이브 다음 후보 · <주제>]  브랜치: research-<slug>

너는 리서치 레인 세션이다. 코드가 아니라 리포트를 만든다. product-researcher 규약
(docs/specs/research-planner.md)의 모드 A/B를 그대로 따른다.

── 리서치 명세 ──
- 모드: A(그림) | B(웹)
- 입력: <이미지 절대경로 목록> 또는 <리서치 주제>
- 렌즈: <UI 시점 / 기능 시점 등 — 사용자 요청 그대로>
- 파일 소유(이 밖 수정 금지): docs/specs/research/<slug>.md 1개 (코드 소유 없음)
- 산출: 리포트 6섹션(Summary/본문/제안 티켓/미확인) — 제안 티켓은 roadmap 탈출조건(P1~P9) 매핑
- ⚠ evidence-first: 그림·웹에 없는 것은 "미확인". 차용 컴포넌트는 Grep/Read로 실존 확인 후 파일:라인.

/goal End: docs/specs/research/<slug>.md 작성·커밋 + REPORT.md 작성. Verification: evidence-first
자가점검(지어낸 것 0 · 차용 실존 파일:라인 · 제안 티켓 roadmap 매핑) — tsc·lint·build 해당 없음.
Constraints: 코드·memory/tickets.md·docs/specs/ux-references.md 수정 금지(반영은 오케스트레이터) ·
push·merge 금지. 크로스체크는 레인에서 안 돌린다(오케스트레이터 검수로 대체). Turn limit: 40턴.
```

REPORT.md는 코드 레인 포맷(lane-start.md:33-54)을 쓰되 `## 검증 출력`에는 "리서치 — tsc·lint·build
해당 없음. evidence-first 자가점검 통과"를 적는다.

### 수거·검수 규약 (워처 재사용, 분기만 다름)

- 오케스트레이터 워처(wave-prep.md:83-109)가 REPORT.md를 그대로 감지 = 완료 신호.
- **단 리서치 패킷 응답이면 code-reviewer+qa 크로스체크 대신 '검수'로 분기**(예외 — 코드 diff가 없으므로
  크로스체크 부적합). 검수 체크리스트: ① 미확인이 정직한가(그림·웹 밖을 사실로 안 썼나) ② 차용 컴포넌트가
  실존 파일:라인인가 ③ 제안 티켓이 roadmap 탈출조건에 실제로 매핑되나 ④ 리포트 6섹션 충족. 통과 못 하면
  추가 지시 규약(wave-prep.md:46-50)으로 재하달.

### 다음 웨이브 큐잉 ("다음 웨이브에 넣어주세요" 경로)

- 검수 통과 → 제안 티켓을 **사용자 확인 후** `memory/tickets.md` **Backlog**에 추가하되 **"리서치발 ·
  다음 웨이브 후보"** 표식을 단다(현 In Progress 아님 — 리서치는 **다음** 웨이브를 먹인다).
- 다음 `/wave-prep`가 roadmap 탈출조건 기준으로 편입 판정(중단 규칙 그대로 — 백로그 소진 금지).
- 티켓 반영은 오케스트레이터 독점 + 사용자 승인 게이트(CLAUDE.md) 유지.

### 경계

- 리서치 레인은 `/wave-integrate` 머지 자격에서 **doc-only · 크로스체크 면제 · 검수 통과 필요**로 취급.
  리포트 doc 브랜치(`research-<slug>`)는 단순 문서 추가라 충돌 없이 함께 머지된다.
- 코드 레인 슬롯(`lane-1..3`)과 겹치지 않게 리서치는 별도 슬롯/브랜치를 쓴다.
