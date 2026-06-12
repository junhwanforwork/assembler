import type { Screen } from "@/lib/types/builder"

// 플로우 캔버스 순수 헬퍼. React 의존 없음 — 좌표·경로 계산만 담당한다.
// 노드는 screen.x/screen.y(픽셀, top-left 기준)에 절대 배치되고,
// 엣지는 출발 노드 오른쪽 중앙 → 도착 노드 왼쪽 중앙으로 흐른다.

export const NODE_W = 200
export const NODE_H = 120

// 화살표 삼각형 크기(px). 도착 노드 왼쪽 중앙에 붙는다.
const ARROW_LEN = 9
const ARROW_HALF = 5

interface Point {
  x: number
  y: number
}

// 출발 노드의 오른쪽 중앙 좌표.
function sourceAnchor(source: Screen): Point {
  return { x: source.x + NODE_W, y: source.y + NODE_H / 2 }
}

// 도착 노드의 왼쪽 중앙 좌표.
function targetAnchor(target: Screen): Point {
  return { x: target.x, y: target.y + NODE_H / 2 }
}

/**
 * 출발 노드 오른쪽 중앙 → 도착 노드 왼쪽 중앙을 잇는 cubic-bezier path.
 * control point를 수평 방향으로 밀어 자연스러운 S자 곡선을 만든다.
 * 도착 노드가 왼쪽에 있어도(역방향) control 거리를 최소 보장해 곡선이 무너지지 않게 한다.
 */
export function edgePath(source: Screen, target: Screen): string {
  const a = sourceAnchor(source)
  const b = targetAnchor(target)
  // 수평 거리의 45%를 control 거리로. 단, 최소 48px 보장(역방향·근접 노드 대응).
  const dx = Math.max(Math.abs(b.x - a.x) * 0.45, 48)
  const c1x = a.x + dx
  const c2x = b.x - dx
  return `M ${a.x} ${a.y} C ${c1x} ${a.y} ${c2x} ${b.y} ${b.x} ${b.y}`
}

/**
 * 도착 노드 왼쪽 중앙에 붙는 화살표 삼각형 polygon points.
 * "tip(도착점), 위-왼쪽, 아래-왼쪽" 순서.
 */
export function arrowPoints(_source: Screen, target: Screen): string {
  const b = targetAnchor(target)
  return `${b.x},${b.y} ${b.x - ARROW_LEN},${b.y - ARROW_HALF} ${b.x - ARROW_LEN},${b.y + ARROW_HALF}`
}

/**
 * 모든 노드 + 여백을 담을 캔버스 크기.
 * 빈 화면이어도 최소 크기를 보장해 빈 상태 안내를 띄울 공간을 확보한다.
 */
export function canvasBounds(screens: Screen[]): { width: number; height: number } {
  const MARGIN = 120
  const MIN_W = 640
  const MIN_H = 480
  if (screens.length === 0) return { width: MIN_W, height: MIN_H }
  let maxX = 0
  let maxY = 0
  for (const s of screens) {
    maxX = Math.max(maxX, s.x + NODE_W)
    maxY = Math.max(maxY, s.y + NODE_H)
  }
  return {
    width: Math.max(maxX + MARGIN, MIN_W),
    height: Math.max(maxY + MARGIN, MIN_H),
  }
}

/** 엣지·연결선 중간점(badge 위치 계산용). */
export function edgeMidpoint(source: Screen, target: Screen): Point {
  const a = sourceAnchor(source)
  const b = targetAnchor(target)
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export { sourceAnchor, targetAnchor }
export type { Point }
