# Assembler 빌더 — 좌측 사이드바 & 캔버스 정의

> 확정일: 2026-06-12. Figma 사이드바(Pages + Layers) 레퍼런스 기반 사용자 결정.
> 관련 티켓: ASS-025~027(셸·사이드바), ASS-033~034(캔버스). 선행: ASS-013·015·022.

목적: 모든 UI Element가 매핑(State·Action·API·DB·Result)을 갖고, **누락이 화면에서 바로 보이게** 한다.
객체 매핑: Figma Pages = Assembler `Page` · Figma Layers = 선택 Page의 `Wireframe.uiElementIds` 트리.

---

## 1. 좌측 사이드바 — 아이콘 레일 + Pages/Layers 2단

```
┌─┬──────────────────────┐
│레│ 프로젝트명 ▾   [접기] │  ← 인라인 rename + autosave 상태
│일│──────────────────────│
│  │ Pages         🔍  +  │
│📄│  Landing             │
│🔀│  MyPage   ◀선택  ⚠2 │  ← 매핑 미완성 요소 수
│⚙️│  Plan                │
│  │──────────────────────│
│  │ Layers           ☰   │  ← 전체 접기/펼치기
│  │  ▸ Hero Section      │
│  │    [btn] Submit  ⚠   │  ← 타입 아이콘 + 매핑 미완성
│  │    [inp] Email       │
└─┴──────────────────────┘
```

### 아이콘 레일 (~48px)

| 모드 | 사이드바 내용 |
|---|---|
| 📄 Pages (기본) | Pages + Layers 2단 |
| 🔀 Flow | UserFlow edge 리스트 (from→to, trigger) |
| 📋 Spec | Requirements / Features 리스트 |
| ⚙️ API/DB | Api / Database 리스트 (Used By 표시) |

active 표시 = `COLOR.ACCENT` (탭 active 용도).

### Pages 섹션

- 데이터: 프로젝트의 `Page[]`
- 행: 페이지명 · 선택 하이라이트 · 매핑 미완성 뱃지(`COLOR.WARNING` + 숫자 — 색 단독 의미 전달 금지)
- 액션: 🔍 이름 필터 · `+` 페이지 추가 · 호버 메뉴(이름 바꾸기 / 삭제하기 — danger 확인 모달)
- 클릭 = 캔버스가 해당 프레임으로 팬+줌 핏 + Layers 갱신

### Layers 섹션

- 데이터: 선택 Page의 `Wireframe.uiElementIds` 순서 그대로 (= 세로 스택 렌더 순서)
- 행: type 아이콘(button/input/…) · name · 매핑 미완성 ⚠ (states/action/result/apiIds 누락)
- 클릭 = 캔버스 요소 선택 + Inspector 열기 (양방향 동기)
- 드래그 정렬 = dnd-kit sortable (`reorderBlocks` 패턴)
- 빈 상태: "아직 UI 요소가 없어요. 캔버스에 요소를 추가해 보세요."

---

## 2. 캔버스 — 무한 캔버스 (모든 Page를 한 화면에)

```
┌────────────────────────────────────┐
│  Landing          MyPage           │
│ ┌─────────┐      ┌──────────────┐  │
│ │ Hero    │      │ Email Input  │  │
│ │ CTA ●───┼─────▶│ Submit Btn ● │  │
│ └─────────┘      │ Click→POST   │  │
│                  │ /signup ⚠    │  │
│                  └──────────────┘  │
└────────────────────────────────────┘
```

> 상세 확정 (2026-06-12 추가 결정 3건): ① 프레임 폭 = **디바이스 프리셋**(`Page.device`) ② 매핑 칩 = **⚠ 상시 + 풀 체인은 선택/hover 시** ③ MVP 캔버스 편집 범위 = **보기 + 선택 + 프레임 이동 + 연결 생성** (요소 추가/정렬은 Layers·Inspector 소관).

### 2.1 와이어프레임 렌더 명세

**프레임 지오메트리**

