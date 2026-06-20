"use client"

import { type CSSProperties, type FC } from "react"
import type { Page, ProjectGraph } from "@/lib/types/assembler"
import { COLOR } from "@/lib/design-tokens"
import { frameWidth, framesBounds } from "./canvas-geometry"

// UserFlow(navigate) 엣지 — 보드↔보드 v1 (요소 정밀 앵커는 후속). flow.md 단일 출처(userFlow.edges).
// 앵커 = 보드 제목 헤더 중앙 높이(44px의 절반) — 화면 높이 측정 회피. read-only(생성은 Inspector result=navigate→ASS-023).
const ANCHOR_Y = 22
const PAD = 200

export const WireframeEdges: FC<{ graph: ProjectGraph }> = ({ graph }) => {
  const pageById = new Map(graph.pages.map((p) => [p.id, p]))
  const edges = graph.userFlow.edges
    .map((e) => {
      const from = pageById.get(e.fromPageId)
      const to = pageById.get(e.toPageId)
      return from && to ? { id: e.id, from, to } : null
    })
    .filter((e): e is { id: string; from: Page; to: Page } => e !== null)

  const b = framesBounds(graph.pages)
  const svgStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: Math.max(b.x + b.width + PAD, 0),
    height: Math.max(b.y + b.height + PAD, 0),
    overflow: "visible",
    pointerEvents: "none",
  }

  return (
    <svg style={svgStyle}>
      {edges.map(({ id, from, to }) => (
        <g key={id}>
          <path d={edgePath(from, to)} fill="none" stroke={COLOR.BORDER_STRONG} strokeWidth={1.5} />
          <polygon points={arrowPoints(to)} fill={COLOR.BORDER_STRONG} />
        </g>
      ))}
    </svg>
  )
}

function edgePath(from: Page, to: Page): string {
  const ax = from.x + frameWidth(from)
  const ay = from.y + ANCHOR_Y
  const bx = to.x
  const by = to.y + ANCHOR_Y
  const dx = Math.max(Math.abs(bx - ax) * 0.45, 48)
  return `M ${ax} ${ay} C ${ax + dx} ${ay} ${bx - dx} ${by} ${bx} ${by}`
}

function arrowPoints(to: Page): string {
  const bx = to.x
  const by = to.y + ANCHOR_Y
  return `${bx},${by} ${bx - 9},${by - 5} ${bx - 9},${by + 5}`
}
