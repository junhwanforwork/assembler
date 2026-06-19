import { create } from "zustand"
import type {
  ProjectGraph,
  Requirement,
  Feature,
  Page,
  Wireframe,
  UIElement,
  UIElementType,
  UIElementResult,
  UserFlowEdge,
  Api,
  Database,
} from "@/lib/types/assembler"
import { BLOCK_DEF_MAP } from "@/lib/builder/block-catalog"

// Assembler 그래프 스토어 (ASS-022). 옛 builder store와 별개 — 새 4섹션 셸이 ProjectGraph를 소비한다.
// 책임: load/serialize/dirty + 섹션·선택 상태 + 객체 CRUD(카디널 cascade) + 매핑 연결(ASS-023).
// 매핑 = UIElement.apiIds/databaseIds/result + navigate↔UserFlow edge 동기. 역참조 파생은 selectors.ts.

export type GraphSection = "doc" | "structure" | "wireframe" | "apidata"

// 통합 EXPLORER 트리(ASS-070)의 선택 노드 타입. 노드 타입 → 캔버스 뷰탭은 CanvasTabs(ASS-071)가 라우팅.
export type NodeType =
  | "requirement"
  | "feature"
  | "page"
  | "element"
  | "api"
  | "database"
  | "root"

export type SelectedNode = { type: NodeType; id: string }

const uid = () => crypto.randomUUID()

// 새 Page 캔버스 좌표 — 기존 화면 수 기준 그리드(ASS-019 기본 배치와 동일 규칙).
const GAP_X = 320
const GAP_Y = 360
const PER_ROW = 3

interface GraphState {
  projectId: string | null
  graph: ProjectGraph | null
  /** 통합 트리 선택 노드(ASS-070) — 캔버스 뷰탭(CanvasTabs)의 단일 출처. 초기 load 시 root. */
  selectedNode: SelectedNode | null
  selectedPageId: string | null
  selectedElementId: string | null
  /** Tab 트리에서 접힌 노드 id. 기본은 모두 펼침 — 접은 것만 추적(VS Code식). */
  collapsedIds: Set<string>
  hasUnsavedChanges: boolean

  load: (projectId: string, graph: ProjectGraph) => void
  serialize: () => ProjectGraph | null
  markSaved: () => void
  /** 프로젝트 루트 메타(name/description) 편집 — Doc Overview. */
  updateMeta: (patch: Partial<Pick<ProjectGraph, "name" | "description">>) => void

  /** 통합 트리 노드 선택(ASS-070) — selectedPageId/selectedElementId를 일관되게 동기. */
  selectNode: (type: NodeType, id: string) => void
  selectPage: (id: string | null) => void
  selectElement: (id: string | null) => void
  toggleCollapsed: (id: string) => void

  addRequirement: () => string | null
  updateRequirement: (id: string, patch: Partial<Omit<Requirement, "id">>) => void
  removeRequirement: (id: string) => void

  addFeature: () => string | null
  updateFeature: (id: string, patch: Partial<Omit<Feature, "id">>) => void
  removeFeature: (id: string) => void

  addPage: () => string | null
  updatePage: (id: string, patch: Partial<Omit<Page, "id" | "wireframeId">>) => void
  movePage: (id: string, x: number, y: number) => void
  removePage: (id: string) => void

  addUIElement: (wireframeId: string, type: UIElementType, index?: number) => string | null
  updateUIElement: (id: string, patch: Partial<Omit<UIElement, "id">>) => void
  reorderUIElements: (wireframeId: string, orderedIds: string[]) => void
  removeUIElement: (id: string) => void

  addApi: () => string | null
  updateApi: (id: string, patch: Partial<Omit<Api, "id">>) => void
  removeApi: (id: string) => void

  addDatabase: () => string | null
  updateDatabase: (id: string, patch: Partial<Omit<Database, "id">>) => void
  removeDatabase: (id: string) => void

  // Mapping 연결 (ASS-023) — UIElement result↔UserFlow edge 동기 + api/db N:N 토글.
  setUIElementResult: (id: string, result: UIElementResult) => void
  addApiToElement: (elementId: string, apiId: string) => void
  removeApiFromElement: (elementId: string, apiId: string) => void
  addDatabaseToElement: (elementId: string, databaseId: string) => void
  removeDatabaseFromElement: (elementId: string, databaseId: string) => void
}

// 컬렉션에서 id 항목에 patch 적용한 새 배열. patch는 items에서 추론된 T 기준(Omit id).
function patchItem<T extends { id: string }>(items: T[], id: string, patch: Partial<Omit<T, "id">>): T[] {
  return items.map((it) => (it.id === id ? { ...it, ...patch } : it))
}

