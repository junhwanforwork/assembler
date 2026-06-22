import type { Page } from "@/lib/types/assembler"
import type { Bounds } from "../../wireframe/canvas-geometry"

// 페이지맵(Structure) 순수 좌표 헬퍼. React 의존 없음.
// 노드는 page.x/page.y(픽셀, top-left)에 절대 배치, 엣지는 출발 오른쪽 중앙 → 도착 왼쪽 중앙.
// flow-layout.ts와 같은 베지어 패턴이지만 Page 타입·노드 크기에 맞춰 별도로 둔다(Screen 결합 회피).

export const SNODE_W = 184
export const SNODE_H = 60

const ARROW_LEN = 9
const ARROW_HALF = 5
const MARGIN = 160

interface Point {
  x: number
  y: number
}

function rightCenter(p: Page): Point {
  return { x: p.x + SNODE_W, y: p.y + SNODE_H / 2 }
}

function leftCenter(p: Page): Point {
  return { x: p.x, y: p.y + SNODE_H / 2 }
}

/** 출발 노드 오른쪽 중앙 → 도착 노드 왼쪽 중앙 cubic-bezier. 역방향·근접도 곡선이 무너지지 않게 최소 48px 보장. */
export function pageEdgePath(from: Page, to: Page): string {
  const a = rightCenter(from)
  const b = leftCenter(to)
  const dx = Math.max(Math.abs(b.x - a.x) * 0.45, 48)
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y} ${b.x - dx} ${b.y} ${b.x} ${b.y}`
}

/** 도착 노드 왼쪽 중앙에 붙는 화살표 삼각형(tip, 위-왼, 아래-왼). */
export function pageArrow(to: Page): string {
  const b = leftCenter(to)
  return `${b.x},${b.y} ${b.x - ARROW_LEN},${b.y - ARROW_HALF} ${b.x - ARROW_LEN},${b.y + ARROW_HALF}`
}

/** 엣지 중간점(조건 라벨 위치). */
export function pageEdgeMid(from: Page, to: Page): Point {
  const a = rightCenter(from)
  const b = leftCenter(to)
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** 전체 보기(fit) 대상 bounds — 노드 전체 + 여백. */
export function pagesBounds(pages: Page[]): Bounds {
  if (pages.length === 0) return { x: 0, y: 0, width: 640, height: 480 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of pages) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x + SNODE_W)
    maxY = Math.max(maxY, p.y + SNODE_H)
  }
  return { x: minX - MARGIN, y: minY - MARGIN, width: maxX - minX + MARGIN * 2, height: maxY - minY + MARGIN * 2 }
}

/** 엣지 SVG 레이어 크기 — 0,0 기준 콘텐츠를 덮는다(노드는 음수 좌표 안 씀). */
export function pageCanvasSize(pages: Page[]): { width: number; height: number } {
  const MIN = 640
  if (pages.length === 0) return { width: MIN, height: MIN }
  let maxX = 0
  let maxY = 0
  for (const p of pages) {
    maxX = Math.max(maxX, p.x + SNODE_W)
    maxY = Math.max(maxY, p.y + SNODE_H)
  }
  return { width: maxX + MARGIN, height: maxY + MARGIN }
}
