import { beforeEach, describe, expect, it } from "vitest"
import type { ChangePlan } from "@/lib/types/chat"
import type { Suggestion } from "@/lib/types/assembler"
import { EMPTY_SPEC_FILTERS, hasWaitingPlan, hasWaitingPlanFor, useEditorStore } from "./useEditorStore"

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
    // 우패널 기본 숨김(ASM-076) — 초기값이 true라 리셋도 true로 돌아간다.
    expect(after.rightCollapsed).toBe(true)
    expect(after.inspected).toBeNull()
  })
})

describe("promptDockWidth — 좌측 도킹 폭(ASM-076, additive)", () => {
  it("초기값은 300", () => {
    expect(useEditorStore.getState().promptDockWidth).toBe(300)
  })
  it("setPromptDockWidth로 폭을 저장한다", () => {
    useEditorStore.getState().setPromptDockWidth(360)
    expect(useEditorStore.getState().promptDockWidth).toBe(360)
  })
  it("resetAll은 폭을 초기값 300으로 되돌린다", () => {
    useEditorStore.getState().setPromptDockWidth(400)
    useEditorStore.getState().resetAll()
    expect(useEditorStore.getState().promptDockWidth).toBe(300)
  })
})

describe("rightCollapsed — 우패널 기본 숨김(ASM-076)", () => {
  it("초기값은 true(우패널 접힘)", () => {
    expect(useEditorStore.getState().rightCollapsed).toBe(true)
  })
  it("setRightCollapsed(false)로 테이블 클릭 등에서 펼 수 있다(과도기 유지)", () => {
    useEditorStore.getState().setRightCollapsed(false)
    expect(useEditorStore.getState().rightCollapsed).toBe(false)
  })
  it("사용자 명세 선택(selectSpec*)은 우패널을 펴지 않는다 — 상세는 플로팅 창이 담당(Wave A)", () => {
    expect(useEditorStore.getState().rightCollapsed).toBe(true)
    useEditorStore.getState().selectSpecReq("req-1")
    expect(useEditorStore.getState().rightCollapsed).toBe(true)

    useEditorStore.getState().resetAll()
    useEditorStore.getState().selectSpecFeature("feat-1")
    expect(useEditorStore.getState().rightCollapsed).toBe(true)
  })
})

