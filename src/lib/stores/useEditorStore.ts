import { create } from "zustand"
import type { Priority, RequirementStatus } from "@/lib/types/assembler"
import type { ChangePlan } from "@/lib/types/chat"

// 에디터 UI 상태 — 프로토타입 02-editor.html의 JS 상태를 store로 옮김.
// 데이터(워크스페이스/디자인/api/db)는 useEditorData가 소유, 여기는 화면 상태만.
// AI 챗 좌 토글(leftMode)은 폐지(#12) — 챗은 하단 도크(ASM-018)로 이동.

// "wire" 제거(ASM-052 와이어 후퇴) — 뷰는 숨김, 데이터·타입(Wireframe·UIElement)은 휴면 보존.
export type EditorView = "doc" | "spec" | "flow" | "data"
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
  // 하단 AI 챗 도크(ASM-018) — 접이식. 변경 계획이 생기면 자동으로 열린다.
  dockOpen: boolean
  specView: SpecView
  dataSeg: DataSeg
  selectedTable: string | null
  inspected: InspectedKind
  specFilters: SpecFilters
  // 명세 선택 — 트리·디렉토리 뷰가 같은 선택을 공유한다(#41). null이면 뷰가 첫 항목으로 보정.
  specSelectedReqId: string | null
  specSelectedFeatureId: string | null
  specSelectedDetailId: string | null
  // 벌크 체크(#32·#34) — 행 선택(inspected)과 독립. 사라진 id는 뷰가 표시 시점에 걸러낸다.
  specCheckedIds: string[]
  // 변경 계획(ASM-046) — 컴포넌트 로컬이면 도크 언마운트·재렌더에 조용히 소멸해 store 소유.
  // 계획은 특정 워크스페이스의 스펙에만 유효 — 소속 id를 함께 들어 전환 시 무효 판정에 쓴다.
  activePlan: ChangePlan | null
  activePlanWorkspaceId: string | null
  // 검토 중 계획이 있을 때 도착한 새 계획 — 확인 없이 활성 계획을 대체하지 않는다(무언 대체 금지).
  pendingPlan: ChangePlan | null
  // 활성 계획의 식별자 — 수령·교체·승격마다 증가. 카드 리마운트 키(key)이자
  // 늦은 콜백의 identity 가드(clearActivePlan). ChangePlan 자체엔 id가 없어 store가 부여한다.
  planSeq: number
  // 지금 보고 있는 워크스페이스(enterWorkspace가 기록) — 늦은 타 워크스페이스 챗 응답의
  // 쓰기 측 드랍 판정에 쓴다(소유 렌더 필터는 "보이는 쪽"만 막고 덮어쓰기는 못 막는다).
  currentWorkspaceId: string | null

  setActiveView: (view: EditorView) => void
  // 트리의 DB·API 행 → 데이터 뷰로 진입하며 세그먼트까지 지정.
  openData: (seg: DataSeg) => void
  toggleLeft: () => void
  toggleRight: () => void
  setRightCollapsed: (collapsed: boolean) => void
  setSpecView: (view: SpecView) => void
  setDataSeg: (seg: DataSeg) => void
  setSelectedTable: (id: string | null) => void
  setSpecFilters: (filters: Partial<SpecFilters>) => void
  openDock: () => void
  closeDock: () => void
  // 요구사항 선택은 하위(기능·상세) 선택을 함께 접는다 — 상세 패널이 항상 선택 경로와 일치.
  selectSpecReq: (id: string) => void
  selectSpecFeature: (id: string) => void
  selectSpecDetail: (featureId: string, detailId: string) => void
  // 뷰의 선택 보정(필터에 걸러진 선택 → 첫 항목) 전용 — 사용자 클릭이 아니므로 inspected를 뺏지 않는다.
  syncSpecSelection: (id: string) => void
  toggleSpecCheck: (id: string) => void
  clearSpecChecks: () => void
  // 계획 도착 관문(ASM-046) — 검토 중 계획이 있으면 대기로 돌려 확인을 요구한다.
  receivePlan: (workspaceId: string, plan: ChangePlan) => void
  confirmReplacePlan: () => void
  dismissPendingPlan: () => void
  // 적용·버리기 완료 — 대기 계획이 있으면 그 계획이 활성으로 승격된다(교체 확인의 자연 귀결).
  // expectedSeq가 현재 planSeq와 다르면 no-op — 적용 in-flight 중 교체된 계획을 늦은 onDone이 소거하지 않게.
  clearActivePlan: (expectedSeq: number) => void
  // 워크스페이스 진입(ASM-046) — UI는 전부 리셋하되 같은 워크스페이스의 계획은 살린다(이탈 소멸 차단).
  enterWorkspace: (workspaceId: string) => void
  // 스펙(워크스페이스) 전환 시 UI 상태 전부 리셋(A-14) — 이전 스펙의 선택이 부활하지 않게.
  resetAll: () => void
}

