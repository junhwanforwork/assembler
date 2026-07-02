import type { Flow, Page } from "@/lib/types/assembler"

// ── 유저플로우 레이아웃(flow-view-pattern) — 노드=Page, 엣지=FlowEdge. 라이브러리 없음. ──

export const FLOW_CARD_W = 160
export const FLOW_CARD_H = 44
const FLOW_H_GAP = 120
const FLOW_V_GAP = 20
const FLOW_X0 = 40
const FLOW_Y0 = 28

export type FlowNode = { page: Page; x: number; y: number }
export type FlowEdgeLayout = {
  id: string
  fromPageId: string
  toPageId: string
  trigger: string
  x1: number
  y1: number
  x2: number
  y2: number
  // 도착 컬럼이 출발보다 왼쪽(사이클 등) — 앵커·화살표를 반전한다(flow-view-pattern "방향이 바뀌는 경우").
  reverse: boolean
}

// 레이어 = 진입 깊이(들어오는 엣지가 없으면 0). 사이클 방어 — 재방문 시 그 지점 깊이로 자른다.
function computeLayers(pages: Page[], edges: { fromPageId: string; toPageId: string }[]): Map<string, number> {
  const pageIds = new Set(pages.map((p) => p.id))
  const incoming = new Map<string, string[]>()
  for (const e of edges) {
    if (!pageIds.has(e.fromPageId) || !pageIds.has(e.toPageId)) continue
    const list = incoming.get(e.toPageId) ?? []
    list.push(e.fromPageId)
    incoming.set(e.toPageId, list)
  }

  const layer = new Map<string, number>()
  function depth(id: string, stack: Set<string>): number {
    const known = layer.get(id)
    if (known !== undefined) return known
    if (stack.has(id)) return 0
    stack.add(id)
    const sources = incoming.get(id) ?? []
    const d = sources.length === 0 ? 0 : 1 + Math.max(...sources.map((s) => depth(s, stack)))
    stack.delete(id)
    layer.set(id, d)
    return d
  }

  for (const p of pages) depth(p.id, new Set())
  return layer
}

export function layoutFlow(
  pages: Page[],
  flows: Flow[],
): { nodes: FlowNode[]; edges: FlowEdgeLayout[]; width: number; height: number } {
  const allEdges = flows.flatMap((f) => f.edges)
  const layer = computeLayers(pages, allEdges)

  // 컬럼별로 세로 스택 → 가장 높은 컬럼 기준으로 나머지를 세로 중앙 정렬.
  const columns = new Map<number, Page[]>()
  for (const p of pages) {
    const l = layer.get(p.id) ?? 0
    const col = columns.get(l) ?? []
    col.push(p)
    columns.set(l, col)
  }
  const maxRows = Math.max(0, ...Array.from(columns.values(), (c) => c.length))
  const maxColH = maxRows * FLOW_CARD_H + Math.max(0, maxRows - 1) * FLOW_V_GAP

  const nodes: FlowNode[] = []
  const byId = new Map<string, FlowNode>()
  for (const [l, col] of columns) {
    const colH = col.length * FLOW_CARD_H + (col.length - 1) * FLOW_V_GAP
    const yStart = FLOW_Y0 + (maxColH - colH) / 2
    col.forEach((p, i) => {
      const node: FlowNode = {
        page: p,
        x: FLOW_X0 + l * (FLOW_CARD_W + FLOW_H_GAP),
        y: yStart + i * (FLOW_CARD_H + FLOW_V_GAP),
      }
      nodes.push(node)
      byId.set(p.id, node)
    })
  }

  const edges: FlowEdgeLayout[] = []
  for (const e of allEdges) {
    const from = byId.get(e.fromPageId)
    const to = byId.get(e.toPageId)
    if (!from || !to) continue
    // 기본: 출발 오른쪽 중앙 → 도착 왼쪽 중앙. 역방향이면 좌우 앵커를 뒤집어 노드 관통을 막는다.
    const reverse = to.x <= from.x
    edges.push({
      id: e.id,
      fromPageId: e.fromPageId,
      toPageId: e.toPageId,
      trigger: e.trigger,
      x1: reverse ? from.x : from.x + FLOW_CARD_W,
      y1: from.y + FLOW_CARD_H / 2,
      x2: reverse ? to.x + FLOW_CARD_W : to.x,
      y2: to.y + FLOW_CARD_H / 2,
      reverse,
    })
  }

  const maxRight = nodes.reduce((m, n) => Math.max(m, n.x + FLOW_CARD_W), 0)
  const maxBottom = nodes.reduce((m, n) => Math.max(m, n.y + FLOW_CARD_H), 0)
  return {
    nodes,
    edges,
    width: nodes.length === 0 ? 0 : maxRight + FLOW_X0,
    height: nodes.length === 0 ? 0 : maxBottom + FLOW_Y0,
  }
}

// cubic bezier — control point는 수평 거리의 45%(자연스러운 S자).
export function flowEdgePath(e: Pick<FlowEdgeLayout, "x1" | "y1" | "x2" | "y2" | "id">): string {
  const dx = (e.x2 - e.x1) * 0.45
  return `M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1} ${e.x2 - dx} ${e.y2} ${e.x2} ${e.y2}`
}

// 도착 노드에 붙는 삼각형 — 기본은 왼쪽 중앙, 역방향이면 오른쪽 중앙에서 반대로.
export function flowArrowPoints(x2: number, y2: number, reverse = false): string {
  const base = reverse ? x2 + 8 : x2 - 8
  return `${x2},${y2} ${base},${y2 - 4} ${base},${y2 + 4}`
}
