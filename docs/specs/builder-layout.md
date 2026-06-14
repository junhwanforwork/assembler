# Assembler 빌더 — IA & 레이아웃 정의

> 재작성: 2026-06-14. 구 모델("단일 무한 캔버스 + 좌측 레일 4모드", 2026-06-12)을 **5영역 셸 + 4섹션**으로 대체.
> 레퍼런스: manyfast.io(거의 동일 제품) · Claude Design · Omniflow AI · ChatPRD (§8).
> 관련 티켓: ASS-025~036·016·059. 선행: ASS-016/017/022(그래프 타입 강등·영속·스토어).

목적: 제품 아이디어를 **연결된 객체 그래프**로 다루되, 매핑 누락이 화면에서 바로 보이게 한다. AI 프롬프트가 그래프를 생성·수정하고, 4개 섹션이 객체 종류를 나눠 보여준다.

---

## 1. 플로우 상태 — 빈 vs 생성 중 vs 작업 있음

빈 신규 프로젝트에서 **빈 섹션 4개를 보여주지 않는다**(경쟁하는 빈 상태 = 고립 산출물). 프롬프트가 화면을 차지하고, 그래프가 생기면 워크스페이스로 자란다. 분기 기준 = 그래프가 비었는지(객체 0).

| 상태 | 화면 |
|---|---|
| **A. 빈(작업 0)** | Canvas에 **대화 히어로** — "대화하세요, 기획이 완성됩니다" + **주제 추천** + **파일 업로드로 시작**. 섹션 셸은 보이되 콘텐츠 자리는 안내. |
| **B. 생성 중** | 섹션 셸 유지 + **스켈레톤 스트리밍** — 체인 순서(Requirement→Feature→Page→UIElement→Api→Database)로 차오름. 스피너 X. (옵션: 생성 전 plan 미리보기) |
| **C. 작업 있음** | **4섹션 워크스페이스** 풀. 섹션 내 하위가 비면 그 자리에 per-section 빈 상태(카피+CTA 1개). |

라우트는 하나(`/project/[id]` → `BuilderShell`). A/B/C는 `BuilderShell` 내부 상태로 분기.

---

## 2. 5영역 레이아웃

```
┌───────────────────────────────────────────────────────────┐
│ Header   프로젝트명 · 진행률% · 공유 · 내보내기            │
├──┬──────────┬───────────────────────────────┬─────────────┤
│SNB│  Tab     │                               │  Prompt     │
│아 │ (섹션별  │          Canvas               │ (AI 대화 +  │
│이 │  내비)   │   (섹션 따라 표면 변신)        │  입력, 상시)│
│콘 │          │                               │             │
└──┴──────────┴───────────────────────────────┴─────────────┘
```

| 영역 | 역할 | 내용 |
|---|---|---|
| **Header** | 정체성 + 전역 액션 | ◀대시보드 · 프로젝트명(인라인 rename) · 저장 상태 · **진행률 %** · **공유** · **내보내기**(MD/JSON/이미지) |
| **SNB 아이콘** (~48px) | 메인 섹션 전환 | 📄문서 · 🗺️Structure · ▭Wireframe · ⚙️API·데이터 / 하단 🏠대시보드·🔍검색·설정. active=`COLOR.ACCENT`. 선택이 Tab+Canvas 결정 |
| **Tab 내비** | 선택 섹션 아웃라인/목록 | §3 각 섹션 참조 |
| **Canvas** | 작업 표면(섹션 따라 변신) | §3 각 섹션 참조. 빈/생성 상태는 §1 |
| **Prompt** (우측 고정) | 상시 AI 대화+입력 | §4 |

- Prompt는 **우측 고정 패널**(하단 도킹 아님). 풀스크린에서 항상 노출·플로팅 금지·가장자리 패딩(Claude MCP 앱 가이드라인).

---

## 3. 섹션별 표면

### 3.1 📄 문서 (PRD)
- **Tab**: PRD 목차 — 개요 · 요구사항 목록 · 기능명세 목록 (클릭 시 Canvas 해당 섹션 포커스)
- **Canvas**: **문서 에디터** — 객체가 정본(자유 마크다운 아님). Overview(name/description) · Requirements · Features(businessRules)를 구조화 섹션으로 렌더 + 인라인 편집. 설명 본문은 마크다운 허용.
- 소비 객체: Project(overview) · Requirement · Feature
- 재사용: react-markdown(설치됨·미사용). 신규: 섹션 렌더러(객체→문서). (구 `doc.ts` SpecComponent는 UIElement states/action/result로 대체·제거됨 — ASS-016)

