# Assembler 빌더 — IA & 레이아웃 정의

> 재작성: 2026-06-14 (v3). 구 모델("5영역 셸 + 좌측 4섹션 SNB 레일", v2)을 **IDE형 통합 트리 + 변신 캔버스(상단 뷰탭)**로 대체.
> 디자인 방향 정본: `~/.claude/plans/wise-scribbling-badger.md`. 레퍼런스: manyfast.io · Claude Design · Omniflow AI · ChatPRD (§8).
> 관련 티켓: ASS-025~036·016·059. 선행: ASS-016/017/022(그래프 타입 강등·영속·스토어).

목적: 제품 아이디어를 **연결된 객체 그래프**로 다루되, 매핑 누락이 화면에서 바로 보이게 한다. 핵심 은유는 **"제품을 코드베이스처럼"** — 한 트리로 모든 객체(요구·기능·페이지·UI요소·API·DB)를 탐색하고, 고른 노드를 캔버스 상단 **뷰탭**으로 여러 각도에서 본다.

### 왜 이 구조인가 (차별점)

매니패스트는 **PRD 단일 문서**를 뽑아주지만, 우리는 **연결된 여러 산출물**(문서·화면·API·DB)을 만든다. 산출물이 많고 서로 id로 엮이므로 **트리·탐색이 필연**이다(장식이 아님). 4가지 표면은 *따로 노는 문서가 아니라 같은 그래프의 여러 뷰*다 — 트리에서 페이지를 고르면 [화면]·[문서]·[흐름] 탭이 동시에 그 객체를 가리킨다.

---

## 1. 플로우 상태 — 빈 vs 생성 중 vs 작업 있음

빈 신규 프로젝트에서 **빈 워크스페이스를 보여주지 않는다**(경쟁하는 빈 상태 = 고립 산출물). 채팅이 화면을 차지하고, 그래프가 생기면 워크스페이스로 자란다. 분기 기준 = 그래프가 비었는지(객체 0).

| 상태 | 화면 |
|---|---|
| **A. 빈(작업 0)** | **채팅이 중앙 히어로** — "대화하세요, 기획이 완성됩니다" + **주제 추천** + **파일 업로드로 시작**. 트리·캔버스는 아직 없음. (매니패스트식 대화 우선) |
| **B. 생성 중** | 셸 등장 + **스켈레톤 스트리밍** — 트리가 체인 순서(Requirement→Feature→Page→UIElement→Api→Database)로 차오름. 스피너 X. (옵션: 생성 전 plan 미리보기) |
| **C. 작업 있음** | **풀 워크스페이스**(트리 + 캔버스 + 측면 채팅). 채팅은 측면으로 도크. 노드 미선택 시 캔버스에 개요/안내. |

라우트는 하나(`/project/[id]` → `BuilderShell`). A/B/C는 내부 상태로 분기. **A→C 전환 시 채팅이 중앙→측면으로 이동**(애니메이션).

---

## 2. 레이아웃 — 통합 트리 + 변신 캔버스 + 채팅

```
┌───────────────────────────────────────────────────────────┐
│ Header   프로젝트명 · 진행률% · 공유 · 내보내기 · 💬토글     │
├──────────────┬────────────────────────────┬───────────────┤
│  EXPLORER     │ [화면][문서][흐름]  ← 뷰탭  │   CHAT        │
│  (통합 트리)  │ ┌────────────────────────┐ │ (상태별·      │
│ ▾📋 요구사항  │ │                        │ │  위치 pref)   │
│ ▾🧩 기능      │ │   Canvas               │ │               │
│   ▾로그인     │ │  (선택 노드 + 뷰탭으로  │ │               │
│     ▭Page    │ │   변신)                │ │               │
│      •버튼    │ │                        │ │               │
│ ▾🔌 API       │ └────────────────────────┘ │               │
│ ▾🗄 DB        │                            │               │
└──────────────┴────────────────────────────┴───────────────┘
```