// 요소 소속 Page 역산: element → wireframe(uiElementIds 포함) → page(wireframe.pageId). 없으면 null.
function pageIdOfElement(g: ProjectGraph, elementId: string): string | null {
  const wf = g.wireframes.find((w) => w.uiElementIds.includes(elementId))
  return wf ? wf.pageId : null
}

// navigate result ↔ UserFlow edge 양방향 동기 (flow.md "화면 간 이동의 단일 출처는 edge").
// - navigate: 이 요소가 트리거인 edge를 from/to에 맞게 생성·갱신. 단 페이지 역산 실패·대상 페이지 부재면 보류(dangling 금지).
// - 그 외 kind: 이 요소가 트리거인 edge 제거(navigate 원인이 사라짐).
function syncNavigateEdge(g: ProjectGraph, elementId: string, result: UIElementResult): UserFlowEdge[] {
  const others = g.userFlow.edges.filter((e) => e.triggerElementId !== elementId)
  if (result.kind !== "navigate") return others
  const fromPageId = pageIdOfElement(g, elementId)
  const toPageId = result.toPageId
  if (!fromPageId || !g.pages.some((p) => p.id === toPageId)) return others
  const existing = g.userFlow.edges.find((e) => e.triggerElementId === elementId)
  const edge: UserFlowEdge = existing
    ? { ...existing, fromPageId, toPageId }
    : { id: uid(), fromPageId, toPageId, triggerElementId: elementId }
  return [...others, edge]
}

