// 무한 캔버스 좌표·줌 순수 헬퍼 (React 무관, 테스트 가능). flow-layout.ts 좌표 규약(top-left, world px) 차용.
import type { Page, PageDevice } from "@/lib/types/assembler"
import { DEVICE_WIDTH } from "@/lib/types/assembler"

export type Vec = { x: number; y: number }
export type Bounds = { x: number; y: number; width: number; height: number }
export type Viewport = { pan: Vec; zoom: number }

export const ZOOM_MIN = 0.25
export const ZOOM_MAX = 2
export const clampZoom = (z: number): number => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

// 데스크탑 화면 높이 — 16:9 고정(1920×1080). mobile/tablet은 콘텐츠 의존(auto)이라 추정치로 fit/bounds 계산.
const DESKTOP_FRAME_HEIGHT = 1080
const FRAME_EST_HEIGHT = 520

export function frameWidth(page: Page): number {
  return DEVICE_WIDTH[page.device]
}

// 화면(스크린) 높이 — desktop은 16:9 고정(1080), 그 외는 세로 스택 콘텐츠 auto라 추정치를 돌려준다(bounds·fit 전용).
export function frameHeight(page: Page): number {
  return page.device === "desktop" ? DESKTOP_FRAME_HEIGHT : FRAME_EST_HEIGHT
}

// device → 디바이스 프레임 가로세로비(width/height). 포커스 뷰어가 가용 영역에 aspect 유지 fit(ASS-081).
// desktop 16:9(가로), tablet 3:4(세로), mobile 폰(9:19.5 ≈ iPhone). literal px 대신 비율만 — 콘텐츠는 1x 렌더.
const DEVICE_ASPECT: Record<PageDevice, number> = {
  desktop: 16 / 9,
  tablet: 3 / 4,
  mobile: 9 / 19.5,
}

export function deviceAspect(device: PageDevice): number {
  return DEVICE_ASPECT[device]
}

// 보드 제목 헤더가 화면 위로 차지하는 높이 — bounds가 제목+화면을 함께 감싸도록.
// (ASS-081에서 화면 탭은 포커스 뷰어로 전환 — 이 helper들은 InfiniteCanvas/흐름 캔버스 후속(ASS-032) 재사용 위해 보존.)
const BOARD_TITLE_HEIGHT = 44

// 선택 Page 오른쪽 Description 보드(CanvasDescription)의 캔버스 폭 — fit bounds 확장용.
const DESCRIPTION_BOARD_SPAN = 400

// 전 보드를 감싸는 world bounds (fit·미니맵용).
// 보드 = 제목 + [화면(frameWidth×frameHeight) | (선택 시) Description]. selectedPageId면 description 폭까지 포함.
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
    maxY = Math.max(maxY, p.y + BOARD_TITLE_HEIGHT + frameHeight(p))
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