| 영역 | 역할 | 내용 |
|---|---|---|
| **Header** | 정체성 + 전역 액션 | ◀대시보드 · 프로젝트명(인라인 rename) · 저장 상태 · **진행률 %** · **공유** · **내보내기**(MD/JSON/이미지) · **채팅 토글** |
| **EXPLORER 트리** (좌, ~280px) | 한 곳에서 모든 객체 탐색 | 그룹 헤더로 묶음: 📋요구사항 · 🧩기능(▸Page▸UIElement) · 🔌API · 🗄DB. VS Code식 chevron·글리프·가이드선·접힘(store `collapsedIds`). 노드 선택 = 캔버스 결정. 각 노드 **완성도/⚠ 뱃지**(매니패스트 차용). 하단 🏠대시보드·🔍검색·⚙설정. |
| **Canvas + 뷰탭** (중앙) | 선택 노드를 여러 각도로 | 상단 **뷰탭** — 노드 타입에 적응(§3). 콘텐츠는 §3 각 뷰. 빈/생성 상태는 §1. |
| **Chat** | AI 생성·수정 대화 | §4. **상태별 위치**(빈/생성=중앙 히어로, 작업=측면 도크) + **좌/우 사용자 preference**. |

- 구 SNB 아이콘 레일(4모드 전환)은 **폐지** — 모드 전환을 트리 탐색이 흡수. 4가지 표면은 캔버스 뷰탭/노드 타입으로 표현.

---

## 3. 캔버스 뷰탭 — 선택 노드의 여러 각도

뷰탭은 **선택 노드 타입에 적응**한다. 한 그래프의 다른 렌더일 뿐(같은 객체 가리킴).

| 선택 노드 | 뷰탭 | 기본 탭 |
|---|---|---|
| Page | **[화면] [문서] [흐름]** | 화면 |
| Feature | **[문서] [흐름]** | 문서 |
| Requirement | [문서] (단일) | 문서 |
| 프로젝트 루트 | **[흐름] [문서]** | 흐름 |
| UI 요소 | [화면] (단일, 부모 페이지+요소 포커스) | 화면 |
| API · Database | **[표]** (전용) | 표 |

> 노드별 탭셋 단일 출처 = `CanvasTabs.tsx`의 `NODE_TABS`(ASS-071 확정). Requirement/UI요소/API/DB는 자기 화면/흐름이 없어 단일 탭(탭바 숨김). 탭이 2개 이상일 때만 탭바 렌더.

### 3.1 📄 문서 뷰 (PRD)
- **콘텐츠**: 문서 에디터 — 객체가 정본(자유 마크다운 아님). Overview(name/description) · Requirements · Features(businessRules)를 구조화 섹션으로 렌더 + 인라인 편집. 설명 본문은 마크다운 허용.
- **인-뷰 미니 TOC + 필드 카드**(매니패스트 차용): 좌측 미니 목차(개요·요구사항·기능) + 우측 구조화 카드(한 줄 정의·목표·배경 등).
- 소비 객체: Project(overview) · Requirement · Feature. 재사용: react-markdown.

### 3.2 🗺️ 흐름 뷰 (Structure = IA + UserFlow)
- **콘텐츠**: 페이지 맵 — 페이지=노드(이름+썸네일), **Feature 그룹핑=IA**, **UserFlow=엣지**(trigger·조건 라벨), 진입 페이지 마커.
- 노드 클릭 → 트리 선택 동기 + [화면] 탭으로 점프.
- 소비 객체: Page · Feature(그룹핑) · UserFlow. (IA 명시 계층은 §9 열린 질문)