### 3.2 🗺️ Structure (IA + UserFlow)
- **Tab**: 페이지 목록 (Feature 그룹별)
- **Canvas**: **페이지 맵** — 페이지=노드(이름+썸네일), **Feature 그룹핑=IA 차원**, **UserFlow=엣지**(trigger·조건 라벨), 진입 페이지 마커. 축소·구조 뷰.
- 소비 객체: Page · Feature(그룹핑) · UserFlow
- **Wireframe 연결**: 페이지 노드 클릭 → Wireframe 섹션의 그 페이지 상세로 점프. Structure=구조 지도, Wireframe=상세.
- IA 그룹핑은 현재 Feature 기준(Feature.pageIds). 명시적 페이지 계층(폴더)은 모델 추가 검토(열린 질문 §9).

### 3.3 ▭ Wireframe (무한 캔버스 — 페이지 상세)
- **Tab**: Pages 목록 + 선택 페이지의 Layers(`Wireframe.uiElementIds` 순서 트리, 매핑 미완성 ⚠)
- **Canvas**: 무한 캔버스 — Page 프레임 + UIElement 스택 + 매핑 칩 + UserFlow 엣지(Structure와 같은 edge, 읽기 겹침). 상세는 아래.
- 소비 객체: Page · Wireframe · UIElement · PageFlow · (UserFlow edge 읽기)
- **드래그앤드랍 팔레트 없음**(§6). 요소 추가는 Layers/Inspector 폼.

#### 3.3.1 와이어프레임 렌더 명세

**프레임 지오메트리**
- 폭: `Page.device` 프리셋 — `mobile: 360` / `tablet: 768` / `desktop: 1024` (기본 mobile). 프리셋 맵 상수 한 곳. (`Page.device` 필드 = ASS-056)
- 높이: 콘텐츠 auto, 최소 160px. 패딩 16 / 요소 gap 12 (SPACING 토큰).
- 위치: 프레임별 `x/y` 스토어 저장(`Page.x/y`, ASS-015). AI 미생성 좌표는 ASS-019 그리드 기본 배치.

**프레임 구조**: 헤더(페이지명+device 라벨+매핑 미완성 ⚠N, **드래그 핸들**, 선택 시 ACCENT) → 본문(`uiElementIds` 순서 세로 스택) → 빈 와이어프레임 placeholder.

**요소(ElementNode)**
- `BlockRenderer` 재사용(`UIElement.{type,props}`→Block 어댑트, 읽기 전용). 선택=ACCENT ring, hover=배경 전환만.
- **`isMappingComplete(el)` 단일 함수**: `states≥1` + `action` 있음 + `result.kind` 존재. `kind:"none"`(장식)이면 API/DB 불요. apiIds 빈 stateChange/toast는 경고 아님 — **⚠는 필수 필드 누락만.** Tab 뱃지·Layers ⚠·캔버스 ⚠ 모두 이 함수 공유.
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
| 4 | 페이지 포커스 | Tab의 Pages 클릭 / 프레임 헤더 더블클릭 / Structure 노드 클릭 | 프레임 팬+줌 핏 (≤320ms) | MVP |
| 5 | 프레임 이동 | 헤더 드래그 | 로컬 state → pointerup 커밋 | MVP |
| 6 | 선택 | 프레임/요소 클릭 (Esc·빈 공간 해제) | Layers·Inspector 동기 + 매핑 칩 | MVP |
| 7 | 연결 생성 | navigate 요소 ● 핸들 → 다른 프레임 드롭 | `result:navigate` + UserFlow edge 생성 | MVP |
| 8 | 연결 삭제 | 엣지 클릭 → Del / Inspector | edge 삭제 + 트리거 result `none` 초기화 | MVP |
| 9 | 페이지 추가 | Tab `+` / 빈 캔버스 CTA | 새 Page+빈 Wireframe, 뷰포트 중앙 | MVP |
| 10 | 페이지 삭제 | Tab 호버 메뉴 (danger 확인) | cascade — Wireframe·PageFlow·edge 정리 | MVP(캔버스 불가) |
| 11 | 요소 추가/정렬 | 캔버스 직접 편집 아님 | Layers 드래그 정렬·추가 / Inspector | 패널 소관 |
| 12 | 미니맵 | — | 우하단 축소 지도 | P2 |
| 13 | 다중 선택 | — | shift+클릭 / 러버밴드 | P2 |
| 14 | undo/redo | — | 그래프 스토어 히스토리 | P2 |

### 3.4 ⚙️ API·데이터
- **Tab**: API 목록 + Database 목록 (각 Used By)
- **Canvas**: **표 에디터** — Api[](method·path·purpose·success·error·Used By) + Database[](name·purpose·columns·Used By). 인라인 편집 + 행 추가.
- 소비 객체: Api · Database. (Manyfast엔 없는 Assembler 차별점)

---

## 4. Prompt 컴포저 (AI 생성·수정)

