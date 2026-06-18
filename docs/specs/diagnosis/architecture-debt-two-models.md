# 진단 — 아키텍처 부채: 두 데이터 모델 공존 (구조·중복·유지보수)

> `/optimize` 산출 · assembler-optimizer 진단 · 2026-06-14 · 코드 미수정(진단 전용).
> 성능 부채는 perf-diagnosis가 별도로 다룸(`~/.claude/plans/fe-layout-sleepy-dijkstra.md` B1~B9) — 본 리포트는 구조만.

## Summary

Assembler는 Assembler(설문/스크랩)에서 "연결된 제품 객체 그래프" 빌더로 피벗 중이며, 그 결과 **두 개의 완성된 데이터 세계가 한 코드베이스에 공존**한다. 구(빌더) 세계 `ProjectDocument = {screens, flows}`는 store·autosave·API·DB(`wf_projects.document` jsonb)까지 전부 살아 동작 중이고, 신(그래프) 세계 `ProjectGraph`는 타입·store(`useGraphStore`, 풀 CRUD+cascade)·selectors·fixture까지 모두 구현됐지만 **런타임 소비자가 0개**다(`useGraphStore`는 자기 참조만, `selectors.ts`/`sample-graph.ts`/`prompts/assembler.ts` import 0). 핵심 부채는 두 모델의 *중복/드리프트 위험* + 신 세계가 "완성됐지만 죽어 있는" 채 셸(ASS-025~)을 기다리는 **미연결 자산 부패 리스크**. ASS-017(DB 영속 전환)은 셸 착지 전엔 당기면 안 되는 1급 위험이고, 우선순위 1순위는 그게 아니라 **두 세계의 어휘를 단일 출처로 묶고 드리프트 가드를 거는 일**이다.

## Problem

- **P1 — 두 데이터 모델 공존, 어휘만 일부 연결.** `builder.ts:9` `BlockType = UIElementType` alias ↔ `assembler.ts:70`. `Block` ↔ `UIElement`, `Screen` ↔ `Page`+`Wireframe`, `ProjectDocument` ↔ `ProjectGraph`. `type`/`props` 한 축만 묶였고 스택 구조·좌표·식별자 의미는 따로. Impact High.
- **P2 — 신 그래프 세계 완성됐으나 런타임 소비자 0 (죽은 자산).** `store/graph.ts`(소비자 0)·`graph/selectors.ts`(import 0)·`fixtures/sample-graph.ts`(0)·`prompts/assembler.ts`(0). Impact High (부패·드리프트 시한폭탄).
- **P3 — DB 컬럼 1개에 두 모델 충돌 단언.** `supabase/builder.ts:36-38`(`document?: ProjectDocument`)·`api/projects/[id]/route.ts:34`(`as ProjectDocument`)·`route.ts:32`(`(row.document as ProjectDocument)?.screens?.length`). jsonb 한 칸인데 무조건 `ProjectDocument` 단언 → 그래프 행 섞이면 손상이 "화면 0개"로 조용히 삼켜짐. **Impact Critical (영속 손상 가능).**
- **P4 — 셸이 둘, 모델 참조 엇갈림.** `dashboard/**`(홈, `ProjectCard.tsx:61` "화면 N개" = `screenCount` 고정) vs `builder/**`. 그래프 전환 시 카드 카피·필드 동반 손상. Impact Medium.
- **P5 — 결합도: 다책임 / store 혼재.** `Inspector.tsx`(339줄, 한도 350 근접 — 폼 정의+조회+커밋+렌더 혼재). `store/builder.ts` document+UI 혼재(perf B5), 신 `store/graph.ts`도 graph+section/selection 혼재로 같은 패턴 답습. Impact Medium.

## Root Cause

- **P1:** "타입부터 새로 세우고 런타임은 나중에 흡수" 피벗 전략 → 의도적 공존. ASS-016이 `BlockType`만 단일 출처화, 나머지 대응(Screen→Page/Wireframe 등)은 코드 연결 없음. (`assembler.ts:69` "재사용 전제(ASS-034)" = 예정이지 완료 아님.)
- **P2:** store·selector·fixture를 셸(ASS-025)보다 먼저 만든 선행 구현 → 소비자 도착 전까지 검증 없이 떠 있음.
- **P3:** 한 jsonb 컬럼을 두 모델이 공유하는데 판별자(version/kind) 없음. `as ProjectDocument` 무조건 단언 + optional chaining이 손상을 "0"으로 삼킴. `store load`가 `project.document.screens` 무조건 읽음.
- **P4:** ASS-057(대시보드)이 ASS-015/017 전에 착지 → 카드 메타를 구 모델(`screenCount`)에 임시 배선.
- **P5:** "프로젝트 1개 = store 1개"로 document·selection·view를 한 곳에 둔 공통 설계 습관(`store/builder.ts:17-26`·`store/graph.ts:28-34` 동형).

## Recommendation

### R1 — 어휘 단일 출처 + 드리프트 가드 (P1·P2) ★ 1순위
assembler를 어휘 정본으로 단방향(builder→assembler) 고정. 죽은 그래프 자산이 assembler 타입을 실제 type-import하므로 드리프트가 컴파일 에러로 드러나는 현 상태를 docs/specs에 **정본화+커밋**. `SAMPLE_GRAPH`를 graph store 단위 테스트 입력으로 묶어 "죽은 자산 → 검증된 대기 자산"으로 승격. Complexity S · Risk Low.