### 3.3 ▭ 화면 뷰 (Wireframe 무한 캔버스 — 페이지 상세)
- **콘텐츠**: 무한 캔버스 — Page 프레임 + UIElement 스택 + 매핑 칩 + UserFlow 엣지(흐름 뷰와 같은 edge, 읽기 겹침). 상세 §3.3.1.
- 좌측 트리가 Layers 역할 겸함(`Wireframe.uiElementIds` 순서, 매핑 미완성 ⚠). **드래그앤드랍 팔레트 없음**(§6) — 요소 추가는 트리/Inspector 폼.
- 소비 객체: Page · Wireframe · UIElement · PageFlow · (UserFlow edge 읽기).

#### 3.3.1 와이어프레임 렌더 명세

**프레임 지오메트리**
- 폭: `Page.device` 프리셋 — `mobile: 360` / `tablet: 768` / `desktop: 1024` (기본 mobile). 프리셋 맵 상수 한 곳. (`Page.device` 필드 = ASS-056)
- 높이: 콘텐츠 auto, 최소 160px. 패딩 16 / 요소 gap 12 (SPACING 토큰).
- 위치: 프레임별 `x/y` 스토어 저장(`Page.x/y`, ASS-015). AI 미생성 좌표는 ASS-019 그리드 기본 배치.

**프레임 구조**: 헤더(페이지명+device 라벨+매핑 미완성 ⚠N, **드래그 핸들**, 선택 시 ACCENT) → 본문(`uiElementIds` 순서 세로 스택) → 빈 와이어프레임 placeholder.

**요소(ElementNode)**
- `BlockRenderer` 재사용(`UIElement.{type,props}`→Block 어댑트, 읽기 전용). 선택=ACCENT ring, hover=배경 전환만.
- **`isMappingComplete(el)` 단일 함수**: `states≥1` + `action` 있음 + `result.kind` 존재. `kind:"none"`(장식)이면 API/DB 불요. apiIds 빈 stateChange/toast는 경고 아님 — **⚠는 필수 필드 누락만.** 트리 뱃지·캔버스 ⚠ 모두 이 함수 공유.
- ⚠ 상시 표시(`COLOR.WARNING` 아이콘+dot, 색 단독 의미 전달 금지).

**매핑 칩 (선택/hover 시 펼침)**: `Action → API(method path) → DB(name) → Result(kind)` 체인, 누락은 "API 미지정" WARNING. 요소 아래 인라인. 칩 클릭 = Inspector 포커스. 동시 1개만.

**UserFlow 엣지 앵커**: 출발 = `result.kind==="navigate"` 요소 우측 중앙(**DOM 측정 ref+offsetTop**, 고정 행높이 금지, 줌 scale 보정). 도착 = 대상 프레임 좌측. 트리거 미특정 = 프레임 우측 중앙 폴백. 렌더 = `FlowEdge`(cubic bezier+화살표). **단일 출처 flow.md** — navigate result ↔ edge 자동 동기.

**z-order**: 엣지 SVG(최하단, pointerEvents none) → 프레임 → 선택 프레임 → 진행 중 연결선(ACCENT 점선).

**무결성/예외**: dangling uiElementId 렌더 skip(정규화 ASS-019). type 불량은 ASS-019 폴백 전제. 빈 캔버스 = §1 A 히어로.

**성능**: 드래그·팬·줌은 로컬 state/ref + CSS transform, 스토어 커밋은 pointerup 1회(perf-diagnosis.md). 매핑 칩 펼침은 선택 요소만 리렌더(selector 분리).

#### 3.3.2 캔버스 제어 기능

