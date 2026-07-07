// OverlayPanel 규칙 로직(ASM-055) — 포커스 트랩·Esc·백드롭·퇴장 위상을 컴포넌트에서 분리.
// 분리 이유: 테스트 환경이 node(vitest)라 DOM 렌더 없이 규칙 자체를 검증한다(레포 관례).
// Modal·옛 ActivitySlideover와 같은 규칙 집합 — 형태만 다르고 규칙은 같다.
// 파일명 Rules 접미 이유: OverlayPanel.tsx와 대소문자만 다르면 대소문자 무시 FS에서 모듈 해석이 충돌한다.

export const OVERLAY_FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// --duration-base(200ms) JS 미러 — CSS 퇴장 keyframe과 어긋나면 퇴장이 잘리거나 빈 프레임이 남는다.
export const OVERLAY_EXIT_MS = 200

// 한글 조합 취소 Esc(isComposing)가 창까지 닫지 않게.
export function shouldCloseOnEscape(key: string, isComposing: boolean): boolean {
  return key === "Escape" && !isComposing
}

// mousedown과 click이 모두 백드롭이어야 닫는다 — 패널 안 드래그가 백드롭에서 끝나는 오발 방지.
export function isBackdropDismiss(clickOnBackdrop: boolean, mouseDownOnBackdrop: boolean): boolean {
  return clickOnBackdrop && mouseDownOnBackdrop
}

// Tab 순환 판정. activeIndex=null은 포커스가 패널 밖(또는 트랩 대상 아님)이라는 뜻.
export type FocusTrapResolution = { kind: "none" } | { kind: "panel" } | { kind: "index"; index: number }

export function resolveFocusTrap(input: {
  shiftKey: boolean
  focusableCount: number
  activeIndex: number | null
}): FocusTrapResolution {
  const { shiftKey, focusableCount, activeIndex } = input
  if (focusableCount === 0) return { kind: "panel" }
  const atEdge = shiftKey ? activeIndex === 0 : activeIndex === focusableCount - 1
  if (activeIndex === null || atEdge) return { kind: "index", index: shiftKey ? focusableCount - 1 : 0 }
  return { kind: "none" }
}

// 퇴장 위상 — closing 동안 마운트를 유지해 퇴장 애니메이션을 재생한다. 재요청은 무시(중복 타이머 방지).
export type OverlayPhase = "open" | "closing"

export function requestClose(phase: OverlayPhase): OverlayPhase {
  return phase === "open" ? "closing" : phase
}

// prefers-reduced-motion이면 0 — 즉시 언마운트(globals의 애니메이션 오버라이드와 짝).
export function exitDurationMs(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : OVERLAY_EXIT_MS
}
