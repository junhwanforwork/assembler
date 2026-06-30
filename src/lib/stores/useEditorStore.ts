import { create } from "zustand"

// 에디터 UI 상태 — 프로토타입 02-editor.html의 JS 상태를 store로 옮김.
// 데이터(워크스페이스/디자인/api/db)는 useEditorData가 소유, 여기는 화면 상태만.

export type EditorView = "doc" | "spec" | "flow" | "wire" | "data"
export type LeftMode = "tree" | "chat"
export type SpecView = "tree" | "dir" | "doc"
export type DataSeg = "api" | "db"

type EditorState = {
  activeView: EditorView
  leftMode: LeftMode
  leftCollapsed: boolean
  rightCollapsed: boolean
  specView: SpecView
  dataSeg: DataSeg
  selectedTable: string | null

  setActiveView: (view: EditorView) => void
  // 트리의 DB·API 행 → 데이터 뷰로 진입하며 세그먼트까지 지정.
  openData: (seg: DataSeg) => void
  setLeftMode: (mode: LeftMode) => void
  toggleLeft: () => void
  toggleRight: () => void
  setRightCollapsed: (collapsed: boolean) => void
  setSpecView: (view: SpecView) => void
  setDataSeg: (seg: DataSeg) => void
  setSelectedTable: (id: string | null) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  activeView: "spec",
  leftMode: "tree",
  leftCollapsed: false,
  rightCollapsed: false,
  specView: "dir",
  dataSeg: "api",
  selectedTable: null,

  setActiveView: (view) => set({ activeView: view }),
  openData: (seg) => set({ activeView: "data", dataSeg: seg }),
  setLeftMode: (mode) => set({ leftMode: mode }),
  toggleLeft: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
  toggleRight: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
  setRightCollapsed: (collapsed) => set({ rightCollapsed: collapsed }),
  setSpecView: (view) => set({ specView: view }),
  setDataSeg: (seg) => set({ dataSeg: seg }),
  setSelectedTable: (id) => set({ selectedTable: id }),
}))
