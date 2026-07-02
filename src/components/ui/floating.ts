// 플로팅 서피스(Tooltip·Popover) 위치 계산 — 앵커 아래 배치, 뷰포트 클램프, 아래 공간 부족 시 위로 플립.
const VIEWPORT_MARGIN = 8

export function computeFloatingPosition(
  anchor: DOMRect,
  panel: { width: number; height: number },
  gap = 8,
): { left: number; top: number } {
  let left = Math.min(anchor.left, window.innerWidth - panel.width - VIEWPORT_MARGIN)
  left = Math.max(VIEWPORT_MARGIN, left)

  let top = anchor.bottom + gap
  if (top + panel.height > window.innerHeight - VIEWPORT_MARGIN) {
    top = Math.max(VIEWPORT_MARGIN, anchor.top - gap - panel.height)
  }
  return { left, top }
}
