---
description: 제품 리서치 — product-researcher로 그림 레퍼런스나 외부 제품을 조사해 "우리 어디에 어떻게 적용되는지"를 제안 티켓까지 붙인 리포트로 낸다. 코드·티켓은 안 고친다. 설계: docs/specs/research-planner.md.
---

# /research — 오케스트레이터를 먹여주는 제품 리서치 (웨이브 편성 전 입력)

그림 레퍼런스나 외부 제품을 조사해 "무엇을 참고했나 / 우리 어디에 적용되나 / 무슨 티켓으로 / 어느 탈출 조건에 기여하나"에 답하는 리서치 리포트를 만든다. **이 커맨드는 구현·티켓 반영을 하지 않는다** — 리포트만 내고 다음(오케스트레이터 편성)으로 인계한다.

$ARGUMENTS = 리서치 주제(예: "비개발자용 온보딩 패턴") 또는 그림 첨부 + 물음. 티켓 ID면 맥락 동봉.

---

## Step 0 — 입력 정리 · 모드 판정

- `$ARGUMENTS`가 비었고 그림도 없으면 무엇을 리서치할지 한 줄로 물어본다(주제·목적·의심 적용범위).
- **그림이 첨부됐으면 모드 A(레퍼런스 해석), 아니면 모드 B(웹 리서치)** 로 판정해 전달한다.
- 티켓 ID면 `memory/tickets.md`에서 해당 항목 맥락을 읽어 함께 전달한다.

## Step 1 — product-researcher 호출

`product-researcher` 에이전트를 호출한다. 전달:
- 모드(A/B) · 그림 또는 주제 · 의심 적용범위(컴포넌트·스펙·화면)가 있으면 함께.

에이전트는 `docs/specs/research-planner.md`의 두 모드·출력 포맷을 따른다. 모드 A는 `ux-references.md` §4~6 스키마(관찰/차용/차별/출처/미확인), 모드 B는 출처 URL 인용. 심층 다출처는 `/deep-research`로 위임.

## Step 2 — 리포트 저장

에이전트 산출물을 **`docs/specs/research/{slug}.md`** 에 저장한다(오케스트레이터가 저장 — 에이전트는 본문만 반환).
- `{slug}` = 주제를 요약한 kebab-case (예: `noncoder-onboarding-patterns`). 티켓이면 `ASM-0XX-{slug}`.
- 섹션 누락 없이(Summary / 본문 / 제안 티켓 / 미확인). 제안 티켓은 roadmap 탈출조건(P1~P9)에 매핑.

## Step 3 — 요약 + 다음 액션

아래를 출력한다:

```
리서치: docs/specs/research/{slug}.md
핵심 발견: {한 문장}
제안 티켓: {N건} — 탈출조건 매핑: {P번호 또는 "새 파트 후보"}

다음 액션:
- 제안 티켓을 사용자 확인 후 오케스트레이터가 tickets.md 반영 → /wave-prep 편성
- 레퍼런스(모드 A)면 ux-references.md에도 관례 형식으로 추가
- 심층 리서치 필요하면 /deep-research
```

---

## 경계 (지킬 것)

- **코드·티켓·문서 수정 금지.** 이 커맨드와 product-researcher는 리서치만 한다. 반영은 오케스트레이터.
- 디자인 품질 비평 → `ui-ux-designer`, 기능 정의 → `assembler-pm`, 코드·성능 진단 → `/optimize`.
- 추정 금지 — 그림에 없는 것·확인 못 한 웹 주장은 "미확인"으로. 차용 컴포넌트는 실존 확인(파일:라인).

입력: $ARGUMENTS
