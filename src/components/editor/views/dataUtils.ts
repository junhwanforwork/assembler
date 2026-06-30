import type { Api, ApiStatus, DbTable, WorkspaceDesign } from "@/lib/types/assembler"

// references "table.column" 또는 "table" → 대상 테이블명.
export function refTableName(references: string): string {
  return references.split(".")[0]
}

// API status → 상태 pill 스펙(클래스 키 + 라벨). 클래스 매핑은 컴포넌트가 모듈에서 해석.
export function apiStatusLabel(status: ApiStatus): { tone: "active" | "draft" | "dep"; label: string } {
  if (status === "active") return { tone: "active", label: "active" }
  if (status === "planned") return { tone: "draft", label: "준비 중" }
  return { tone: "dep", label: "중단됨" }
}

export function sourceLabel(source: "code" | "mcp"): string {
  return source === "code" ? "⎇ code" : "✶ mcp"
}

// 이 API를 쓰는 곳 — feature 이름 + element label(역참조 계산).
export function apiUsage(apiId: string, design: WorkspaceDesign): string[] {
  const fromFeatures = design.features.filter((f) => f.apiIds.includes(apiId)).map((f) => f.name)
  const fromElements = design.elements.filter((e) => e.apiIds.includes(apiId)).map((e) => e.label)
  return Array.from(new Set([...fromFeatures, ...fromElements]))
}

export type TableDetail = {
  name: string
  role: string
  cols: string[]
  usedBy: string[]
  apis: string[]
}

// DB 테이블 상세 — 인스펙터/팝오버 공용. usedBy/apis는 element 매핑에서 역참조 계산.
export function buildTableDetail(table: DbTable, apis: Api[], design: WorkspaceDesign): TableDetail {
  const elements = design.elements.filter((e) => e.dbTableIds.includes(table.id))
  const usedBy = Array.from(new Set(elements.map((e) => e.label)))
  const apiIds = new Set(elements.flatMap((e) => e.apiIds))
  const relatedApis = apis.filter((a) => apiIds.has(a.id)).map((a) => `${a.method} ${a.endpoint}`)
  return {
    name: table.name,
    role: table.description,
    cols: table.columns.map((c) => c.name),
    usedBy,
    apis: relatedApis,
  }
}

// ── ER 레이아웃(flow-view-pattern) — 테이블=노드, FK=엣지 ──
export const ER_NODE_W = 196
const ER_HEADER_H = 34
const ER_ROW_H = 23
const ER_V_GAP = 36
const ER_H_GAP = 124
const ER_X0 = 32
const ER_Y0 = 28

export function erNodeHeight(table: DbTable): number {
  return ER_HEADER_H + table.columns.length * ER_ROW_H
}

export type ErNode = { table: DbTable; x: number; y: number; h: number }
export type ErEdge = { id: string; x1: number; y1: number; x2: number; y2: number }

// 레이어 = FK 참조 깊이(참조 안 하면 0). 사이클 방어. 좌→우 배치.
function computeLayers(tables: DbTable[]): Map<string, number> {
  const byName = new Map(tables.map((t) => [t.name, t]))
  const layer = new Map<string, number>()

  function depth(table: DbTable, stack: Set<string>): number {
    if (layer.has(table.id)) return layer.get(table.id) as number
    if (stack.has(table.id)) return 0
    stack.add(table.id)
    const targets = table.columns
      .filter((c) => c.references)
      .map((c) => byName.get(refTableName(c.references as string)))
      .filter((t): t is DbTable => !!t && t.id !== table.id)
    const d = targets.length === 0 ? 0 : 1 + Math.max(...targets.map((t) => depth(t, stack)))
    stack.delete(table.id)
    const capped = Math.min(d, 3)
    layer.set(table.id, capped)
    return capped
  }

  for (const t of tables) depth(t, new Set())
  return layer
}

export function layoutEr(tables: DbTable[]): { nodes: ErNode[]; edges: ErEdge[]; width: number; height: number } {
  const layer = computeLayers(tables)
  const cursorY = new Map<number, number>()
  const nodes: ErNode[] = []
  const byId = new Map<string, ErNode>()

  for (const table of tables) {
    const l = layer.get(table.id) ?? 0
    const y = cursorY.get(l) ?? ER_Y0
    const h = erNodeHeight(table)
    const node: ErNode = { table, x: ER_X0 + l * (ER_NODE_W + ER_H_GAP), y, h }
    nodes.push(node)
    byId.set(table.id, node)
    cursorY.set(l, y + h + ER_V_GAP)
  }

  const byName = new Map(nodes.map((n) => [n.table.name, n]))
  const edges: ErEdge[] = []
  for (const node of nodes) {
    node.table.columns.forEach((col, ci) => {
      if (!col.references) return
      const target = byName.get(refTableName(col.references))
      if (!target || target.table.id === node.table.id) return
      // 참조하는 쪽(node) 왼쪽 → 참조되는 쪽(target) 오른쪽.
      const x1 = node.x
      const y1 = node.y + ER_HEADER_H + ci * ER_ROW_H + ER_ROW_H / 2
      const x2 = target.x + ER_NODE_W
      const y2 = target.y + target.h / 2
      edges.push({ id: `${node.table.id}-${ci}-${target.table.id}`, x1, y1, x2, y2 })
    })
  }

  const maxRight = nodes.reduce((m, n) => Math.max(m, n.x + ER_NODE_W), 0)
  const maxBottom = nodes.reduce((m, n) => Math.max(m, n.y + n.h), 0)
  return { nodes, edges, width: maxRight + ER_X0, height: Math.max(maxBottom + 56, 360) }
}

export function erEdgePath(e: ErEdge): string {
  return `M ${e.x1} ${e.y1} C ${e.x1 - 44} ${e.y1}, ${e.x2 + 44} ${e.y2}, ${e.x2} ${e.y2}`
}