- 폭: `Page.device` 프리셋 — `mobile: 360` / `tablet: 768` / `desktop: 1024` (기본 mobile). 프리셋 맵은 상수 한 곳에서 관리. (`Page.device` 필드 추가 = ASS-045)
- 높이: 콘텐츠 auto (요소 스택 높이), 최소 160px (빈 placeholder 공간).
- 패딩/간격: SPACING 토큰 — 프레임 패딩 16, 요소 간 gap 12.
- 위치: 프레임별 `x/y` 스토어 저장 (기존 `Screen.x/y` 패턴 승계). AI 생성 시 초기 배치는 그리드 (기존 `SCREEN_GAP` 로직).

**프레임 구조 (위→아래)**

- 헤더: 페이지명 + device 라벨 + 매핑 미완성 `⚠N` 카운트. **헤더가 드래그 핸들.** 선택/active 시 `COLOR.ACCENT` 표시.
- 본문: `Wireframe.uiElementIds` 순서대로 세로 스택 — 배열 순서 = 렌더 순서 (wireframe.md).
- 빈 와이어프레임: "아직 UI 요소가 없어요" placeholder (TEXT_MUTED).

**요소(ElementNode) 렌더**

- `BlockRenderer` 재사용: `UIElement.{type, props}` → Block 형태로 어댑트 (ASS-013에서 type 리터럴을 BlockType 10종과 동일하게 맞춤). 읽기 전용 — 컨트롤은 no-op.
- 선택 표시: ACCENT ring. hover는 배경 전환만 (border 변경 금지 — ds-tokens Toss 원칙).
- **매핑 완성 판정 함수 단일화**: `isMappingComplete(el)` 한 곳 — 기준: `states ≥ 1` + `action` 있음 + `result.kind` 존재. `kind: "none"`(장식)이면 API/DB 불요. apiIds 빈 stateChange/toast는 경고 아님(클라이언트 전용 동작 허용) — **⚠는 필수 필드 누락만.** 사이드바 Pages 뱃지·Layers ⚠·캔버스 ⚠가 모두 같은 함수를 쓴다.
- ⚠ 표시 (상시): 미완성 요소 우측에 `COLOR.WARNING` 아이콘+dot (색 단독 의미 전달 금지).

**매핑 칩 (선택/hover 시 펼침)**

- 내용: `Action → API(method path) → DB(name) → Result(kind 라벨)` 체인. 누락 항목은 칩 안에 "API 미지정" 식 WARNING 표기.
- 위치: 요소 바로 아래 인라인 확장 (프레임 폭 내). 칩 클릭 = Inspector 해당 섹션 포커스.
- 동시에 하나만 펼침 (선택된 요소).

**UserFlow 엣지 앵커**

- 출발: `result.kind === "navigate"` 요소의 우측 중앙 — 요소 높이가 타입별 가변이므로 **DOM 측정(ref + offsetTop)**, 고정 행높이 계산 금지. 줌 scale 보정 필수.
- 도착: 대상 프레임 좌측 변 (헤더 아래 지점). 트리거 요소 미특정 edge는 프레임 우측 중앙에서 출발 (폴백).
- 렌더: flow-view-pattern.md cubic bezier + 화살표, 기존 `FlowEdge` 이식. hover 시 트리거 요소 이름 라벨.
- **단일 출처 (flow.md)**: 엣지는 UserFlow edge 데이터에서만 그린다. result가 navigate로 바뀌면 edge 자동 생성, 제거되면 정리.

**레이어/z-order**: 엣지 SVG(최하단, `pointerEvents: none`) → 프레임들 → 선택 프레임(zIndex 최상위) → 진행 중 연결선(ACCENT 점선, FlowCanvas pending 패턴).

**무결성/예외**: dangling `uiElementId`는 렌더 skip (정규화는 ASS-019 소관). `type` 불량 값은 ASS-019 폴백(text→캔버스는 방어 렌더 안 함). 빈 캔버스: "아직 페이지가 없어요. 첫 페이지를 추가해 보세요." + [페이지 추가하기] solid.

**성능 규칙**: 프레임 드래그·팬·줌은 로컬 state/ref + CSS transform, 스토어 커밋은 pointerup 1회 (FlowCanvas 기존 패턴 승계 — perf-diagnosis.md). 매핑 칩 펼침은 선택 요소 1개만 리렌더되도록 selector 분리.

### 2.2 캔버스 제어 기능