> 대화 형식(답변·생성·번호 답변)의 단일 출처는 `docs/specs/ai-prompt-conversation.md` (Epic ASS-E03). 아래는 레이아웃 관점 요약.

- 우측 고정 패널, 모든 섹션 공통. AI 페르소나 대화 로그 + 입력창(0/1000) + 첨부(파일 업로드). 접기 가능.
- 명령 → ProjectGraph 생성/수정(ASS-018) → 전 영역 라이브 반영. **모호할 때만 생성 전 되묻기**(번호 선택, Claude식 — 칩 클릭/번호 타이핑/자유입력).
- Claude Design 수정 패턴 흡수: 요소 핀 인라인 코멘트 · 직접 텍스트 편집 · 조절 슬라이더(간격·색·레이아웃) · 채팅(큰 변경).
- 재사용: 대시보드 `GeneratePromptBanner`(TextInput lg + Button) 패턴. ASS-018 전엔 UI만.

---

## 5. 규칙 ↔ UI 매핑 (스펙 정확성 강제)

| 규칙 | 강제 방식 |
|---|---|
| wireframe.md 필수 필드 | Inspector 폼이 states/action/apiIds/databaseIds/result 노출, 누락 ⚠ |
| mapping.md 5질문 | 매핑 칩 체인 표시 |
| flow.md 단일 출처 | 엣지는 UserFlow edge에서만, Structure·Wireframe 공유 |
| object-model.md id 참조 | 정규화 객체 맵, 역참조 selector 파생 |
| ds-tokens/ds-components/button | BlockRenderer→DS 컴포넌트, 하드코딩 hex 0건 |
| file-structure 350줄 | SNB/Tab/Canvas/Prompt + 섹션별 컴포넌트 분리 |
| flow-view-pattern.md | SVG 엣지 라이브러리 무추가, 줌/팬 CSS transform 우선 |

---

## 6. 부품 드래그앤드랍 제거 (사용자 요청)

- 팔레트 드래그-빌드 플로우 제외. 대상: `src/components/builder/palette/Palette.tsx` · `screen/Palette.tsx` · `screen/ScreenEditor.tsx` 드래그-추가 · store `addBlock`(팔레트 경유).
- 옛 `ScreenEditor`(screens/blocks 수동 빌더)는 Wireframe 캔버스로 대체·사장 → ASS-016 정리에 흡수.
- dnd-kit: Layers 재정렬에 쓰면 유지, 아니면 제거 — ASS-034 시 결정.

---

## 7. 구현 파일 구조 (선행: ASS-016/017/022)

```
src/components/builder/
├── BuilderShell.tsx          — Header + SNB + Tab + Canvas + Prompt 조립
├── shell/SnbRail.tsx · TabNav.tsx · PromptPanel.tsx
├── doc/DocView.tsx           — 문서 섹션(PRD 에디터)
├── structure/StructureMap.tsx — 페이지 맵(IA+UserFlow)
├── wireframe/InfiniteCanvas.tsx · PageFrame.tsx · ElementNode.tsx · FlowEdges.tsx
├── apidata/ApiDataView.tsx   — 표 에디터
└── inspector/Inspector.tsx   — UIElement 매핑 폼
```
재사용: `BlockRenderer` · `FlowCanvas`/`FlowEdge`/`flow-layout` · `CommittingField` · `useBuilderAutosave` · `GeneratePromptBanner` · zustand dirty 패턴.

---

## 8. 레퍼런스 (2026-06-14 리서치)

- **manyfast.io** (핵심 — 거의 동일 제품 "PRD부터 와이어프레임까지, 기획 AI"): 탭 4개(요구사항/기능명세서/유저플로우/와이어프레임, API·데이터 없음=차별점) · 하단 프롬프트 컴포저+AI 페르소나 · 빈 상태 "대화하세요"+주제추천+파일업로드 · 우측 진행률 % · 원클릭 내보내기(엑셀·이미지·MD).
- **Claude Design** (claude.ai/design): 채팅+캔버스 2분할 · 수정 4경로(채팅·인라인 코멘트·직접편집·슬라이더) · 생성 전 되묻기 · repo-aware(후순위) · export/핸드오프 · MCP 앱 가이드(컴포저 상시·플로팅 금지·스켈레톤).
- **Omniflow AI**: Spec→Design→Build 단계=탭, "스펙이 정본"(변경 시 하위 재정렬).
- **ChatPRD**: 고정 섹션 스키마 + 에디터 + 우측 AI 제안 레일 + 인라인 코멘트.

---

## 9. 열린 질문

- IA 명시적 페이지 계층(폴더) 도입 여부 — 현재는 Feature 그룹핑으로 대체.
- Prompt 패널 = 전체 채팅(로그+입력) vs 입력만 — 기본 전체 채팅.
- 내보내기 포맷 범위(ASS-040) · 진행률 % 계산식(매핑 완성도 기준).
