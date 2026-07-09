import { describe, it, expect } from "vitest"
import { deepestSelectedId, shouldAutoOpenDetail } from "./specAutoOpen"

// ASM-077 — 선택 시 상세 플로팅 자동 오픈의 순수 로직. effect(DetailOverlay)는 이 둘을 ref로 배선만 한다.
// "최심 선택 id가 새 값(non-null)으로 바뀔 때만 연다 / 초기·null 전환은 안 연다"를 순수 함수로 고정.

describe("deepestSelectedId — 최심 선택 id", () => {
  it("셋 다 null이면 null", () => {
    expect(deepestSelectedId({ reqId: null, featureId: null, detailId: null })).toBeNull()
  })

  it("요구사항만 선택이면 요구사항 id", () => {
    expect(deepestSelectedId({ reqId: "req-1", featureId: null, detailId: null })).toBe("req-1")
  })

  it("기능까지 선택이면 기능 id(요구사항보다 깊음)", () => {
    expect(deepestSelectedId({ reqId: "req-1", featureId: "feat-1", detailId: null })).toBe("feat-1")
  })

  it("상세 기능까지 선택이면 상세 id(가장 깊음)", () => {
    expect(deepestSelectedId({ reqId: "req-1", featureId: "feat-1", detailId: "det-1" })).toBe("det-1")
  })
})

describe("shouldAutoOpenDetail — 열어야 하는 전이인가", () => {
  it("초기 마운트(prev=next=null)에는 열지 않는다", () => {
    expect(shouldAutoOpenDetail(null, null, true)).toBe(false)
  })

  it("클릭으로 null → 새 선택(non-null)이면 연다", () => {
    expect(shouldAutoOpenDetail(null, "feat-1", true)).toBe(true)
  })

  it("클릭으로 더 깊은 새 선택으로 바뀌면 연다", () => {
    expect(shouldAutoOpenDetail("req-1", "feat-1", true)).toBe(true)
  })

  it("같은 id로 재렌더되면 열지 않는다(중복 오픈 방지)", () => {
    expect(shouldAutoOpenDetail("feat-1", "feat-1", true)).toBe(false)
  })

  it("선택 해제(non-null → null)에는 열지 않는다 — 기본 꺼짐", () => {
    expect(shouldAutoOpenDetail("feat-1", null, true)).toBe(false)
  })

  it("이미 선택이 있는 채로 마운트(prev 초기화=현재값)면 열지 않는다", () => {
    // effect가 ref를 현재값으로 초기화하므로 첫 실행은 prev===next → 안 열림
    expect(shouldAutoOpenDetail("req-1", "req-1", true)).toBe(false)
  })

  it("비클릭 자동 보정(inspected!=='spec')으로 새 값이 와도 열지 않는다 — 로드 시 기본 꺼짐 보장", () => {
    // SpecView.syncSpecSelection이 로드 때 requirements[0]을 넣지만 inspected를 건드리지 않는다.
    expect(shouldAutoOpenDetail(null, "req-1", false)).toBe(false)
  })
})