describe("specSelectClickSeq — 상세 플로팅 자동 오픈 트리거(Wave A)", () => {
  it("사용자 클릭(selectSpec*)마다 카운터가 오른다", () => {
    const seq0 = useEditorStore.getState().specSelectClickSeq
    useEditorStore.getState().selectSpecReq("req-1")
    expect(useEditorStore.getState().specSelectClickSeq).toBe(seq0 + 1)
    useEditorStore.getState().selectSpecFeature("feat-1")
    expect(useEditorStore.getState().specSelectClickSeq).toBe(seq0 + 2)
    useEditorStore.getState().selectSpecDetail("feat-1", "det-1")
    expect(useEditorStore.getState().specSelectClickSeq).toBe(seq0 + 3)
  })
  it("같은 항목 재클릭도 카운터를 올린다 — 닫은 뒤 재클릭 재오픈용", () => {
    const seq0 = useEditorStore.getState().specSelectClickSeq
    useEditorStore.getState().selectSpecReq("req-1")
    useEditorStore.getState().selectSpecReq("req-1")
    expect(useEditorStore.getState().specSelectClickSeq).toBe(seq0 + 2)
  })
  it("뷰 자동보정(syncSpecSelection)은 카운터를 올리지 않는다 — 클릭이 아니다", () => {
    const seq0 = useEditorStore.getState().specSelectClickSeq
    useEditorStore.getState().syncSpecSelection("req-1")
    expect(useEditorStore.getState().specSelectClickSeq).toBe(seq0)
    expect(useEditorStore.getState().rightCollapsed).toBe(true)
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

// ASM-065 — 문서 종류를 컴포넌트 로컬에서 store로 승격. 좌 레일 하위행·중앙 뷰·오버레이가
// 같은 선택을 공유해야 하고, 로컬 state로는 세 소비처 동기화가 불가능하다.
describe("docKind — 문서 종류 store 승격(ASM-065)", () => {
  it("초기값은 prd", () => {
    expect(useEditorStore.getState().docKind).toBe("prd")
  })

  it("setDocKind로 전환되고 resetAll에 prd로 돌아간다", () => {
    useEditorStore.getState().setDocKind("tech")
    expect(useEditorStore.getState().docKind).toBe("tech")
    useEditorStore.getState().setDocKind("data")
    expect(useEditorStore.getState().docKind).toBe("data")

    useEditorStore.getState().resetAll()
    expect(useEditorStore.getState().docKind).toBe("prd")
  })

  it("setDocKind는 activeView를 바꾸지 않는다 — 뷰 진입은 setActiveView 몫", () => {
    useEditorStore.getState().setActiveView("spec")
    useEditorStore.getState().setDocKind("tech")
    expect(useEditorStore.getState().activeView).toBe("spec")
  })
})

describe("docOverlayOpen — 문서 오버레이 창(ASM-065)", () => {
  it("초기엔 닫혀 있고 open/close로 토글되며 resetAll에 닫힌다", () => {
    expect(useEditorStore.getState().docOverlayOpen).toBe(false)
    useEditorStore.getState().openDocOverlay()
    expect(useEditorStore.getState().docOverlayOpen).toBe(true)
    useEditorStore.getState().closeDocOverlay()
    expect(useEditorStore.getState().docOverlayOpen).toBe(false)

    useEditorStore.getState().openDocOverlay()
    useEditorStore.getState().resetAll()
    expect(useEditorStore.getState().docOverlayOpen).toBe(false)
  })

  it("오버레이 열림은 activeView와 독립 — 다른 뷰에서 작업하며 문서를 띄워 본다", () => {
    useEditorStore.getState().setActiveView("flow")
    useEditorStore.getState().openDocOverlay()
    const st = useEditorStore.getState()
    expect(st.activeView).toBe("flow")
    expect(st.docOverlayOpen).toBe(true)
  })
})

// SW2 — 명세 상세를 플로팅 창(OverlayPanel)으로 여는 추가 표면. 도킹 우패널(RightPanel)은 유지하고
// 플로팅은 명시 버튼 진입의 별도 경로 — 선택 상태(specSelected*)는 기존 store에서 그대로 공유한다.
describe("detailOverlayOpen — 플로팅 상세 패널(SW2)", () => {
  it("초기엔 닫혀 있고 open/close로 토글되며 resetAll에 닫힌다", () => {
    expect(useEditorStore.getState().detailOverlayOpen).toBe(false)
    useEditorStore.getState().openDetailOverlay()
    expect(useEditorStore.getState().detailOverlayOpen).toBe(true)
    useEditorStore.getState().closeDetailOverlay()
    expect(useEditorStore.getState().detailOverlayOpen).toBe(false)

    useEditorStore.getState().openDetailOverlay()
    useEditorStore.getState().resetAll()
    expect(useEditorStore.getState().detailOverlayOpen).toBe(false)
  })

  it("오버레이 열림은 명세 선택(specSelected*)·inspected를 건드리지 않는다 — 선택 상태는 공유만 한다", () => {
    useEditorStore.getState().selectSpecFeature("feat-1")
    useEditorStore.getState().openDetailOverlay()
    const st = useEditorStore.getState()
    expect(st.detailOverlayOpen).toBe(true)
    expect(st.specSelectedFeatureId).toBe("feat-1")
    expect(st.inspected).toBe("spec")
  })

  it("문서 오버레이와 독립 — 상세 오버레이만 여닫아도 문서 오버레이 상태는 그대로", () => {
    useEditorStore.getState().openDetailOverlay()
    expect(useEditorStore.getState().docOverlayOpen).toBe(false)
    useEditorStore.getState().closeDetailOverlay()
    useEditorStore.getState().openDocOverlay()
    expect(useEditorStore.getState().detailOverlayOpen).toBe(false)
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

// ASM-069 — 정책 문서 뷰 진입 + 선택 문서 id. 좌 레일 목록·중앙 편집 뷰가 같은 선택을 공유한다.
describe("policy 뷰 · policySelectedId(ASM-069)", () => {
  it("초기엔 policy가 아니고 선택 id는 null", () => {
    const st = useEditorStore.getState()
    expect(st.activeView).not.toBe("policy")
    expect(st.policySelectedId).toBeNull()
  })

  it("openPolicy는 뷰를 policy로 바꾸고 선택 문서 id를 함께 기록한다", () => {
    useEditorStore.getState().openPolicy("pd-1")
    const st = useEditorStore.getState()
    expect(st.activeView).toBe("policy")
    expect(st.policySelectedId).toBe("pd-1")
  })

  it("새 문서 진입은 id null로 열 수 있다(목록만·미선택)", () => {
    useEditorStore.getState().openPolicy(null)
    const st = useEditorStore.getState()
    expect(st.activeView).toBe("policy")
    expect(st.policySelectedId).toBeNull()
  })

  it("resetAll은 policy 선택을 비우고 뷰를 기본(spec)으로 되돌린다", () => {
    useEditorStore.getState().openPolicy("pd-9")
    useEditorStore.getState().resetAll()
    const st = useEditorStore.getState()
    expect(st.activeView).toBe("spec")
    expect(st.policySelectedId).toBeNull()
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
    useEditorStore.getState().clearActivePlan(useEditorStore.getState().planSeq)
    const st = useEditorStore.getState()
    expect(st.activePlan).toBeNull()
    expect(st.activePlanWorkspaceId).toBeNull()
    expect(st.pendingPlan).toBeNull()
  })

  it("대기 계획이 있을 때 clearActivePlan은 대기 계획을 활성으로 승격한다 — 교체 확인의 자연 귀결", () => {
    useEditorStore.getState().receivePlan("ws-1", makePlan("첫 계획"))
    const second = makePlan("둘째 계획")
    useEditorStore.getState().receivePlan("ws-1", second)
    useEditorStore.getState().clearActivePlan(useEditorStore.getState().planSeq)
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

  // 통합 보안 리뷰 정정(2026-07-06) — 쓰기 측 가드: 늦은 타 워크스페이스 응답이 검토 중 계획을 못 덮게.
  it("늦은 타 워크스페이스 응답은 드랍 — 검토 중 계획을 무언 파괴하지 않는다", () => {
    const reviewing = makePlan("검토 중 계획")
    useEditorStore.getState().enterWorkspace("ws-b")
    useEditorStore.getState().receivePlan("ws-b", reviewing)
    const seqBefore = useEditorStore.getState().planSeq

    useEditorStore.getState().receivePlan("ws-a", makePlan("늦게 도착한 옛 응답"))

    const st = useEditorStore.getState()
    expect(st.activePlan).toBe(reviewing)
    expect(st.activePlanWorkspaceId).toBe("ws-b")
    expect(st.pendingPlan).toBeNull()
    expect(st.planSeq).toBe(seqBefore)
  })

  it("현재 워크스페이스 미설정(레거시 경로)이면 기존처럼 수령한다", () => {
    const plan = makePlan("바로 받는 계획")
    useEditorStore.getState().receivePlan("ws-1", plan)
    expect(useEditorStore.getState().activePlan).toBe(plan)
  })
})

// QA 크로스체크 정정(2026-07-06) — 좁은 창에서 재발하는 무언 소멸 3구멍.
describe("planSeq — 계획 식별자(정정 1: 카드 리마운트 키)", () => {
  it("계획 수령마다 증가한다", () => {
    const before = useEditorStore.getState().planSeq
    useEditorStore.getState().receivePlan("ws-1", makePlan("첫 계획"))
    expect(useEditorStore.getState().planSeq).toBe(before + 1)
  })

  it("대기 등록·대기 폐기는 seq를 바꾸지 않는다 — 검토 중 카드가 유지된다", () => {
    useEditorStore.getState().receivePlan("ws-1", makePlan("첫 계획"))
    const seq = useEditorStore.getState().planSeq
    useEditorStore.getState().receivePlan("ws-1", makePlan("둘째 계획"))
    expect(useEditorStore.getState().planSeq).toBe(seq)
    useEditorStore.getState().dismissPendingPlan()
    expect(useEditorStore.getState().planSeq).toBe(seq)
  })

  it("교체 확인(confirmReplacePlan)은 새 seq — 이전 카드 로컬 상태가 이어지지 않는다", () => {
    useEditorStore.getState().receivePlan("ws-1", makePlan("첫 계획"))
    const seq = useEditorStore.getState().planSeq
    useEditorStore.getState().receivePlan("ws-1", makePlan("둘째 계획"))
    useEditorStore.getState().confirmReplacePlan()
    expect(useEditorStore.getState().planSeq).toBe(seq + 1)
  })

  it("확인 열린 채 승격 재현: 버리기로 승격된 대기 계획은 새 seq를 받는다", () => {
    // P1 검토 중 "버리기" 확인 열림 + P2 대기 → 버리기 → P2가 확인 열린 채 등장하면 X-02 재발.
    // 카드가 key=planSeq로 리마운트되도록 승격은 반드시 seq를 올린다.
    useEditorStore.getState().receivePlan("ws-1", makePlan("P1"))
    const p1Seq = useEditorStore.getState().planSeq
    const p2 = makePlan("P2")
    useEditorStore.getState().receivePlan("ws-1", p2)
    useEditorStore.getState().clearActivePlan(p1Seq)
    const st = useEditorStore.getState()
    expect(st.activePlan).toBe(p2)
    expect(st.planSeq).not.toBe(p1Seq)
  })
})

describe("clearActivePlan identity 가드(정정 2)", () => {
  it("seq 불일치면 no-op — 늦은 onDone이 승격·교체된 계획을 소거하지 않는다", () => {
    useEditorStore.getState().receivePlan("ws-1", makePlan("P1"))
    const p1Seq = useEditorStore.getState().planSeq
    const p2 = makePlan("P2")
    useEditorStore.getState().receivePlan("ws-1", p2)
    // P1 적용 in-flight 중 사용자가 replace bar "바꾸기" — P2가 활성으로.
    useEditorStore.getState().confirmReplacePlan()
    // 뒤늦게 도착한 P1의 onDone — P2를 건드리면 안 된다.
    useEditorStore.getState().clearActivePlan(p1Seq)
    const st = useEditorStore.getState()
    expect(st.activePlan).toBe(p2)
    expect(st.activePlanWorkspaceId).toBe("ws-1")
  })

  it("seq 일치면 정상 소거된다", () => {
    useEditorStore.getState().receivePlan("ws-1", makePlan("P1"))
    useEditorStore.getState().receivePlan("ws-1", makePlan("P2"))
    useEditorStore.getState().confirmReplacePlan()
    useEditorStore.getState().clearActivePlan(useEditorStore.getState().planSeq)
    expect(useEditorStore.getState().activePlan).toBeNull()
  })
})

describe("hasWaitingPlanFor — 소유 워크스페이스 렌더 필터(정정 3)", () => {
  it("계획이 현재 워크스페이스 소유일 때만 true", () => {
    // 늦은 챗 응답이 전환 후 옛 워크스페이스 계획을 저장한 상황 — 남의 계획을 비추면 안 된다.
    useEditorStore.getState().receivePlan("ws-old", makePlan("옛 계획"))
    expect(hasWaitingPlanFor(useEditorStore.getState(), "ws-old")).toBe(true)
    expect(hasWaitingPlanFor(useEditorStore.getState(), "ws-new")).toBe(false)
  })

  it("계획이 없으면 어느 워크스페이스에서도 false", () => {
    expect(hasWaitingPlanFor(useEditorStore.getState(), "ws-1")).toBe(false)
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

// ASM-081 — AI 제안 상태를 컴포넌트 로컬에서 store로 승격(additive). 제안은 3dot 메뉴(Popover)에서
// 꺼내는데 Popover는 열릴 때만 content를 마운트해 로컬 state면 닫을 때마다 유료 AI 결과가 유실된다.
// store 캐시로 "닫아도 결과 유지"를 보장한다. 유료 호출은 명시 트리거만(자동 발사 없음) — store엔 fetch가 없다.
const makeSuggestion = (id: string): Suggestion => ({
  id,
  kind: "improvement",
  title: `제안 ${id}`,
  detail: "설명",
  targetType: null,
  targetId: null,
})

describe("suggestions — AI 제안 store 승격(ASM-081, additive)", () => {
  it("초기값: suggestions=[]·status=idle·error=null·dismissed=[]", () => {
    const st = useEditorStore.getState()
    expect(st.suggestions).toEqual([])
    expect(st.suggestionsStatus).toBe("idle")
    expect(st.suggestionsError).toBeNull()
    expect(st.suggestionsDismissedIds).toEqual([])
  })

  it("startSuggestions는 status를 loading으로 두고 직전 error를 지운다", () => {
    useEditorStore.getState().failSuggestions(new Error("boom"))
    useEditorStore.getState().startSuggestions()
    const st = useEditorStore.getState()
    expect(st.suggestionsStatus).toBe("loading")
    expect(st.suggestionsError).toBeNull()
  })

  it("setSuggestionsResult는 결과를 싣고 loaded로 전환하며 dismiss를 리셋한다", () => {
    useEditorStore.getState().dismissSuggestion("old")
    const list = [makeSuggestion("s1"), makeSuggestion("s2")]
    useEditorStore.getState().setSuggestionsResult(list)
    const st = useEditorStore.getState()
    expect(st.suggestions).toEqual(list)
    expect(st.suggestionsStatus).toBe("loaded")
    expect(st.suggestionsDismissedIds).toEqual([])
  })

  it("failSuggestions는 error를 싣고 status를 error로 둔다", () => {
    const err = new Error("실패")
    useEditorStore.getState().failSuggestions(err)
    const st = useEditorStore.getState()
    expect(st.suggestionsError).toBe(err)
    expect(st.suggestionsStatus).toBe("error")
  })

  it("dismissSuggestion은 id를 dismissed에 추가하고 중복을 만들지 않는다", () => {
    useEditorStore.getState().dismissSuggestion("s1")
    useEditorStore.getState().dismissSuggestion("s1")
    useEditorStore.getState().dismissSuggestion("s2")
    expect(useEditorStore.getState().suggestionsDismissedIds).toEqual(["s1", "s2"])
  })

  it("resetAll·워크스페이스 전환은 제안 캐시를 비운다 — 워크스페이스 스코프", () => {
    useEditorStore.getState().setSuggestionsResult([makeSuggestion("s1")])
    useEditorStore.getState().dismissSuggestion("s1")
    useEditorStore.getState().resetAll()
    const st = useEditorStore.getState()
    expect(st.suggestions).toEqual([])
    expect(st.suggestionsStatus).toBe("idle")
    expect(st.suggestionsDismissedIds).toEqual([])
  })

  it("enterWorkspace(다른 워크스페이스)도 제안 캐시를 비운다", () => {
    useEditorStore.getState().enterWorkspace("ws-1")
    useEditorStore.getState().setSuggestionsResult([makeSuggestion("s1")])
    useEditorStore.getState().enterWorkspace("ws-2")
    expect(useEditorStore.getState().suggestions).toEqual([])
    expect(useEditorStore.getState().suggestionsStatus).toBe("idle")
  })
})
