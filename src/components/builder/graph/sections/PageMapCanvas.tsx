"use client"

import { type CSSProperties, type FC } from "react"
import type { ProjectGraph } from "@/lib/types/assembler"
import { COLOR, RADIUS, TYPOGRAPHY } from "@/lib/design-tokens"

// 플로우 맵 (그림1) — 페이지=노드, UserFlow=연결선, 기능=스윔레인. 좌→우 자동 배치.
// 저장 x/y 무시, 엣지 위상정렬로 깊이(열) 계산. 제로의존 SVG(flow-view-pattern.md). 읽기 전용.

const NODE_W = 150
const NODE_H = 40
const GAP_X = 72
const GAP_Y = 16
const LANE_LABEL_W = 116
const LANE_PAD = 22
const PAD = 28

type Kind = "entry" | "core" | "leaf"
interface PlacedNode { id: string; name: string; x: number; y: number; kind: Kind }
interface Lane { label: string; y: number; height: number }
interface Layout { nodes: PlacedNode[]; lanes: Lane[]; width: number; height: number }

export const PageMapCanvas: FC<{ graph: ProjectGraph; onSelect: (pageId: string) => void; selectedId?: string }> = ({
  graph,
  onSelect,
  selectedId,
}) => {
  const layout = computeLayout(graph)
  const nodeById = new Map(layout.nodes.map((n) => [n.id, n]))

  if (layout.nodes.length === 0) {
    return <p style={EMPTY}>아직 화면이 없어요. 채팅으로 화면을 만들어 보세요.</p>
  }

  return (
    <div style={{ ...CANVAS, width: layout.width, height: layout.height }}>
      {layout.lanes.map((lane) => (
        <span key={lane.label} style={{ ...LANE_LABEL, top: lane.y + LANE_PAD }}>{lane.label}</span>
      ))}

      <svg width={layout.width} height={layout.height} style={EDGE_SVG}>
        {graph.userFlow.edges.map((e) => {
          const s = nodeById.get(e.fromPageId)
          const t = nodeById.get(e.toPageId)
          if (!s || !t) return null
          return (
            <g key={e.id}>
              <path d={edgePath(s, t)} fill="none" stroke={COLOR.BORDER_STRONG} strokeWidth={1.25} />
              <polygon points={arrow(t)} fill={COLOR.BORDER_STRONG} />
            </g>
          )
        })}
      </svg>

      {layout.nodes.map((n) => (
        <button key={n.id} type="button" onClick={() => onSelect(n.id)} title={n.name} style={nodeStyle(n, n.id === selectedId)}>
          {n.name}
        </button>
      ))}
    </div>
  )
}

