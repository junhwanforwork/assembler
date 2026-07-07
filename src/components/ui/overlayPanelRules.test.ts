import { describe, it, expect } from "vitest"
import {
  shouldCloseOnEscape,
  isBackdropDismiss,
  resolveFocusTrap,
  nextPhase,
  exitDurationMs,
  OVERLAY_EXIT_MS,
} from "./overlayPanelRules"

// OverlayPanel 규칙(ASM-055) — 테스트 환경이 node라 DOM 렌더 없이 규칙 로직을 검증한다
// (레포 관례: floating.test.ts). 통합 동작(포털·실포커스)은 관련 e2e가 커버.

describe("shouldCloseOnEscape — Esc 닫기", () => {
  it("Escape면 닫는다", () => {
    expect(shouldCloseOnEscape("Escape", false)).toBe(true)
  })
  it("한글 조합 취소 Esc(isComposing)는 창을 닫지 않는다", () => {
    expect(shouldCloseOnEscape("Escape", true)).toBe(false)
  })
  it("다른 키는 닫지 않는다", () => {
    expect(shouldCloseOnEscape("Enter", false)).toBe(false)
    expect(shouldCloseOnEscape("Tab", false)).toBe(false)
  })
})

describe("isBackdropDismiss — 백드롭 클릭 닫기", () => {
  it("mousedown과 click이 모두 백드롭이면 닫는다", () => {
    expect(isBackdropDismiss(true, true)).toBe(true)
  })
  it("패널 안에서 드래그해 백드롭에서 뗀 클릭(mousedown이 안쪽)은 닫지 않는다", () => {
    expect(isBackdropDismiss(true, false)).toBe(false)
  })
  it("click이 백드롭이 아니면 닫지 않는다", () => {
    expect(isBackdropDismiss(false, true)).toBe(false)
    expect(isBackdropDismiss(false, false)).toBe(false)
  })
})

describe("resolveFocusTrap — Tab 순환", () => {
  it("포커스 가능한 요소가 없으면 패널 자신으로", () => {
    expect(resolveFocusTrap({ shiftKey: false, focusableCount: 0, activeIndex: null })).toEqual({ kind: "panel" })
  })
  it("마지막 요소에서 Tab이면 첫 요소로 감는다", () => {
    expect(resolveFocusTrap({ shiftKey: false, focusableCount: 3, activeIndex: 2 })).toEqual({ kind: "index", index: 0 })
  })
  it("첫 요소에서 Shift+Tab이면 마지막 요소로 감는다", () => {
    expect(resolveFocusTrap({ shiftKey: true, focusableCount: 3, activeIndex: 0 })).toEqual({ kind: "index", index: 2 })
  })
  it("포커스가 패널 밖이면(방향 무관) 안으로 끌어온다", () => {
    expect(resolveFocusTrap({ shiftKey: false, focusableCount: 3, activeIndex: null })).toEqual({ kind: "index", index: 0 })
    expect(resolveFocusTrap({ shiftKey: true, focusableCount: 3, activeIndex: null })).toEqual({ kind: "index", index: 2 })
  })
  it("중간 요소에서는 개입하지 않는다(브라우저 기본 이동)", () => {
    expect(resolveFocusTrap({ shiftKey: false, focusableCount: 3, activeIndex: 1 })).toEqual({ kind: "none" })
    expect(resolveFocusTrap({ shiftKey: true, focusableCount: 3, activeIndex: 1 })).toEqual({ kind: "none" })
  })
})

// requestClose를 nextPhase로 통합(QA 정정 — 갱신 사유: 배선 전이 open·close·exit-timer를 한 함수로).
describe("nextPhase — 퇴장 위상 전이", () => {
  it("closed에서 열면 open", () => {
    expect(nextPhase("closed", "open")).toBe("open")
  })
  it("open에서 닫기 요청이면 closing으로 전이한다", () => {
    expect(nextPhase("open", "close")).toBe("closing")
  })
  it("closing 중 닫기 재요청은 무시된다(중복 타이머 방지)", () => {
    expect(nextPhase("closing", "close")).toBe("closing")
  })
  it("closing 중 다시 열면 open(재열림 — 퇴장 취소)", () => {
    expect(nextPhase("closing", "open")).toBe("open")
  })
  it("exit-timer는 closing에서만 closed로 — 재열린 뒤 늦은 타이머는 무시", () => {
    expect(nextPhase("closing", "exit-timer")).toBe("closed")
    expect(nextPhase("open", "exit-timer")).toBe("open")
    expect(nextPhase("closed", "exit-timer")).toBe("closed")
  })

  it("배선 케이스(QA 정정) — 닫기 요청 → closing 경유 → 퇴장 시간 뒤 언마운트", () => {
    // TopBar 상시 마운트 + open prop 구동에서 실제로 밟는 경로.
    let phase = nextPhase("closed", "open") // 기록 버튼 → 열림
    expect(phase).toBe("open")
    phase = nextPhase(phase, "close") // 닫기 요청 — 즉시 언마운트가 아니라 closing 경유(slide-out 재생)
    expect(phase).toBe("closing")
    phase = nextPhase(phase, "exit-timer") // exitDurationMs 뒤 타이머 → 언마운트
    expect(phase).toBe("closed")
    // 모션 감소 선호면 타이머 0ms — 경로는 동일하고 시간만 0(즉시 경로 유지).
    expect(exitDurationMs(true)).toBe(0)
  })
})

describe("exitDurationMs — 퇴장 시간(reduced-motion 분기)", () => {
  it("모션 감소 선호면 0 — 즉시 언마운트", () => {
    expect(exitDurationMs(true)).toBe(0)
  })
  it("기본은 등장과 대칭인 OVERLAY_EXIT_MS", () => {
    expect(exitDurationMs(false)).toBe(OVERLAY_EXIT_MS)
    expect(OVERLAY_EXIT_MS).toBeGreaterThan(0)
  })
})
