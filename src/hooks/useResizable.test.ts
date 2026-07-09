import { describe, expect, it } from "vitest"
import { clampWidth, nextWidthFromDrag, PROMPT_DOCK_MAX, PROMPT_DOCK_MIN } from "./useResizable"

// useResizable 순수 로직(clamp 경계·델타 누적) — DOM 없이 검증(핸들 props/포인터 배선은 e2e 몫).

describe("clampWidth — 폭 경계", () => {
  it("min 아래는 min으로 끌어올린다", () => {
    expect(clampWidth(200, 280, 400)).toBe(280)
  })
  it("max 위는 max로 눌러낮춘다", () => {
    expect(clampWidth(999, 280, 400)).toBe(400)
  })
  it("범위 안은 그대로 둔다", () => {
    expect(clampWidth(320, 280, 400)).toBe(320)
  })
  it("경계값(280·400)은 통과시킨다", () => {
    expect(clampWidth(280, 280, 400)).toBe(280)
    expect(clampWidth(400, 280, 400)).toBe(400)
  })
})

describe("nextWidthFromDrag — 델타 누적", () => {
  it("시작폭에 양수 델타를 더해 넓어진다", () => {
    expect(nextWidthFromDrag(300, 50, 280, 400)).toBe(350)
  })
  it("시작폭에 음수 델타를 더하되 min 밑으로는 안 내려간다", () => {
    // 300 - 50 = 250 → min 280으로 clamp
    expect(nextWidthFromDrag(300, -50, 280, 400)).toBe(280)
  })
  it("누적이 max를 넘으면 max로 clamp한다", () => {
    // 380 + 100 = 480 → max 400
    expect(nextWidthFromDrag(380, 100, 280, 400)).toBe(400)
  })
  it("델타 0이면 시작폭을 유지한다", () => {
    expect(nextWidthFromDrag(333, 0, 280, 400)).toBe(333)
  })
})

describe("PROMPT_DOCK 상수", () => {
  it("min 280 · max 400 (프롬프트 좌측 도킹 폭 범위)", () => {
    expect(PROMPT_DOCK_MIN).toBe(280)
    expect(PROMPT_DOCK_MAX).toBe(400)
  })
})