export const useGraphStore = create<GraphState>((set, get) => {
  // graph가 있을 때만 fn으로 새 graph를 만들어 dirty 표시. graph 없으면 no-op.
  const mutate = (fn: (g: ProjectGraph) => ProjectGraph) => {
    const g = get().graph
    if (!g) return
    set({ graph: fn(g), hasUnsavedChanges: true })
  }

  return {
    projectId: null,
    graph: null,
    selectedNode: null,
    selectedPageId: null,
    selectedElementId: null,
    collapsedIds: new Set(),
    hasUnsavedChanges: false,

    load: (projectId, graph) =>
      // 기본 랜딩 = root(흐름/개요). 트리·인스펙터는 selectedNode에서 파생.
      set({
        projectId,
        graph,
        selectedNode: { type: "root", id: projectId },
        selectedPageId: null,
        selectedElementId: null,
        collapsedIds: new Set(),
        hasUnsavedChanges: false,
      }),

    serialize: () => get().graph,
    markSaved: () => set({ hasUnsavedChanges: false }),
    updateMeta: (patch) => mutate((g) => ({ ...g, ...patch })),

    // 통합 선택(ASS-070) — selectedNode를 정본으로 두고 page/element 파생 상태를 일관 동기.
    // element: 부모 page를 역산해 selectedPageId까지 세팅 → WireframeView/Inspector가 무변경 동작.
    selectNode: (type, id) => {
      const g = get().graph
      if (type === "page") {
        set({ selectedNode: { type, id }, selectedPageId: id, selectedElementId: null })
      } else if (type === "element") {
        const pageId = g ? pageIdOfElement(g, id) : null
        set({ selectedNode: { type, id }, selectedPageId: pageId, selectedElementId: id })
      } else {
        set({ selectedNode: { type, id }, selectedPageId: null, selectedElementId: null })
      }
    },
    // 캔버스 직접 선택 경로도 selectedNode를 갱신해 라우팅 일관성 유지. id=null이면 root로 복귀.
    selectPage: (id) =>
      set({
        selectedNode: id ? { type: "page", id } : { type: "root", id: get().projectId ?? "root" },
        selectedPageId: id,
        selectedElementId: null,
      }),
    selectElement: (id) =>
      set((s) =>
        id
          ? { selectedNode: { type: "element", id }, selectedElementId: id }
          : {
              selectedNode: s.selectedPageId
                ? { type: "page", id: s.selectedPageId }
                : { type: "root", id: get().projectId ?? "root" },
              selectedElementId: null,
            }
      ),
    toggleCollapsed: (id) =>
      set((s) => {
        const next = new Set(s.collapsedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return { collapsedIds: next }
      }),

    // --- Requirement ---
    addRequirement: () => {
      const id = uid()
      mutate((g) => ({
        ...g,
        requirements: [...g.requirements, { id, title: "새 요구사항", description: "" }],
      }))
      return get().graph ? id : null
    },
    updateRequirement: (id, patch) =>
      mutate((g) => ({ ...g, requirements: patchItem(g.requirements, id, patch) })),
    removeRequirement: (id) =>
      mutate((g) => ({
        ...g,
        requirements: g.requirements.filter((r) => r.id !== id),
        // 역참조 정리: Feature.requirementIds에서 제거.
        features: g.features.map((f) => ({
          ...f,
          requirementIds: f.requirementIds.filter((rid) => rid !== id),
        })),
      })),

    // --- Feature ---
    addFeature: () => {
      const id = uid()
      mutate((g) => ({
        ...g,
        features: [
          ...g.features,
          {
            id,
            name: "새 기능",
            description: "",
            businessRules: [],
            requirementIds: [],
            pageIds: [],
            apiIds: [],
            databaseIds: [],
          },
        ],
      }))
      return get().graph ? id : null
    },
    updateFeature: (id, patch) =>
      mutate((g) => ({ ...g, features: patchItem(g.features, id, patch) })),
    removeFeature: (id) =>
      mutate((g) => ({
        ...g,
        features: g.features.filter((f) => f.id !== id),
        pages: g.pages.map((p) => ({ ...p, featureIds: p.featureIds.filter((fid) => fid !== id) })),
      })),

    // --- Page (+ 빈 Wireframe 동시 생성) ---
    addPage: () => {
      const g = get().graph
      if (!g) return null
      const pageId = uid()
      const wireframeId = uid()
      const i = g.pages.length
      const page: Page = {
        id: pageId,
        name: `페이지 ${i + 1}`,
        description: "",
        featureIds: [],
        wireframeId,
        apiIds: [],
        databaseIds: [],
        x: (i % PER_ROW) * GAP_X,
        y: Math.floor(i / PER_ROW) * GAP_Y,
        device: "mobile",
      }
      const wireframe: Wireframe = { id: wireframeId, pageId, uiElementIds: [] }
      set({
        graph: { ...g, pages: [...g.pages, page], wireframes: [...g.wireframes, wireframe] },
        hasUnsavedChanges: true,
        selectedPageId: pageId,
      })
      return pageId
    },
    updatePage: (id, patch) => mutate((g) => ({ ...g, pages: patchItem(g.pages, id, patch) })),
    movePage: (id, x, y) => mutate((g) => ({ ...g, pages: patchItem(g.pages, id, { x, y }) })),
    removePage: (id) =>
      mutate((g) => {
        const page = g.pages.find((p) => p.id === id)
        const wireframe = page ? g.wireframes.find((w) => w.id === page.wireframeId) : undefined
        const orphanElementIds = new Set(wireframe?.uiElementIds ?? [])
        return {
          ...g,
          pages: g.pages.filter((p) => p.id !== id),
          // cascade: 소속 Wireframe·그 요소·PageFlow 삭제, UserFlow edge·Feature 참조 정리 (object-model.md).
          wireframes: g.wireframes.filter((w) => w.pageId !== id),
          uiElements: g.uiElements.filter((el) => !orphanElementIds.has(el.id)),
          pageFlows: g.pageFlows.filter((pf) => pf.pageId !== id),
          features: g.features.map((f) => ({
            ...f,
            pageIds: f.pageIds.filter((pid) => pid !== id),
          })),
          userFlow: {
            ...g.userFlow,
            edges: g.userFlow.edges.filter((e) => e.fromPageId !== id && e.toPageId !== id),
          },
        }
      }),

    // --- UIElement (Wireframe 소유) ---
    addUIElement: (wireframeId, type, index) => {
      const g = get().graph
      if (!g || !g.wireframes.some((w) => w.id === wireframeId)) return null
      const id = uid()
      const element: UIElement = {
        id,
        name: BLOCK_DEF_MAP[type].label,
        description: "",
        type,
        props: { ...BLOCK_DEF_MAP[type].defaultProps },
        states: [],
        action: "",
        apiIds: [],
        databaseIds: [],
        result: { kind: "none" },
      }
      set({
        graph: {
          ...g,
          uiElements: [...g.uiElements, element],
          wireframes: g.wireframes.map((w) => {
            if (w.id !== wireframeId) return w
            const ids = [...w.uiElementIds]
            ids.splice(index ?? ids.length, 0, id)
            return { ...w, uiElementIds: ids }
          }),
        },
        hasUnsavedChanges: true,
        selectedElementId: id,
      })
      return id
    },
    updateUIElement: (id, patch) =>
      mutate((g) => ({ ...g, uiElements: patchItem(g.uiElements, id, patch) })),
    reorderUIElements: (wireframeId, orderedIds) =>
      mutate((g) => ({
        ...g,
        wireframes: g.wireframes.map((w) =>
          w.id === wireframeId ? { ...w, uiElementIds: orderedIds } : w
        ),
      })),
    removeUIElement: (id) =>
      mutate((g) => ({
        ...g,
        uiElements: g.uiElements.filter((el) => el.id !== id),
        wireframes: g.wireframes.map((w) => ({
          ...w,
          uiElementIds: w.uiElementIds.filter((eid) => eid !== id),
        })),
        // 이 요소가 트리거인 navigate edge 제거 — 결과의 단일 출처가 사라지면 edge도 삭제 (ASS-023, orphan edge 방지).
        userFlow: {
          ...g.userFlow,
          edges: g.userFlow.edges.filter((e) => e.triggerElementId !== id),
        },
      })),

    // --- Api (전역) ---
    addApi: () => {
      const id = uid()
      mutate((g) => ({
        ...g,
        apis: [
          ...g.apis,
          { id, method: "GET", path: "/", purpose: "", databaseIds: [], success: "", error: "" },
        ],
      }))
      return get().graph ? id : null
    },
    updateApi: (id, patch) => mutate((g) => ({ ...g, apis: patchItem(g.apis, id, patch) })),
    removeApi: (id) =>
      mutate((g) => ({
        ...g,
        apis: g.apis.filter((a) => a.id !== id),
        uiElements: g.uiElements.map((el) => ({
          ...el,
          apiIds: el.apiIds.filter((aid) => aid !== id),
        })),
        pages: g.pages.map((p) => ({ ...p, apiIds: p.apiIds.filter((aid) => aid !== id) })),
        features: g.features.map((f) => ({ ...f, apiIds: f.apiIds.filter((aid) => aid !== id) })),
      })),

    // --- Database (전역) ---
    addDatabase: () => {
      const id = uid()
      mutate((g) => ({
        ...g,
        databases: [...g.databases, { id, name: "new_table", purpose: "", columns: [] }],
      }))
      return get().graph ? id : null
    },
    updateDatabase: (id, patch) =>
      mutate((g) => ({ ...g, databases: patchItem(g.databases, id, patch) })),
    removeDatabase: (id) =>
      mutate((g) => ({
        ...g,
        databases: g.databases.filter((d) => d.id !== id),
        apis: g.apis.map((a) => ({ ...a, databaseIds: a.databaseIds.filter((did) => did !== id) })),
        uiElements: g.uiElements.map((el) => ({
          ...el,
          databaseIds: el.databaseIds.filter((did) => did !== id),
        })),
        pages: g.pages.map((p) => ({ ...p, databaseIds: p.databaseIds.filter((did) => did !== id) })),
        features: g.features.map((f) => ({
          ...f,
          databaseIds: f.databaseIds.filter((did) => did !== id),
        })),
      })),

    // --- Mapping 연결 (ASS-023) ---
    setUIElementResult: (id, result) => {
      const g = get().graph
      if (!g || !g.uiElements.some((el) => el.id === id)) return
      mutate((g) => ({
        ...g,
        uiElements: patchItem(g.uiElements, id, { result }),
        userFlow: { ...g.userFlow, edges: syncNavigateEdge(g, id, result) },
      }))
    },
    addApiToElement: (elementId, apiId) => {
      const g = get().graph
      if (!g || !g.apis.some((a) => a.id === apiId)) return // 존재하는 Api만 연결 (dangling 금지)
      mutate((g) => ({
        ...g,
        uiElements: g.uiElements.map((el) =>
          el.id === elementId && !el.apiIds.includes(apiId)
            ? { ...el, apiIds: [...el.apiIds, apiId] }
            : el
        ),
      }))
    },
    removeApiFromElement: (elementId, apiId) =>
      mutate((g) => ({
        ...g,
        uiElements: g.uiElements.map((el) =>
          el.id === elementId ? { ...el, apiIds: el.apiIds.filter((aid) => aid !== apiId) } : el
        ),
      })),
    addDatabaseToElement: (elementId, databaseId) => {
      const g = get().graph
      if (!g || !g.databases.some((d) => d.id === databaseId)) return // 존재하는 Database만 연결
      mutate((g) => ({
        ...g,
        uiElements: g.uiElements.map((el) =>
          el.id === elementId && !el.databaseIds.includes(databaseId)
            ? { ...el, databaseIds: [...el.databaseIds, databaseId] }
            : el
        ),
      }))
    },
    removeDatabaseFromElement: (elementId, databaseId) =>
      mutate((g) => ({
        ...g,
        uiElements: g.uiElements.map((el) =>
          el.id === elementId
            ? { ...el, databaseIds: el.databaseIds.filter((did) => did !== databaseId) }
            : el
        ),
      })),
  }
})
