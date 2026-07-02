import { beforeEach, describe, expect, it } from "vitest"
import { EMPTY_SPEC_FILTERS, useEditorStore } from "./useEditorStore"

// 스토어는 모듈 싱글턴 — 각 테스트는 초기 상태에서 시작한다.
beforeEach(() => {
  useEditorStore.getState().resetAll()
})

describe("resetAll (A-14 — 스펙 전환 시 상태 전부 리셋)", () => {
  it("변이된 상태를 전부 초기값으로 되돌린다", () => {
    const st = useEditorStore.getState()
    st.setActiveView("data")
    st.setSelectedTable("tbl-1")
    st.selectSpecReq("req-1")
    st.setSpecFilters({ ...EMPTY_SPEC_FILTERS, status: "approved" })
    st.toggleLeft()
    st.toggleRight()

    useEditorStore.getState().resetAll()

    const after = useEditorStore.getState()
    expect(after.activeView).toBe("spec")
    expect(after.selectedTable).toBeNull()
    expect(after.specSelectedReqId).toBeNull()
    expect(after.specSelectedFeatureId).toBeNull()
    expect(after.specSelectedDetailId).toBeNull()
    expect(after.specFilters).toEqual(EMPTY_SPEC_FILTERS)
    expect(after.leftCollapsed).toBe(false)
    expect(after.rightCollapsed).toBe(false)
    expect(after.inspected).toBeNull()
  })
})

describe("inspected — 공용 인스펙터 대상 (A-11)", () => {
  it("초기값은 null(아무것도 선택 안 됨)", () => {
    expect(useEditorStore.getState().inspected).toBeNull()
  })

  it("명세 선택은 inspected를 spec으로 만든다", () => {
    useEditorStore.getState().selectSpecReq("req-1")
    expect(useEditorStore.getState().inspected).toBe("spec")

    useEditorStore.getState().resetAll()
    useEditorStore.getState().selectSpecFeature("feat-1")
    expect(useEditorStore.getState().inspected).toBe("spec")

    useEditorStore.getState().resetAll()
    useEditorStore.getState().selectSpecDetail("feat-1", "det-1")
    expect(useEditorStore.getState().inspected).toBe("spec")
  })

  it("테이블 선택은 inspected를 table로 만들고, 해제는 null로 되돌린다", () => {
    useEditorStore.getState().setSelectedTable("tbl-1")
    expect(useEditorStore.getState().inspected).toBe("table")

    useEditorStore.getState().setSelectedTable(null)
    expect(useEditorStore.getState().inspected).toBeNull()
  })

  it("테이블 해제가 명세 선택 상태를 침범하지 않는다 — spec 인스펙션 유지", () => {
    useEditorStore.getState().setSelectedTable("tbl-1")
    useEditorStore.getState().selectSpecReq("req-1")
    // 명세 선택이 마지막 — 테이블 해제가 spec 인스펙션을 지우면 안 된다.
    useEditorStore.getState().setSelectedTable(null)
    expect(useEditorStore.getState().inspected).toBe("spec")
  })

  it("보정 동기화(syncSpecSelection)는 인스펙터를 뺏지 않는다 — 사용자 클릭만 inspected를 바꾼다", () => {
    useEditorStore.getState().setSelectedTable("tbl-1")
    // 명세 뷰 마운트 시 첫 항목 보정 — 테이블을 보고 있던 인스펙터가 하이재킹되면 안 된다.
    useEditorStore.getState().syncSpecSelection("req-1")
    const st = useEditorStore.getState()
    expect(st.specSelectedReqId).toBe("req-1")
    expect(st.specSelectedFeatureId).toBeNull()
    expect(st.inspected).toBe("table")
  })
})

describe("명세 선택 계층 (#41 유지)", () => {
  it("요구사항 선택은 하위(기능·상세) 선택을 접는다", () => {
    const st = useEditorStore.getState()
    st.selectSpecDetail("feat-1", "det-1")
    st.selectSpecReq("req-2")
    const after = useEditorStore.getState()
    expect(after.specSelectedReqId).toBe("req-2")
    expect(after.specSelectedFeatureId).toBeNull()
    expect(after.specSelectedDetailId).toBeNull()
  })
})

describe("specFilters — store 승격(인스펙터 점프 가드 공유)", () => {
  it("초기값은 EMPTY_SPEC_FILTERS", () => {
    expect(useEditorStore.getState().specFilters).toEqual(EMPTY_SPEC_FILTERS)
  })

  it("setSpecFilters는 partial 병합 — 스냅샷 덮어쓰기 없이 준 필드만 바꾼다", () => {
    useEditorStore.getState().setSpecFilters({ status: "approved" })
    useEditorStore.getState().setSpecFilters({ query: "결제" })
    const filters = useEditorStore.getState().specFilters
    expect(filters.status).toBe("approved")
    expect(filters.query).toBe("결제")
    expect(filters.priority).toBe("all")
  })
})

describe("dockOpen — 챗 도크(ASM-018)", () => {
  it("초기엔 접혀 있고 open/close로 토글되며 resetAll에 접힌다", () => {
    expect(useEditorStore.getState().dockOpen).toBe(false)
    useEditorStore.getState().openDock()
    expect(useEditorStore.getState().dockOpen).toBe(true)
    useEditorStore.getState().closeDock()
    expect(useEditorStore.getState().dockOpen).toBe(false)

    useEditorStore.getState().openDock()
    useEditorStore.getState().resetAll()
    expect(useEditorStore.getState().dockOpen).toBe(false)
  })
})

describe("openData (기존 동작 회귀 가드)", () => {
  it("데이터 뷰 진입 + 세그 지정", () => {
    useEditorStore.getState().openData("db")
    const st = useEditorStore.getState()
    expect(st.activeView).toBe("data")
    expect(st.dataSeg).toBe("db")
  })
})