const INITIAL = {
  activeView: "spec" as EditorView,
  leftCollapsed: false,
  rightCollapsed: false,
  dockOpen: false,
  specView: "dir" as SpecView,
  dataSeg: "api" as DataSeg,
  selectedTable: null,
  inspected: null as InspectedKind,
  specFilters: EMPTY_SPEC_FILTERS,
  specSelectedReqId: null,
  specSelectedFeatureId: null,
  specSelectedDetailId: null,
  specCheckedIds: [] as string[],
  activePlan: null as ChangePlan | null,
  activePlanWorkspaceId: null as string | null,
  pendingPlan: null as ChangePlan | null,
  currentWorkspaceId: null as string | null,
}

// 접힘 바 "계획 대기" 뱃지 노출 조건(ASM-046) — 대기 계획만 남아도 신호를 끄지 않는다.
export function hasWaitingPlan(st: Pick<EditorState, "activePlan" | "pendingPlan">): boolean {
  return st.activePlan !== null || st.pendingPlan !== null
}

// 소유 필터(QA 정정 3) — 늦은 챗 응답이 남긴 다른 워크스페이스 계획은 현재 화면에 비추지 않는다.
export function hasWaitingPlanFor(
  st: Pick<EditorState, "activePlan" | "pendingPlan" | "activePlanWorkspaceId">,
  workspaceId: string,
): boolean {
  return hasWaitingPlan(st) && st.activePlanWorkspaceId === workspaceId
}

export const useEditorStore = create<EditorState>((set) => ({
  ...INITIAL,
  // INITIAL 밖 — 리셋에도 되감지 않는 단조 증가(되감으면 옛 클로저 seq와 충돌해 identity 가드가 뚫린다).
  planSeq: 0,

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
  setSpecFilters: (filters) => set((s) => ({ specFilters: { ...s.specFilters, ...filters } })),
  openDock: () => set({ dockOpen: true }),
  closeDock: () => set({ dockOpen: false }),
  selectSpecReq: (id) =>
    set({ specSelectedReqId: id, specSelectedFeatureId: null, specSelectedDetailId: null, inspected: "spec" }),
  selectSpecFeature: (id) => set({ specSelectedFeatureId: id, specSelectedDetailId: null, inspected: "spec" }),
  selectSpecDetail: (featureId, detailId) =>
    set({ specSelectedFeatureId: featureId, specSelectedDetailId: detailId, inspected: "spec" }),
  syncSpecSelection: (id) =>
    set({ specSelectedReqId: id, specSelectedFeatureId: null, specSelectedDetailId: null }),
  toggleSpecCheck: (id) =>
    set((s) => ({
      specCheckedIds: s.specCheckedIds.includes(id)
        ? s.specCheckedIds.filter((checked) => checked !== id)
        : [...s.specCheckedIds, id],
    })),
  clearSpecChecks: () => set({ specCheckedIds: [] }),
  receivePlan: (workspaceId, plan) =>
    set((s) => {
      // 쓰기 측 가드(통합 보안 리뷰) — 늦은 타 워크스페이스 응답은 드랍. 검토 중 계획을 못 덮는다.
      // currentWorkspaceId 미설정(레거시·테스트 경로)이면 관용 — 기존 동작 유지.
      if (s.currentWorkspaceId !== null && workspaceId !== s.currentWorkspaceId) return {}
      // 검토 중 계획이 있으면 대기로 — 단 다른 워크스페이스 잔재라면 즉시 대체(유효하지 않은 계획 보호 안 함).
      return s.activePlan && s.activePlanWorkspaceId === workspaceId
        ? { pendingPlan: plan }
        : { activePlan: plan, activePlanWorkspaceId: workspaceId, pendingPlan: null, planSeq: s.planSeq + 1 }
    }),
  confirmReplacePlan: () =>
    set((s) =>
      s.pendingPlan ? { activePlan: s.pendingPlan, pendingPlan: null, planSeq: s.planSeq + 1 } : {},
    ),
  dismissPendingPlan: () => set({ pendingPlan: null }),
  clearActivePlan: (expectedSeq) =>
    set((s) => {
      // 늦은 콜백(적용 in-flight 중 교체·승격된 뒤 도착한 onDone)은 남의 계획을 소거하면 안 된다.
      if (expectedSeq !== s.planSeq) return {}
      return s.pendingPlan
        ? { activePlan: s.pendingPlan, pendingPlan: null, planSeq: s.planSeq + 1 }
        : { activePlan: null, activePlanWorkspaceId: null, pendingPlan: null }
    }),
  enterWorkspace: (workspaceId) =>
    set((s) =>
      s.activePlanWorkspaceId === workspaceId
        ? {
            ...INITIAL,
            currentWorkspaceId: workspaceId,
            activePlan: s.activePlan,
            activePlanWorkspaceId: s.activePlanWorkspaceId,
            pendingPlan: s.pendingPlan,
          }
        : { ...INITIAL, currentWorkspaceId: workspaceId },
    ),
  resetAll: () => set(INITIAL),
}))
