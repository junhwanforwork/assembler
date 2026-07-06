import { beforeEach, describe, expect, it } from "vitest"
import { useEditorStore } from "./useEditorStore"

// ASM-052 와이어 후퇴 — 옛 #46 요소 선택(selectElement) 테스트를 "후퇴 상태 검증"으로 갱신.
// 삭제가 아니라 갱신인 이유(패킷): 와이어 관련 스펙은 숨김 상태 검증으로 남겨 부활 회귀를 잡는다.

beforeEach(() => {
  useEditorStore.getState().resetAll()
})

describe("와이어 후퇴(ASM-052) — 요소 선택 표면이 store에 없다", () => {
  it("selectedElementId 상태와 selectElement 액션이 제거됐다", () => {
    const st = useEditorStore.getState() as unknown as Record<string, unknown>
    expect("selectedElementId" in st).toBe(false)
    expect("selectElement" in st).toBe(false)
  })

  it("초기 activeView는 wire가 아니다 (기본 spec 유지)", () => {
    expect(useEditorStore.getState().activeView).toBe("spec")
  })

  it("테이블 해제(null)는 테이블 인스펙션만 비운다 — 남은 인스펙터 규칙 유지", () => {
    useEditorStore.getState().setSelectedTable("tbl-1")
    expect(useEditorStore.getState().inspected).toBe("table")
    useEditorStore.getState().setSelectedTable(null)
    expect(useEditorStore.getState().inspected).toBeNull()
  })

  it("명세 선택 인스펙션(A-11)은 그대로 동작한다", () => {
    useEditorStore.getState().selectSpecReq("req-1")
    expect(useEditorStore.getState().inspected).toBe("spec")
  })
})