function computeLayout(graph: ProjectGraph): Layout {
  const pages = graph.pages
  const edges = graph.userFlow.edges
  if (pages.length === 0) return { nodes: [], lanes: [], width: 640, height: 200 }

  const depth = new Map<string, number>(pages.map((p) => [p.id, 0]))
  const incoming = new Map<string, number>(pages.map((p) => [p.id, 0]))
  const outgoing = new Map<string, number>(pages.map((p) => [p.id, 0]))
  for (const e of edges) {
    if (depth.has(e.fromPageId) && depth.has(e.toPageId)) {
      incoming.set(e.toPageId, (incoming.get(e.toPageId) ?? 0) + 1)
      outgoing.set(e.fromPageId, (outgoing.get(e.fromPageId) ?? 0) + 1)
    }
  }
  for (let i = 0; i < pages.length; i++) {
    let changed = false
    for (const e of edges) {
      const df = depth.get(e.fromPageId)
      const dt = depth.get(e.toPageId)
      if (df === undefined || dt === undefined) continue
      if (dt < df + 1) { depth.set(e.toPageId, df + 1); changed = true }
    }
    if (!changed) break
  }

  const laneOf = (pageId: string): string => pages.find((pp) => pp.id === pageId)?.featureIds[0] ?? ""
  const featureName = (id: string) => (id === "" ? "미분류" : graph.features.find((f) => f.id === id)?.name ?? "기능")
  const laneKeys: string[] = []
  for (const p of pages) {
    const k = laneOf(p.id)
    if (!laneKeys.includes(k)) laneKeys.push(k)
  }

  const nodes: PlacedNode[] = []
  const lanes: Lane[] = []
  let laneTop = PAD
  for (const key of laneKeys) {
    const lanePages = pages
      .filter((p) => laneOf(p.id) === key)
      .sort((a, b) => (depth.get(a.id)! - depth.get(b.id)!) || a.name.localeCompare(b.name))
    const rowInCol = new Map<number, number>()
    let maxRows = 1
    for (const p of lanePages) {
      const col = depth.get(p.id) ?? 0
      const row = rowInCol.get(col) ?? 0
      rowInCol.set(col, row + 1)
      maxRows = Math.max(maxRows, row + 1)
      const kind: Kind = (incoming.get(p.id) ?? 0) === 0 ? "entry" : (outgoing.get(p.id) ?? 0) === 0 ? "leaf" : "core"
      nodes.push({
        id: p.id,
        name: p.name,
        x: LANE_LABEL_W + col * (NODE_W + GAP_X),
        y: laneTop + LANE_PAD + row * (NODE_H + GAP_Y),
        kind,
      })
    }
    const laneHeight = LANE_PAD * 2 + maxRows * NODE_H + (maxRows - 1) * GAP_Y
    lanes.push({ label: featureName(key), y: laneTop, height: laneHeight })
    laneTop += laneHeight
  }

  const maxX = nodes.reduce((m, n) => Math.max(m, n.x + NODE_W), 0)
  return { nodes, lanes, width: Math.max(maxX + PAD, 640), height: laneTop + PAD }
}

function edgePath(s: PlacedNode, t: PlacedNode): string {
  const ax = s.x + NODE_W
  const ay = s.y + NODE_H / 2
  const bx = t.x
  const by = t.y + NODE_H / 2
  const dx = Math.max(Math.abs(bx - ax) * 0.45, 40)
  return `M ${ax} ${ay} C ${ax + dx} ${ay} ${bx - dx} ${by} ${bx} ${by}`
}
function arrow(t: PlacedNode): string {
  const bx = t.x
  const by = t.y + NODE_H / 2
  return `${bx},${by} ${bx - 8},${by - 4} ${bx - 8},${by + 4}`
}

const CANVAS: CSSProperties = { position: "relative", minWidth: "100%" }
const EDGE_SVG: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }
const EMPTY: CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, padding: 24 }
const LANE_LABEL: CSSProperties = {
  position: "absolute", left: 8, width: LANE_LABEL_W - 16, ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED,
}

function nodeStyle(n: PlacedNode, selected: boolean): CSSProperties {
  const palette: Record<Kind, { bg: string; color: string; border: string }> = {
    entry: { bg: COLOR.TEXT_PRIMARY, color: COLOR.TEXT_INVERSE, border: COLOR.TEXT_PRIMARY },
    core: { bg: COLOR.ACCENT, color: COLOR.TEXT_INVERSE, border: COLOR.ACCENT },
    leaf: { bg: COLOR.BG_SECTION, color: COLOR.TEXT_SECONDARY, border: COLOR.BORDER_DEFAULT },
  }
  const p = palette[n.kind]
  return {
    position: "absolute", left: n.x, top: n.y, width: NODE_W, height: NODE_H, padding: "0 12px",
    display: "flex", alignItems: "center", boxSizing: "border-box", borderRadius: RADIUS.MD,
    backgroundColor: p.bg, color: p.color, border: `1.5px solid ${selected ? COLOR.ACCENT : p.border}`,
    boxShadow: selected ? `0 0 0 2px ${COLOR.ACCENT}` : undefined, cursor: "pointer", textAlign: "left",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...TYPOGRAPHY.STYLE.LABEL_1,
  }
}