| # | 기능 | 트리거 | 동작 | 범위 |
|---|---|---|---|---|
| 1 | 팬 | 트랙패드 스크롤 / 스페이스+드래그 / 빈 공간 드래그 | transform translate | MVP |
| 2 | 줌 | Cmd+휠 / 핀치 / 우하단 ± | scale 0.25~2x, 커서 중심 | MVP |
| 3 | 줌 리셋·전체 핏 | 우하단 + 단축키 `0`/`1` | 100% / 전체 bounds 핏 | MVP |
| 4 | 페이지 포커스 | 트리 Page 클릭 / 프레임 헤더 더블클릭 / 흐름 노드 클릭 | 프레임 팬+줌 핏 (≤320ms) | MVP |
| 5 | 프레임 이동 | 헤더 드래그 | 로컬 state → pointerup 커밋 | MVP |
| 6 | 선택 | 프레임/요소 클릭 (Esc·빈 공간 해제) | 트리·Inspector 동기 + 매핑 칩 | MVP |
| 7 | 연결 생성 | navigate 요소 ● 핸들 → 다른 프레임 드롭 | `result:navigate` + UserFlow edge 생성 | MVP |
| 8 | 연결 삭제 | 엣지 클릭 → Del / Inspector | edge 삭제 + 트리거 result `none` 초기화 | MVP |
| 9 | 페이지 추가 | 트리 `+` / 빈 캔버스 CTA | 새 Page+빈 Wireframe, 뷰포트 중앙 | MVP |
| 10 | 페이지 삭제 | 트리 호버 메뉴 (danger 확인) | cascade — Wireframe·PageFlow·edge 정리 | MVP(캔버스 불가) |
| 11 | 요소 추가/정렬 | 캔버스 직접 편집 아님 | 트리 드래그 정렬·추가 / Inspector | 패널 소관 |
| 12 | 미니맵 | — | 우하단 축소 지도 | P2 |
| 13 | 다중 선택 | — | shift+클릭 / 러버밴드 | P2 |
| 14 | undo/redo | — | 그래프 스토어 히스토리 | P2 |

### 3.4 ⚙️ 표 뷰 (API·데이터)
- API/DB 노드 선택 시 전용 표 뷰 — Api[](method·path·purpose·success·error·Used By) + Database[](name·purpose·columns·Used By). 인라인 편집 + 행 추가.
- 소비 객체: Api · Database. **(매니패스트엔 없는 Assembler 차별점 — 지킬 엣지)**

---

## 4. Chat 컴포저 (AI 생성·수정)

> 대화 형식(답변·생성·번호 답변)의 단일 출처는 `docs/specs/ai-prompt-conversation.md` (Epic ASS-E03). 아래는 레이아웃 관점.

- **위치**: 상태별 — 빈/생성=중앙 히어로, 작업=측면 도크. **좌/우는 사용자 preference**(설정 저장). 헤더 토글로 접기/펼치기.
- AI 페르소나 대화 로그 + 입력창(0/1000) + 첨부(파일 업로드).
- 명령 → ProjectGraph 생성/수정(ASS-018) → 전 영역 라이브 반영. **모호할 때만 생성 전 되묻기**(번호 선택 칩 — 클릭/번호 타이핑/자유입력).
- **매니패스트 차용**: ① 컴포저 **실행모드 토글 + 모델 선택** ② **@멘션으로 그래프 객체 지목**(연결 그래프 = @멘션의 천연 인덱스 → 정밀 편집, Execute Mode) ③ clarify 칩·답변 고정·생성완료 요약·다음단계 칩.
- Claude Design 수정 패턴 흡수: 요소 핀 인라인 코멘트 · 직접 텍스트 편집 · 조절 슬라이더 · 채팅(큰 변경).
- 재사용: 대시보드 `GeneratePromptBanner`(TextInput lg + Button) 패턴.

---

## 5. 규칙 ↔ UI 매핑 (스펙 정확성 강제)

| 규칙 | 강제 방식 |
|---|---|
| wireframe.md 필수 필드 | Inspector 폼이 states/action/apiIds/databaseIds/result 노출, 누락 ⚠ |
| mapping.md 5질문 | 매핑 칩 체인 표시 |
| flow.md 단일 출처 | 엣지는 UserFlow edge에서만, 흐름·화면 뷰 공유 |
| object-model.md id 참조 | 정규화 객체 맵, 역참조 selector 파생 |
| ds-tokens/ds-components/button | BlockRenderer→DS 컴포넌트, 하드코딩 hex 0건 |
| file-structure 350줄 | Tree/Canvas/뷰탭/Chat + 뷰별 컴포넌트 분리 |
| flow-view-pattern.md | SVG 엣지 라이브러리 무추가, 줌/팬 CSS transform 우선 |

