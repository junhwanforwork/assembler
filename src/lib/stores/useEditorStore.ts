import { create } from "zustand"
import type { Priority, RequirementStatus } from "@/lib/types/assembler"

// 에디터 UI 상태 — 프로토타입 02-editor.html의 JS 상태를 store로 옮김.
// 데이터(워크스페이스/디자인/api/db)는 useEditorData가 소유, 여기는 화면 상태만.
// AI 챗 좌 토글(leftMode)은 폐지(#12) — 챗은 하단 도크(ASM-018)로 이동.

export type EditorView = "doc" | "spec" | "flow" | "wire" | "data"
export type SpecView = "tree" | "dir" | "doc"
export type DataSeg = "api" | "db"

// 공용 인스펙터(우패널)가 지금 비추는 대상 — 마지막 선택이 이긴다(A-11 상세 단일 집).
export type InspectedKind = "spec" | "table" | null

// 기능명세서 필터(#27)·검색(#29) — 인스펙터의 점프 가드(#39)와 공유해야 해서 store 소유.
export type SpecFilters = {
  status: RequirementStatus | "all"
  priority: Priority | "all"
  role: string | "all"
  query: string
}

export const EMPTY_SPEC_FILTERS: SpecFilters = { status: "all", priority: "all", role: "all", query: "" }

type EditorState = {
  activeView: EditorView
  leftCollapsed: boolean
  rightCollapsed: boolean
  specView: SpecView
  dataSeg: DataSeg
  selectedTable: string | null
  inspected: InspectedKind
  specFilters: SpecFilters
  // 명세 선택 — 트리·디렉토리 뷰가 같은 선택을 공유한다(#41). null이면 뷰가 첫 항목으로 보정.
  specSelectedReqId: string | null
  specSelectedFeatureId: string | null
  specSelectedDetailId: string | null

  setActiveView: (view: EditorView) => void
  // 트리의 DB·API 행 → 데이터 뷰로 진입하며 세그먼트까지 지정.
  openData: (seg: DataSeg) => void
  toggleLeft: () => void
  toggleRight: () => void
  setRightCollapsed: (collapsed: boolean) => void
  setSpecView: (view: SpecView) => void
  setDataSeg: (seg: DataSeg) => void
  setSelectedTable: (id: string | null) => void
  setSpecFilters: (filters: SpecFilters) => void
  // 요구사항 선택은 하위(기능·상세) 선택을 함께 접는다 — 상세 패널이 항상 선택 경로와 일치.
  selectSpecReq: (id: string) => void
  selectSpecFeature: (id: string) => void
  selectSpecDetail: (featureId: string, detailId: string) => void
  // 스펙(워크스페이스) 전환 시 UI 상태 전부 리셋(A-14) — 이전 스펙의 선택이 부활하지 않게.
  resetAll: () => void
}

const INITIAL = {
  activeView: "spec" as EditorView,
  leftCollapsed: false,
  rightCollapsed: false,
  specView: "dir" as SpecView,
  dataSeg: "api" as DataSeg,
  selectedTable: null,
  inspected: null as InspectedKind,
  specFilters: EMPTY_SPEC_FILTERS,
  specSelectedReqId: null,
  specSelectedFeatureId: null,
  specSelectedDetailId: null,
}

export const useEditorStore = create<EditorState>((set) => ({
  ...INITIAL,

  setActiveView: (view) => set({ activeView: view }),
  openData: (seg) => set({ activeView: "data", dataSeg: seg }),
  toggleLeft: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
  toggleRight: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
  setRightCollapsed: (collapsed) => set({ rightCollapsed: collapsed }),
  setSpecView: (view) => set({ specView: view }),
  setDataSeg: (seg) => set({ dataSeg: seg }),
  // 해제(null)는 테이블을 비추던 중일 때만 인스펙터를 비운다 — spec 인스펙션 침범 금지.
  setSelectedTable: (id) =>
    set((s) => ({ selectedTable: id, inspected: id ? "table" : s.inspected === "table" ? null : s.inspected })),
  setSpecFilters: (filters) => set({ specFilters: filters }),
  selectSpecReq: (id) =>
    set({ specSelectedReqId: id, specSelectedFeatureId: null, specSelectedDetailId: null, inspected: "spec" }),
  selectSpecFeature: (id) => set({ specSelectedFeatureId: id, specSelectedDetailId: null, inspected: "spec" }),
  selectSpecDetail: (featureId, detailId) =>
    set({ specSelectedFeatureId: featureId, specSelectedDetailId: detailId, inspected: "spec" }),
  resetAll: () => set(INITIAL),
}))