### R2 — DB 영속 판별자 도입 (ASS-017 안전 게이트) (P3)
`wf_projects.document` jsonb에 `kind: "doc" | "graph"`(또는 schemaVersion) **읽기 경로 먼저** 도입. `as ProjectDocument` 단언 → 판별 분기로 교체(판별자 없으면 레거시 doc 폴백). **쓰기 전환(graph 저장)은 셸·autosave(ASS-024) 준비 후 맨 마지막.** 마이그레이션 불필요(기존 행=doc 폴백). Complexity M · Risk **High(영속·핵심 경로)** → /multi-team 병렬 3팀 + /cross-check 풀.

### R3 — 죽은 코드 커밋·격리 명시 (P2)
미커밋 그래프 자산을 ASS-022/058 단위 커밋 + "셸 대기 자산" 라벨(스펙/주석). 구 빌더 컴포넌트 중 ASS-034가 흡수할 것에 deprecation 주석. Complexity S · Risk Low.

### R4 — store/Inspector 책임 분리 (P5)
store의 document↔selection 분리는 perf 백로그와 합류. Inspector(339줄)는 ASS-035(매핑 편집) 때 `inspector/fields/*`로 SRP 분리(묶어 처리). Complexity M · Risk Medium · 단독 착수는 YAGNI.

## Effort Estimate

- **R1:** FE 4h · QA 1h · → **~1d**
- **R2:** FE 4h(load 분기) · BE 4h(API GET/PUT 분기) · DB 1h(판별 컨벤션, 스키마 변경 불요) · QA 4h(레거시/graph/손상행 e2e) · → **~2d** (셸·autosave 의존, 별도 스프린트)
- **R3:** ~2h
- **R4:** ASS-035/perf 백로그 흡수(+M)
- 1차 액션(R1+R3): **~1.5d**

## Priority

- **R1 — High (1순위).** User Impact 낮지만 Tech Debt·Risk 비대칭 큼. 그래프 자산이 검증 없이 뜬 기간↑ = 드리프트 재작업 복리. Cost 낮음(S).
- **R2 — High→Critical(착수 시점 한정).** Data Impact Critical. **단 ASS-025 셸 + ASS-024 autosave 착지 전 착수 금지** — 지금 당기면 라이브 빌더 깨짐. 우선순위 높되 순서는 맨 마지막.
- **R3 — Medium.** 저비용·저위험.
- **R4 — Low(단독)/Medium(묶음).** ASS-035와 묶어야 효율적.

## Implementation Plan

순서가 핵심 — **수렴은 "어휘→읽기가드→쓰기전환", 영속 전환이 맨 마지막**(ASS-017 제약 정렬).

1. **(R1·R3, 지금):** 그래프 자산 커밋 + "셸 대기 자산" 라벨. assembler 어휘 정본 docs/specs 명문화. `SAMPLE_GRAPH`를 graph store 단위 테스트 입력으로.
2. **(R1):** 겹치는 어휘 정리 — `BLOCK_DEF_MAP` props/label을 assembler `UIElement` 생성·builder `addBlock`이 같은 출처에서 끌도록 유지·문서화. 단방향 의존 확인.
3. **(R2, 셸 착지 후 — ASS-025/024 선행 필수):** `kind` 판별자 **읽기 경로 먼저**. `route.ts` GET·`ProjectCard` `screenCount`·`store.load`를 `kind` 분기로. 레거시=doc 폴백.
4. **(R2):** autosave(ASS-024)가 graph를 `kind:"graph"`로 저장 — **쓰기 전환**(ASS-017 본체, 가장 마지막).
5. **(R4):** ASS-035에서 Inspector `inspector/fields/*` 분리, store document↔selection 분리는 perf 백로그 합류.

**수렴 전략 결론: 분리 유지가 아니라 "빌더를 그래프로 흡수"** (`Screen`=`Page`+`Wireframe` 축약, `Block`=`UIElement` 표현 서브셋 — assembler가 상위집합). 단 흡수는 셸·autosave 준비 후 단방향.

## Risk

- **R2 영속 전환(ASS-017)이 최대 위험.** `store/builder.ts` load가 `document.screens` 무조건 읽음 → 판별자 없이 graph 행 들어오면 라이브 빌더 즉시 깨짐(optional chaining이 "화면 0개"로 조용히 삼켜 디버깅↑). 읽기-가드를 쓰기-전환보다 먼저.
- **순서 역전:** R2를 R1보다 먼저 하면 어휘 안 묶인 채 영속 손대 두 곳 동시 수정.
- **죽은 자산 부패:** Step 1 미루면 셸 착수가 "구현+부채청산" 동시 부담.
- **회귀 면적:** R2는 GET/PUT/load/대시보드 카드 4곳 동시 수정 → cross-check 풀 필수.

## 관련 파일
`src/lib/types/{builder,assembler}.ts` · `src/lib/store/{builder,graph}.ts` · `src/lib/graph/selectors.ts` · `src/lib/fixtures/sample-graph.ts` · `src/lib/prompts/assembler.ts` · `src/lib/supabase/builder.ts` · `src/app/api/projects/{route.ts,[id]/route.ts}` · `src/components/dashboard/ProjectCard.tsx` · `src/components/builder/inspector/Inspector.tsx` · `src/lib/builder/block-catalog.ts`
