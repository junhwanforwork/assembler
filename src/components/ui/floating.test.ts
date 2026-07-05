import { afterEach, describe, expect, it, vi } from "vitest"
import { computeFloatingPosition } from "./floating"

// 플로팅 위치 계산 — 앵커 아래 배치·뷰포트 클램프·위 플립 계약을 고정한다(ASM-035 ④ ER 툴팁 흡수 회귀 가드).

const VIEWPORT = { innerWidth: 1280, innerHeight: 720 }

function anchorAt(left: number, top: number, w = 100, h = 40): DOMRect {
  return {
    left,
    top,
    right: left + w,
    bottom: top + h,
    width: w,
    height: h,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect
}

describe("computeFloatingPosition", () => {
  vi.stubGlobal("window", VIEWPORT)

  afterEach(() => {
    vi.stubGlobal("window", VIEWPORT)
  })

  it("기본: 앵커 아래 gap 만큼, 좌측 정렬", () => {
    const pos = computeFloatingPosition(anchorAt(200, 100), { width: 264, height: 80 })
    expect(pos).toEqual({ left: 200, top: 140 + 8 })
  })

  it("우측 넘침: 뷰포트 우측 마진 안으로 클램프", () => {
    const pos = computeFloatingPosition(anchorAt(1200, 100), { width: 264, height: 80 })
    expect(pos.left).toBe(1280 - 264 - 8)
  })

  it("좌측 음수 앵커: 최소 마진으로 클램프", () => {
    const pos = computeFloatingPosition(anchorAt(-50, 100), { width: 264, height: 80 })
    expect(pos.left).toBe(8)
  })

  it("하단 공간 부족: 앵커 위로 플립", () => {
    const anchor = anchorAt(200, 650)
    const pos = computeFloatingPosition(anchor, { width: 264, height: 80 })
    expect(pos.top).toBe(650 - 8 - 80)
  })

  it("위 플립조차 넘칠 때: 상단 마진으로 클램프", () => {
    vi.stubGlobal("window", { innerWidth: 1280, innerHeight: 100 })
    const pos = computeFloatingPosition(anchorAt(200, 40, 100, 40), { width: 264, height: 300 })
    expect(pos.top).toBe(8)
  })
})
