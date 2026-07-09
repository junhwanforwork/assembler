import { describe, it, expect } from "vitest"
import { deepestSelectedId, shouldAutoOpenDetail } from "./specAutoOpen"

// ASM-077 / Wave A — 선택 시 상세 플로팅 자동 오픈의 순수 로직. effect(DetailOverlay)는 이 둘을 ref로 배선만 한다.
// "클릭 카운터(specSelectClickSeq)가 증가한 전이에서만 연다 / 초기·비클릭 보정·닫은 뒤 필터 보정은 안 연다"를 고정.

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

describe("shouldAutoOpenDetail — 열어야 하는 전이인가 (클릭 카운터 기반)", () => {
  it("초기 마운트(prev=next=0)에는 열지 않는다", () => {
    expect(shouldAutoOpenDetail(0, 0)).toBe(false)
  })

  it("클릭으로 카운터가 오르면(0 → 1) 연다", () => {
    expect(shouldAutoOpenDetail(0, 1)).toBe(true)
  })

  it("연속 클릭으로 또 오르면(1 → 2) 연다 — 같은 항목 재클릭 포함", () => {
    expect(shouldAutoOpenDetail(1, 2)).toBe(true)
  })

  it("카운터가 그대로면(prev===next) 열지 않는다 — 재렌더·비클릭 보정·선택 해제", () => {
    expect(shouldAutoOpenDetail(3, 3)).toBe(false)
  })

  it("이미 선택이 있는 채로 마운트(prev 초기화=현재값)면 열지 않는다", () => {
    // effect가 ref를 현재 카운터로 초기화하므로 첫 실행은 prev===next → 안 열림
    expect(shouldAutoOpenDetail(5, 5)).toBe(false)
  })

  it("닫은 뒤 필터 보정으로 선택 id만 바뀌고 카운터는 그대로면 열지 않는다 — 오재오픈 방지", () => {
    // syncSpecSelection은 카운터를 안 올리므로 닫은 창이 필터 조작만으로 되살아나지 않는다.
    expect(shouldAutoOpenDetail(7, 7)).toBe(false)
  })
})
