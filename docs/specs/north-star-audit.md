# 북극성 정합 감사 (North Star Audit)

> 조사: 2026-07-02 · 기준 문서: [north-star.md](./north-star.md) · 기준 커밋: 1e2920d (+ asm-be-activity-suggestions 작업분)
> 범위: BE(스키마·API·저장 모델·프롬프트) + FE/UX(에디터 Phase 1·프로토타입·인터랙션 스펙). 조사·처방까지 — 코드 수정 없음.

---

## 종합 판정

> **인과 연결 모델·프롬프트·데이터 계층(실행 순서 ①)은 북극성대로 서 있다.
> 그러나 영속 계층(JSONB blob 통째 upsert)이 해자인 구조적 diff(③)의 재료를 저장 시점에 소실시키고,
> 화면 계층은 "파일트리" 언어의 읽기 전용 산출물 뷰어에 머물러 문서 목록으로 후퇴할 위험이 있다.**

감사 기준 (north-star.md에서 도출):
1. 모델이 원본인가, 문서가 원본인가 (모델 1개 + 투사 4개)
2. 연결(인과)이 1급 시민인가 — 스키마·검증·UI에서 강제되는가
3. 변경 1건당 수정 지점 수 = 1이 성립 가능한 구조인가
4. 버전·구조적 diff의 씨앗(Activity) 상태
5. AI = "더 나은 선택지" 렌즈 정합

---

## ✅ 북극성에 맞음

| 발견 | 증거 |
|---|---|
| 생성이 문서가 아닌 **연결 구조**를 뽑는다 — chain(Requirement→Feature→Page→Wireframe→UIElement→Api·Db)·cardinal_rules("고립 객체 금지")를 스키마로 강제 | `src/lib/prompts/assembler-generate.ts` |
| **dangling 무결성 게이트** — 끊어진 참조는 저장 자체가 거부됨 (PUT 409, generate `incoherent_graph`) | `src/lib/assembler/design.ts` `findDanglingRefs`, `design/route.ts` |
| **역참조는 파생·미저장** — Used By를 조회 시 계산, 단일 출처 유지 | `dataUtils.buildTableDetail` |
| **코드-진실 분리** — `asm_apis`/`asm_db_tables`가 1급 행, source 표시, Assembler 안에서 read-only. "기획↔개발 번역층"의 토대 | `supabase/migrations/20260627000001_assembler_core.sql` |
| **데이터 계층 = 단일 그래프 → 뷰 파생** — design+apis+dbTables 병렬 1회 로드, 뷰별 개별 fetch 없음, store는 UI 상태만 소유 | `src/hooks/useEditorData.ts`, `useEditorStore.ts`, `WorkspaceDesign`(`types/assembler.ts`) |
| **DB 인스펙터 역참조 노출** — 테이블 클릭 시 "쓰는 곳·관련 API" 표시 = 인과 사슬 뒤 방향 탐색 | `EditorInspector.tsx` |
| **DB learning** — code-truth(사실)와 AI 설명(추론) 분리, 'AI 추정' 배지, 사용자 편집 우선권 | `DbTableNoteCard.tsx`, `asm_db_table_notes` |
| **suggestions 프롬프트 = "놓친 선택지" 리뷰 렌즈** — 그래프가 "다음에 뭐가?"에 답 못 하는 지점을 실객체 targetId로 지목, 온디맨드·미영속이라 목적 데이터 오염 없음 | `src/lib/prompts/assembler-suggestions.ts` |
| **내보내기 설계 확정** — 기능 단위 연결 패키징(재사용/신규 구분), 협업도구는 정적 스냅샷 대신 동기화 지향 | `docs/specs/editor-interactions.md` #64·#66 |

---

## ❌ 북극성에 어긋남

