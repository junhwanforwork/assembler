import { beforeEach, describe, expect, it } from "vitest"
import { useEditorStore } from "./useEditorStore"

// #46 요소 선택(ASM-034) 전용 테스트 — 기존 useEditorStore.test.ts는 다른 레인과의
// 충돌을 피해 손대지 않고(패킷 파일 소유 범위 밖) 별도 파일로 추가한다.

beforeEach(() => {
  useEditorStore.getState().resetAll()
})

describe("selectElement — 와이어프레임 요소 선택(#46)", () => {
  it("초기 selectedElementId는 null", () => {
    expect(useEditorStore.getState().selectedElementId).toBeNull()
  })

  it("요소 선택은 selectedElementId를 잡고 inspected를 element로 만든다", () => {
    useEditorStore.getState().selectElement("el-1")
    const st = useEditorStore.getState()
    expect(st.selectedElementId).toBe("el-1")
    expect(st.inspected).toBe("element")
  })

  it("마지막 선택이 이긴다(A-11) — 요소 선택 후 명세 선택이 인스펙터를 가져간다", () => {
    useEditorStore.getState().selectElement("el-1")
    useEditorStore.getState().selectSpecReq("req-1")
    expect(useEditorStore.getState().inspected).toBe("spec")
    // 요소 id 자체는 남는다 — 다시 요소를 선택하면 그 요소가 보이는 기존 테이블 관례와 동일.
    expect(useEditorStore.getState().selectedElementId).toBe("el-1")
  })

  it("테이블 해제(null)가 요소 인스펙션을 침범하지 않는다", () => {
    useEditorStore.getState().setSelectedTable("tbl-1")
    useEditorStore.getState().selectElement("el-1")
    useEditorStore.getState().setSelectedTable(null)
    expect(useEditorStore.getState().inspected).toBe("element")
  })

  it("resetAll(A-14)은 요소 선택도 초기화한다", () => {
    useEditorStore.getState().selectElement("el-1")
    useEditorStore.getState().resetAll()
    const st = useEditorStore.getState()
    expect(st.selectedElementId).toBeNull()
    expect(st.inspected).toBeNull()
  })
})