| # | 기능 | 트리거 | 동작 | 범위 |
|---|---|---|---|---|
| 1 | 팬 | 트랙패드 스크롤 / 스페이스+드래그 / 빈 공간 드래그 | transform translate | MVP |
| 2 | 줌 | Cmd+휠 / 핀치 / 우하단 ± 버튼 | scale 0.25~2x, 커서 위치 중심 | MVP |
| 3 | 줌 리셋·전체 핏 | 우하단 컨트롤 + 단축키 `0`(100%)/`1`(핏) | 100% 복귀 / 전체 프레임 bounds 핏 | MVP |
| 4 | 페이지 포커스 | 사이드바 Pages 클릭 / 프레임 헤더 더블클릭 | 해당 프레임 팬+줌 핏 (애니메이션 ≤320ms) | MVP |
| 5 | 프레임 이동 | 프레임 헤더 드래그 | 로컬 state 추적 → pointerup에 스토어 커밋 | MVP |
| 6 | 선택 | 프레임/요소 클릭 (Esc·빈 공간 클릭 해제) | Layers·Inspector 양방향 동기 + 매핑 칩 펼침 | MVP |
| 7 | 연결 생성 | navigate 가능 요소의 ● 핸들 드래그 → 다른 프레임 드롭 | `result: navigate` 설정 + UserFlow edge 생성 (단일 출처) | MVP |
| 8 | 연결 선택·삭제 | 엣지 클릭 선택 → Del / Inspector 제거 | edge 삭제 + 트리거 요소 result `none` 초기화 (동기 유지) | MVP |
| 9 | 페이지 추가 | 사이드바 `+` / 빈 캔버스 CTA | 새 Page+빈 Wireframe, 현재 뷰포트 중앙 배치 | MVP |
| 10 | 페이지 삭제 | 사이드바 호버 메뉴 (danger 확인 모달) | cascade — Wireframe·PageFlow 삭제 + edge 정리 | MVP (캔버스 불가) |
| 11 | 요소 추가/정렬 | — 캔버스 직접 편집 아님 (확정) | Layers 드래그 정렬·추가 / Inspector | 패널 소관 |
| 12 | 미니맵 | — | 우하단 축소 지도 | P2 (페이지 10+) |
| 13 | 다중 선택·일괄 이동 | — | shift+클릭 / 러버밴드 | P2 |
| 14 | undo/redo | — | 그래프 스토어 히스토리 | P2 |

단축키·휠 제스처는 macOS 트랙패드 우선.

---

## 3. 규칙 ↔ UI 매핑 (스펙 정확성 강제 장치)

| 규칙 | 강제 방식 |
|---|---|
| wireframe.md 필수 필드 | Inspector 폼이 states/action/apiIds/databaseIds/result 전부 노출, 누락 ⚠ |
| mapping.md 5질문 | 매핑 칩 체인 상시 표시 |
| flow.md 단일 출처 | 엣지는 UserFlow edge에서만 렌더, navigate result와 자동 동기 |
| object-model.md id 참조 | 스토어 = 정규화 객체 맵, 역참조는 selector 파생 |
| ds-tokens / ds-components / button | 캔버스 렌더도 BlockRenderer→DS 컴포넌트, 하드코딩 hex 0건 |
| file-structure 350줄 | sidebar/(Rail·PagesPanel·LayersPanel), canvas/(InfiniteCanvas·PageFrame·ElementNode·FlowEdges) 분리 |
| flow-view-pattern.md | SVG 엣지 — 라이브러리 무추가, 줌/팬도 CSS transform 우선 |

## 4. 구현 파일 구조 (선행: ASS-013·015·022)

```
src/components/builder/
├── BuilderShell.tsx        — 레일 + 사이드바 + 캔버스 + Inspector 조립 (수정)
├── sidebar/SidebarRail.tsx · PagesPanel.tsx · LayersPanel.tsx
├── canvas/InfiniteCanvas.tsx · PageFrame.tsx · ElementNode.tsx · FlowEdges.tsx
└── inspector/Inspector.tsx — UIElement 매핑 폼으로 확장
```

재사용: `BlockRenderer` · `FlowEdge`/`flow-layout.ts` · `CommittingField` · `useBuilderAutosave` · zustand dirty 패턴.

## 5. 열린 질문

- AI 채팅 패널(ASS-028) 위치 — 기존 계획은 좌측이었으나 좌측은 Pages/Layers로 확정됨. 레일 모드 추가 vs 우측/하단 — 미정.