1. **저작 그래프의 연결이 JSONB blob에 매몰** — 그래프 전체가 `asm_workspaces.design` 한 컬럼. edge/relation 테이블 없음, 연결은 blob 내부 id 배열. "연결이 해자"인데 그 연결이 질의·인덱싱·diff 불가능한 문서 안에 갇혀 있다. (코드-진실만 정규화 — 연결은 반쪽만 1급 시민)
2. **저장 = 그래프 전체 upsert** — `assembler-repo.ts` `updateDesign`이 blob을 통째 교체. 변경 단위가 "문서"라서 저장 데이터로 "무엇이 바뀌었나/어디에 영향 주나"를 답할 수 없다 → 구조적 diff의 재료가 저장 시점에 소실.
3. **코드-진실 rename이 산탄 반영을 재발** — `syncApis/syncDbTables`가 upsert-by-name/endpoint + 삭제 미동기화. 코드에서 이름이 바뀌면 새 행 생성 + 고아 행 잔존 + 저작 참조 dangling. **"수정 지점 수 = 1" 원칙의 실제 위반 사례.**
4. **flow가 트리거 요소와 인과로 안 묶임** — `UIElement.result`가 비구조 string, `Flow.edges`에 triggerElementId 없음. 북극성 사슬 "화면→**동작→이동**"의 링크가 코드에 없다(룰 문서엔 있으나 미구현). (`types/assembler.ts`)
5. **내비게이션 언어가 "문서 목록"** — `EditorTree.tsx` 헤더 "파일트리" + 번호 아티팩트(1 문서·2 기능명세서·3 유저플로우·4 와이어프레임), `FileGrid.tsx` "파일" 카드. 기반은 모델인데 화면 언어가 manyfast식 문서 4종 전환기로 읽힌다 — 포지셔닝 표층이 경쟁사와 닮아지는 방향.
6. **DocView의 자유 문서 저장소 지향** — "정책·메모도 여기에 저장해요"(`DocView.tsx`) + 문서 추가·인라인 편집 인터랙션(#25·#26). 모델에 투사되지 않는 원본 문서가 생기는 순간 산탄 반영 재발 — 북극성이 명시적으로 경계한 경로.
7. (소) 프로토타입 내보내기 모달에 "git 레포로 내보내기" 잔존 (`02-editor.html:1089`) — 스펙 #67에서 제외 확정된 항목. 프로토타입이 스펙보다 낡음.

---

## 🌱 씨앗은 있으나 미완

| 씨앗 | 빠진 것 |
|---|---|
| **버전·구조적 diff (해자 ③)** — `asm_activity` 존재, 6개 mutation 라우트가 로깅 | metadata가 컬렉션별 counts뿐(객체·연결 델타 없음), 스냅샷/버전 테이블 없음, 버전 비교 로직 없음. `assembler-v1-spec.md`는 아직 diff를 ⛔ 제외로 명시 — north-star ③ "v1 편입 필요"와 미정렬 |
| **orphan 검증** — 프롬프트·룰에 "고립 금지" 선언 | 저장 게이트에 orphan 검사 없음 (`findDanglingRefs`는 끊어진 참조만). suggestions `orphan_object`로 사후 지적뿐 — 카디널 룰이 프롬프트에만 있고 무결성에는 없음 |
| **인과 사슬 탐색 UX** — SpecView(req→features)·DataView(테이블→usedBy) 부분 구현 | FlowView·WireframeView가 placeholder. 연결 탐색 인터랙션(#31·35·39·41·44·46) 대부분 ⚠협의 — "버튼 누르면 무엇이"의 핵심 사슬을 클릭으로 못 따라감 |
| **변경 계획 도크** — 프로토타입에 완성형 존재(추가/수정 나열 + "이미 있어요/새로 만들어요") | 구현 0. **"변경은 한 번"을 실현하는 단일 화면**인데 프로토타입에만 있음 |
| **suggestions UI** — 백엔드 완비(살균 포함) | 렌더하는 컴포넌트 전무. 미영속이라 그래프 변경 시 stale, dismiss 없음 — 가속기가 화면에 도달하지 못함 |
| **모델 깊이** — 리셋 후 의도된 축소(`assembler.ts`가 진실) | 룰 문서 대비 PageFlow·structured result·props·businessRules·DocLink 미구현 — 투사 뷰(②)를 지탱할 표현·인과 필드 부족 |
| **AI 챗 진입점** — ChatPane 자리 존재 | "준비 중" 빈 상태. 생성·제안·리뷰를 대화로 잇는 진입점 미배선 |

---

## 개선안 — 우선순위별 처방

북극성 위계(목적>수단>가속기) 기준 정렬. 실행은 별도 세션.

### P1. 변경 델타 기록 — 해자 재료 확보 (❌1·2, 🌱버전의 처방)
- **방법**: blob 저장 구조는 유지하되, `updateDesign`에서 저장 직전 old/new design을 서버에서 구조 비교(컬렉션별 added/removed/modified id + 연결 변경) → `asm_activity.metadata`에 counts 대신 **객체·연결 단위 델타** 기록. 선택 확장: `asm_design_versions` 스냅샷 테이블(저장 시점 design 사본, 최근 N개 보존)
- **공수**: 델타 기록 中 (diff 함수 + metadata 확장, 마이그레이션 불필요) / 스냅샷 中 (마이그레이션 1개 + 보존 정책)
- **파일**: `assembler-repo.ts updateDesign`, `activity-repo.ts`, `design/route.ts`, (신규) `src/lib/assembler/diff.ts`
- 참고: edge 테이블 정규화(❌1의 근본 처방)는 대공사라 v1엔 델타 기록으로 충분 — diff 재료만 확보되면 blob 유지 가능.

### P2. 코드-진실 rename 산탄 반영 수정 (❌3의 처방)
- **방법**: 싱크-인 POST에 삭제 동기화 — payload에 없는 기존 행은 soft-delete 표시 + 그것을 참조하는 저작 객체 목록 반환(기존 dangling 리포트 재사용). rename 휴리스틱(유사도 매칭)은 v1엔 과설계 — "삭제됨 표시 + 영향 참조 노출"까지만.
- **공수**: 小~中 · **파일**: `assembler-repo.ts syncApis/syncDbTables`, apis·db-tables 라우트

### P3. 인과 사슬 완성 — result 구조화 + flow 트리거 (❌4의 처방)
- **방법**: `result: string` → `result: { kind: 'navigate'|'mutate'|'none'; pageId?; apiIds? }` 판별 유니언, `Flow.edges`에 `triggerElementId?` 추가. generate 프롬프트 output_contract 동기 수정, `parse-design` 하위호환(string이면 kind 추론 or none).
- **공수**: 中 (타입+프롬프트+검증 3곳 동기, **prompt-evaluator 게이트 필수**)
- **파일**: `types/assembler.ts`, `assembler-generate.ts`, `validate.ts`, `parse-design.test.ts`

### P4. 화면 언어 교정 — "파일트리" 탈피 + DocView 원칙 (❌5·6·7의 처방)
- **방법**: (a) `EditorTree` 헤더 "파일트리"→"제품 구조", 번호 나열 대신 연결 수 뱃지(기능 N ↔ 페이지 M)로 "모델의 각도"임을 언어로 강제. (b) **DocView는 모델 투사 전용 원칙 확정** — 자유 문서는 반드시 모델 객체에 붙는 형태로만. ⚠ #25·#26(문서 추가·인라인 편집)은 기획 재협의 필요. (c) 프로토타입 git 내보내기 잔존 삭제.
- **공수**: (a)(c) 小 / (b) 기획 결정 사항
- **파일**: `EditorTree.tsx`, `FileGrid.tsx`, `design-prototypes/02-editor.html`, `editor-interactions.md`

### P5. 가속기를 화면에 — suggestions·activity UI (🌱의 처방)
- **방법**: 인스펙터 하단/우측 패널에 suggestions 카드(targetId 클릭→객체 포커스, dismiss는 로컬 상태로 시작). 에디터·대시보드에 activity 타임라인 — P1 델타가 들어오면 "무엇이 바뀌었나" 표시로 자동 승격. 변경 계획 도크는 별도 구현 티켓(공수 大).
- **공수**: suggestions 패널 中 / 타임라인 小(P1 이후 中)
- **파일**: `EditorInspector.tsx`, (신규) suggestions 패널·타임라인 컴포넌트

### P6. orphan 저장 게이트 (🌱의 처방)
- **방법**: `findOrphans`(연결 0개 객체 검출) 추가 — 저장 차단이 아닌 **경고 반환**(작업 중간엔 고립이 정상일 수 있음). suggestions와 역할 중복 없이 "저장 시 즉시 피드백" 층으로만.
- **공수**: 小 · **파일**: `design.ts`, `design/route.ts`

### 실행 순서(north-star.md ①~④)와의 대응

| 처방 | 북극성 실행 순서 | 의미 |
|---|---|---|
| P1 델타 기록 | ③ 스펙 버전·diff | 해자의 데이터 재료 |
| P2 rename 동기화 | 번역층 신뢰 | 코드-진실 참조 무결성 |
| P3 사슬 완성 | ① 연결 모델 보강 | "동작→이동" 링크 |
| P4 화면 언어 | ② 투사 뷰 | "문서 탭"이 아니라 "모델의 각도" |
| P5 가속기 UI | ②+가속기 | 제안·이력을 화면에 |
| P6 orphan 경고 | ① 무결성 | 카디널 룰의 코드화 |