---

## 6. 부품 드래그앤드랍 제거 (사용자 요청)

- 팔레트 드래그-빌드 플로우 제외. 대상: `src/components/builder/palette/*` · `screen/ScreenEditor.tsx` 드래그-추가 · store `addBlock`(팔레트 경유).
- 옛 `ScreenEditor`(screens/blocks 수동 빌더)는 화면 뷰 캔버스로 대체·사장 → ASS-016 정리에 흡수.
- dnd-kit: 트리 재정렬에 쓰면 유지, 아니면 제거 — ASS-034 시 결정.

---

## 7. 구현 파일 구조 (선행: ASS-016/017/022)

```
src/components/builder/graph/
├── GraphShell.tsx            — Header + Tree + Canvas(뷰탭) + Chat 조립
├── GraphHeader.tsx · PromptPanel.tsx
├── tree/TreeNav.tsx · TreeRow.tsx · icons.tsx  — 통합 EXPLORER 트리(그룹화)
├── CanvasTabs.tsx            — [화면][문서][흐름]/[표] 뷰탭 + 노드→뷰 라우팅 (신규)
└── sections/
    ├── DocView.tsx           — 문서 뷰(PRD + 인-뷰 TOC·카드)
    ├── StructureView.tsx     — 흐름 뷰(페이지 맵)
    ├── WireframeView.tsx     — 화면 뷰(무한 캔버스)
    └── ApiDataView.tsx       — 표 뷰
```
구 `SnbRail.tsx`는 폐지(트리가 흡수). 재사용: `BlockRenderer` · `FlowCanvas`/`FlowEdge`/`flow-layout` · `CommittingField` · `useBuilderAutosave` · `GeneratePromptBanner`.

---

## 8. 레퍼런스 (2026-06-14 리서치)

- **manyfast.io** (핵심 — "PRD부터 와이어프레임까지, 기획 AI"): 상단 탭 4단계(PRD/기능명세서/유저플로우/와이어프레임, **API·데이터 없음**=우리 차별점) · 좌측 채팅(되묻기 칩·@멘션·실행모드·모델선택) · 섹션 완성도 % · 빈 상태 "대화하세요". **차이: 매니패스트=단일 문서 파이프라인, 우리=연결 그래프의 여러 뷰.**
- **Claude Design** (claude.ai/design): 채팅+캔버스 2분할 · 수정 4경로 · 생성 전 되묻기 · MCP 앱 가이드(컴포저 상시·플로팅 금지·스켈레톤).
- **Omniflow AI**: Spec→Design→Build 단계, "스펙이 정본"(변경 시 하위 재정렬).
- **ChatPRD**: 고정 섹션 스키마 + 에디터 + 우측 AI 제안 레일 + 인라인 코멘트.

---

## 9. 열린 질문

- IA 명시적 페이지 계층(폴더) 도입 여부 — 현재는 Feature 그룹핑으로 대체.
- ~~뷰탭 집합 노드별 확정~~ → **확정(ASS-071)**: Page=[화면][문서][흐름] · Feature=[문서][흐름] · Requirement=[문서] · 루트=[흐름][문서] · UI요소=[화면] · API/DB=[표]. 단일 출처 `CanvasTabs.NODE_TABS`.
- 내보내기 포맷 범위(ASS-040) · 진행률 % 계산식(매핑 완성도 기준).
- 채팅 중앙 히어로(A)→측면 도크(C) 전환 애니메이션·레이아웃 디테일.
