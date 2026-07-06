import { beforeEach, describe, expect, it } from "vitest"
import type { ChangePlan } from "@/lib/types/chat"
import { EMPTY_SPEC_FILTERS, hasWaitingPlan, useEditorStore } from "./useEditorStore"

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

// ASM-046 — 변경 계획 생존 신호. 계획을 컴포넌트 로컬에서 store로 승격해
// 무언 대체·접힘 무신호·이탈 소멸 3경로를 막는다.
const makePlan = (title: string): ChangePlan => ({ title, summary: "", ops: [] })

describe("activePlan — 변경 계획 store 승격(ASM-046)", () => {
  it("첫 계획 도착은 즉시 활성 — 소속 워크스페이스를 함께 기록한다", () => {
    const plan = makePlan("결제 요구사항 추가")
    useEditorStore.getState().receivePlan("ws-1", plan)
    const st = useEditorStore.getState()
    expect(st.activePlan).toBe(plan)
    expect(st.activePlanWorkspaceId).toBe("ws-1")
    expect(st.pendingPlan).toBeNull()
  })

  it("미적용 계획 보유 중 새 계획은 대기(pendingPlan)로 — 검토 중 계획을 무언 대체하지 않는다", () => {
    const first = makePlan("첫 계획")
    const second = makePlan("둘째 계획")
    useEditorStore.getState().receivePlan("ws-1", first)
    useEditorStore.getState().receivePlan("ws-1", second)
    const st = useEditorStore.getState()
    expect(st.activePlan).toBe(first)
    expect(st.pendingPlan).toBe(second)
  })

  it("confirmReplacePlan은 대기 계획을 활성으로 교체한다", () => {
    useEditorStore.getState().receivePlan("ws-1", makePlan("첫 계획"))
    const second = makePlan("둘째 계획")
    useEditorStore.getState().receivePlan("ws-1", second)
    useEditorStore.getState().confirmReplacePlan()
    const st = useEditorStore.getState()
    expect(st.activePlan).toBe(second)
    expect(st.pendingPlan).toBeNull()
  })

  it("dismissPendingPlan은 대기 계획만 버리고 검토 중 계획을 지킨다", () => {
    const first = makePlan("첫 계획")
    useEditorStore.getState().receivePlan("ws-1", first)
    useEditorStore.getState().receivePlan("ws-1", makePlan("둘째 계획"))
    useEditorStore.getState().dismissPendingPlan()
    const st = useEditorStore.getState()
    expect(st.activePlan).toBe(first)
    expect(st.pendingPlan).toBeNull()
  })

  it("clearActivePlan(적용·버리기 완료)은 계획 상태를 전부 비운다", () => {
    useEditorStore.getState().receivePlan("ws-1", makePlan("첫 계획"))
    useEditorStore.getState().clearActivePlan()
    const st = useEditorStore.getState()
    expect(st.activePlan).toBeNull()
    expect(st.activePlanWorkspaceId).toBeNull()
    expect(st.pendingPlan).toBeNull()
  })

  it("대기 계획이 있을 때 clearActivePlan은 대기 계획을 활성으로 승격한다 — 교체 확인의 자연 귀결", () => {
    useEditorStore.getState().receivePlan("ws-1", makePlan("첫 계획"))
    const second = makePlan("둘째 계획")
    useEditorStore.getState().receivePlan("ws-1", second)
    useEditorStore.getState().clearActivePlan()
    const st = useEditorStore.getState()
    expect(st.activePlan).toBe(second)
    expect(st.activePlanWorkspaceId).toBe("ws-1")
    expect(st.pendingPlan).toBeNull()
  })

  it("resetAll은 계획 상태도 초기화한다", () => {
    useEditorStore.getState().receivePlan("ws-1", makePlan("첫 계획"))
    useEditorStore.getState().resetAll()
    const st = useEditorStore.getState()
    expect(st.activePlan).toBeNull()
    expect(st.activePlanWorkspaceId).toBeNull()
    expect(st.pendingPlan).toBeNull()
  })
})

