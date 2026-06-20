// 무한 캔버스 좌표·줌 순수 헬퍼 (React 무관, 테스트 가능). flow-layout.ts 좌표 규약(top-left, world px) 차용.
import type { Page } from "@/lib/types/assembler"
import { DEVICE_WIDTH } from "@/lib/types/assembler"

export type Vec = { x: number; y: number }
export type Bounds = { x: number; y: number; width: number; height: number }
export type Viewport = { pan: Vec; zoom: number }

export const ZOOM_MIN = 0.25
export const ZOOM_MAX = 2
export const clampZoom = (z: number): number => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

// 프레임 높이는 콘텐츠 의존(auto) — fit/bounds 계산용 추정치.
const FRAME_EST_HEIGHT = 520

export function frameWidth(page: Page): number {
  return DEVICE_WIDTH[page.device]
}

// 선택 Page 오른쪽 Description 보드(CanvasDescription)의 캔버스 폭 — fit bounds 확장용.
const DESCRIPTION_BOARD_SPAN = 400

// 전 프레임을 감싸는 world bounds (fit·미니맵용).
// selectedPageId가 있으면 그 화면 오른쪽 Description 보드 폭까지 포함해 fit에 보드가 들어오게 한다.
export function framesBounds(pages: Page[], selectedPageId?: string | null): Bounds {
  if (pages.length === 0) return { x: 0, y: 0, width: 640, height: 480 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of pages) {
    const span = p.id === selectedPageId ? frameWidth(p) + DESCRIPTION_BOARD_SPAN : frameWidth(p)
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x + span)
    maxY = Math.max(maxY, p.y + FRAME_EST_HEIGHT)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

// 화면 좌표(캔버스 컨테이너 rect 기준) → world 좌표. 드롭·히트 계산에 사용.
export function clientToWorld(clientX: number, clientY: number, rect: DOMRect, vp: Viewport): Vec {
  return {
    x: (clientX - rect.left - vp.pan.x) / vp.zoom,
    y: (clientY - rect.top - vp.pan.y) / vp.zoom,
  }
}

// 화면 앵커(컨테이너 원점 기준 px)를 고정한 채 줌 — 커서 중심 확대/축소.
export function zoomAtPoint(vp: Viewport, factor: number, anchorX: number, anchorY: number): Viewport {
  const zoom = clampZoom(vp.zoom * factor)
  const k = zoom / vp.zoom
  return {
    zoom,
    pan: { x: anchorX - (anchorX - vp.pan.x) * k, y: anchorY - (anchorY - vp.pan.y) * k },
  }
}

// 콘텐츠 bounds를 뷰포트 중앙에 맞춰 배치 (전체 핏).
export function fitViewport(bounds: Bounds, vw: number, vh: number, padding = 80): Viewport {
  if (bounds.width <= 0 || bounds.height <= 0 || vw <= 0 || vh <= 0) {
    return { pan: { x: 0, y: 0 }, zoom: 1 }
  }
  const zoom = clampZoom(
    Math.min((vw - padding * 2) / bounds.width, (vh - padding * 2) / bounds.height, ZOOM_MAX)
  )
  return {
    zoom,
    pan: {
      x: (vw - bounds.width * zoom) / 2 - bounds.x * zoom,
      y: (vh - bounds.height * zoom) / 2 - bounds.y * zoom,
    },
  }
}
