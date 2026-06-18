import { create } from "zustand"
import type { ProjectGraph } from "@/lib/types/assembler"

// Assembler 그래프 스토어 — ProjectGraph(연결된 객체 그래프)를 통째로 들고,
// 트리/캔버스/인스펙터가 공유하는 단일 상태. AI Prompt 생성 결과는 loadGraph로 적재한다.
// 레거시 Screen/Block 스토어(store/builder.ts)와 별개 — 여긴 ProjectGraph 전용이다.

/** 그래프 노드 종류 — 선택·아이콘·파생의 단일 키. ProjectGraph 컬렉션과 1:1. */
export type GraphNodeType =
  | "requirement"
  | "feature"
  | "page"
  | "uiElement"
  | "api"
  | "database"

/** 선택된 노드(없으면 null). type+id로 평면 그래프에서 객체를 역참조한다. */
export type GraphSelection = { type: GraphNodeType; id: string } | null

/** 펼침 상태 키 — 같은 id라도 종류가 다르면 다른 노드이므로 `${type}:${id}`로 합성. */
export const nodeKey = (type: GraphNodeType, id: string) => `${type}:${id}`

interface GraphState {
  graph: ProjectGraph | null
  selection: GraphSelection
  /** key = nodeKey(type, id). 존재 = 펼침. 트리 행 토글에서 사용. */
  expanded: Record<string, boolean>

  loadGraph: (graph: ProjectGraph) => void
  select: (selection: GraphSelection) => void
  toggleExpanded: (key: string) => void
  setExpanded: (key: string, open: boolean) => void
}

export const useGraphStore = create<GraphState>((set, get) => ({
  graph: null,
  selection: null,
  expanded: {},

  // 새 그래프 적재 시 요구사항 루트는 기본 펼침 — 첫 화면에서 계층이 바로 보이게.
  loadGraph: (graph) =>
    set({
      graph,
      selection: null,
      expanded: Object.fromEntries(
        graph.requirements.map((r) => [nodeKey("requirement", r.id), true])
      ),
    }),

  select: (selection) => set({ selection }),

  toggleExpanded: (key) => {
    const expanded = { ...get().expanded }
    if (expanded[key]) delete expanded[key]
    else expanded[key] = true
    set({ expanded })
  },

  setExpanded: (key, open) => {
    const expanded = { ...get().expanded }
    if (open) expanded[key] = true
    else delete expanded[key]
    set({ expanded })
  },
}))