describe("enterWorkspace — 워크스페이스 진입 리셋과 계획 생존 범위(ASM-046)", () => {
  it("같은 워크스페이스 재진입: UI 상태는 리셋되고 계획은 생존한다 — 이탈 소멸 차단", () => {
    const plan = makePlan("살아남을 계획")
    useEditorStore.getState().receivePlan("ws-1", plan)
    useEditorStore.getState().setActiveView("data")
    useEditorStore.getState().openDock()

    useEditorStore.getState().enterWorkspace("ws-1")

    const st = useEditorStore.getState()
    expect(st.activeView).toBe("spec")
    expect(st.dockOpen).toBe(false)
    expect(st.activePlan).toBe(plan)
    expect(st.activePlanWorkspaceId).toBe("ws-1")
  })

  it("다른 워크스페이스 진입: 계획은 무효 — 남의 스펙에 적용될 계획을 남기지 않는다", () => {
    useEditorStore.getState().receivePlan("ws-1", makePlan("버려질 계획"))
    useEditorStore.getState().receivePlan("ws-1", makePlan("대기도 버려질 계획"))
    useEditorStore.getState().enterWorkspace("ws-2")
    const st = useEditorStore.getState()
    expect(st.activePlan).toBeNull()
    expect(st.activePlanWorkspaceId).toBeNull()
    expect(st.pendingPlan).toBeNull()
  })
})

describe("hasWaitingPlan — 접힘 바 '계획 대기' 뱃지 노출 조건(ASM-046)", () => {
  it("계획이 없으면 false", () => {
    expect(hasWaitingPlan(useEditorStore.getState())).toBe(false)
  })

  it("활성 계획이 있으면 true", () => {
    useEditorStore.getState().receivePlan("ws-1", makePlan("계획"))
    expect(hasWaitingPlan(useEditorStore.getState())).toBe(true)
  })

  it("대기 계획만 남아도 true — 확인 전까지 신호를 끄지 않는다", () => {
    useEditorStore.getState().receivePlan("ws-1", makePlan("첫 계획"))
    useEditorStore.getState().receivePlan("ws-1", makePlan("둘째 계획"))
    expect(hasWaitingPlan(useEditorStore.getState())).toBe(true)
  })
})

describe("specCheckedIds — 벌크 선택(#32·#34)", () => {
  it("초기값은 빈 배열", () => {
    expect(useEditorStore.getState().specCheckedIds).toEqual([])
  })

  it("toggleSpecCheck는 추가/제거를 토글한다", () => {
    useEditorStore.getState().toggleSpecCheck("req-1")
    useEditorStore.getState().toggleSpecCheck("req-2")
    expect(useEditorStore.getState().specCheckedIds).toEqual(["req-1", "req-2"])
    useEditorStore.getState().toggleSpecCheck("req-1")
    expect(useEditorStore.getState().specCheckedIds).toEqual(["req-2"])
  })

  it("체크는 인스펙터 대상(inspected)·행 선택을 건드리지 않는다", () => {
    useEditorStore.getState().selectSpecReq("req-9")
    useEditorStore.getState().toggleSpecCheck("req-1")
    const st = useEditorStore.getState()
    expect(st.inspected).toBe("spec")
    expect(st.specSelectedReqId).toBe("req-9")
  })

  it("clearSpecChecks는 전체 해제(#33), resetAll에도 초기화된다", () => {
    useEditorStore.getState().toggleSpecCheck("req-1")
    useEditorStore.getState().clearSpecChecks()
    expect(useEditorStore.getState().specCheckedIds).toEqual([])

    useEditorStore.getState().toggleSpecCheck("req-1")
    useEditorStore.getState().resetAll()
    expect(useEditorStore.getState().specCheckedIds).toEqual([])
  })
})
