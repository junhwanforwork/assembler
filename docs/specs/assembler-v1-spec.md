# Assembler v1 — 기능명세서

> 기획서(Assembler v1 Product Specification)를 **현재 코드(`assembler-be` 리셋 재구축)** 에 정합시킨 v1 단일 출처.
> 데이터 모델·타입은 `src/lib/types/assembler.ts`가 진실이다(리셋 전 `.claude/rules/assembler/*`는 옛 모델 — 가정 금지).

---

## 1. Product Philosophy

Assembler는 **Product IDE** — 제품 스펙(연결된 객체 그래프)을 만들고 관리한다.

- Assembler는 **제품 명세**를 관리한다. **Git이 구현(소스 코드)을 관리**한다.
- 개발자는 구현 전에 Assembler로 제품을 이해한다.
- **v1에서 Assembler는 Git을 대체하지 않는다.** 코드를 생성/편집하지 않는다.

핵심 질문: **"사용자가 이걸 하면, 다음에 무엇이 일어나는가?"** — 모든 요소는 연결된다(고립 산출물 금지).

---

## 2. v1 범위 (기획서 ↔ 현재 코드)

| 기획서 개념 | 현재 코드 | v1 |
| --- | --- | --- |
| Product | `asm_products` | ✅ 있음 |
| Main (Current Product) | `asm_workspaces.is_main=true` | ✅ 있음 |
| Workspace (격리 편집환경) | `asm_workspaces` | ✅ 있음 |
| Pages·Features·Flows·Wireframe·UIElement | `WorkspaceDesign.*` | ✅ 모델+무결성 검증 완비 |
| APIs / Database (read-only) | `asm_apis` / `asm_db_tables` (source=code\|mcp) | ✅ |
| AI Prompt / 그래프 생성 | `/api/generate`, `/products/[id]/files` | ✅ |
| **AI Suggestions** | `POST /workspaces/[id]/suggestions` | 🟢 v1 신설 |
| **Recent Activity** | `asm_activity`, `GET /products/[id]/activity` | 🟢 v1 신설 |
| Developer Mode (컨텍스트 export) | — | ⛔ v1 제외 |
| Repository / Git 상태·Sync | — | ⛔ v1 제외 |
| Workspace Merge | — | ⛔ v1 제외 |
| **스펙 버전·구조적 diff (변경 델타)** | `asm_activity.metadata` 델타 확장 (P1) | 🟢 **v1 편입** (2026-07-02 UX 전략 — north-star ③ 분리 결정, [ux-strategy.md](./ux-strategy.md)) |
| 에디터 Builder UI | (참조: `pre-reset-checkpoint`) | ⏸ 레퍼런스 수령 후 |

### v1 Success Criteria (기획서에서 Dev Mode·Git 제외)
제품/기능/유저플로우 설계 · 와이어프레임 · API/DB 명세 · **AI 제안** · **활동 타임라인**.
v1은 production code 생성·Git 대체·PR 관리·소스 관리를 **하지 않는다**.

---

## 3. 데이터 모델 매핑

```
asm_products (소유권 루트, dual-key RLS: 로그인 user_id / 익명 x-session-id)
├── asm_workspaces (N:1)  ── is_main=true 가 Main(Current Product)
│     └── design: WorkspaceDesign (JSONB)
│           requirements · features · pages · flows · wireframes · elements  (전부 id 참조 연결)
├── asm_apis        (N:1, 코드-진실, 읽기전용)
├── asm_db_tables   (N:1, 코드-진실, 읽기전용)
└── asm_activity    (N:1, 활동 타임라인, append-only)   ← v1 신설
```

- **Main vs Workspace:** 둘 다 같은 Builder로 편집한다 — **로드되는 컨텍스트(어떤 workspace id)만** 다르다.
  v1에서 워크스페이스는 **서로 독립**이다(merge 없음 — 단 **변경 델타 기록은 v1 편입**, 위 표 참조). 스키마의 `is_main`은 유지(후속 merge의 토대).
- **무결성:** 모든 id 참조는 현존 객체를 가리켜야 한다(`findDanglingRefs`, 저장 시 409). 코드-진실 참조는 산출 후 살균.

---

## 4. v1 신설 BE 계약

### 4.1 Recent Activity — 활동 타임라인

- 테이블 `asm_activity(id, product_id, workspace_id?, type, metadata jsonb, created_at)` — **append-only**(updated_at·트리거 없음).
  부모 위임 RLS. `workspace_id`는 `on delete set null`(워크스페이스 삭제해도 이력 보존).
- `type`: `workspace_created · workspace_renamed · workspace_deleted · design_updated · file_generated · apis_synced · db_tables_synced`.
- **표시 카피는 BE에 두지 않는다** — `type` + `metadata`(예: `{name}`, `{count}`, design counts)가 정본. FE가 해요체 문구를 조합(ux-writing).
- 기록은 **best-effort**(라우트가 성공 후 로깅, 실패를 삼켜 메인 op를 깨지 않음).
- 조회: `GET /api/products/[id]/activity` → 최신순 `Activity[]`(기본 30건). 대시보드 Recent Activity·우측 Recent Updates 공용.

### 4.2 AI Suggestions — 워크스페이스 분석 제안

- `POST /api/workspaces/[id]/suggestions` — 워크스페이스 design 그래프 + 제품 코드-진실(apis/dbTables)을 AI로 분석해 실행 제안 반환.
- **온디맨드 생성, v1 영속 없음**(그래프가 바뀌면 stale → 캐시/dismiss는 후속). 대시보드는 Main 워크스페이스 id로 호출.
- `Suggestion { id, kind, title, detail, targetType, targetId }` — `kind`: `missing_api·missing_db·orphan_object·missing_acceptance·gap·improvement`.
  `targetId`는 **현존 객체이거나 null**(없는 id는 살균, dangling 0 보장).
- 생성 파이프라인(`anthropic`/`anthropic-retry`/structured outputs) 재사용. 에러 코드 체계 = generate와 동일(ai_unavailable/refused/error/server_error).

---

## 5. 에디터 (Builder) — ⏸ 레퍼런스 수령 후 확정

레이아웃 골격(기획서):

```
┌ Top Toolbar ─────────────────────────────────┐
├ Explorer │ Main View          │ Inspector ────┤
├──────────┴────────────────────┴───────────────┤
│ AI Prompt Bar (항상 노출, 컨텍스트 인지)       │
└────────────────────────────────────────────────┘
```

- **Explorer:** Main / Workspace 각각 Pages·Features·Flows (APIs·DB는 여기서 편집 안 함 — 읽기전용).
- **Main View:** 선택 객체별 — Page(Overview/Flow/Wireframe) · Feature(Overview/Acceptance/Flow) · Flow(Canvas/Connections).
- **Inspector:** 객체 정보 + 관련 Features/APIs/DB/Flows.
- **참조 구현:** `pre-reset-checkpoint`의 GraphShell/ExplorerTree/GraphInspector/WireframeView/FlowCanvas/PromptPanel + `.claude/rules/flow-view-pattern.md`.
- **제약:** 레이아웃·인터랙션만 새로 정의. **색·디자인 토큰 변경 금지**(`ds-tokens.md`). 화면 결정은 사용자 제공 레퍼런스 기준.
