"use client"

import { type CSSProperties, type FC } from "react"
import type { Page, UserFlowEdge } from "@/lib/types/assembler"
import { COLOR, TYPOGRAPHY } from "@/lib/design-tokens"
import { pageEdgePath, pageArrow, pageEdgeMid } from "./structure-geometry"

// UserFlow 엣지 레이어(읽기 전용 — 연결/삭제 편집은 ASS-082). 노드 아래에 깔리고 pointerEvents none.
// 연결된 페이지가 hover/선택되면 강조(점선→실선, ACCENT). 조건(condition)은 중간점 라벨.
export const StructureEdges: FC<{
  edges: UserFlowEdge[]
  pageById: Map<string, Page>
  hoveredPageId: string | null
  selectedPageId: string | null
  width: number
  height: number
}> = ({ edges, pageById, hoveredPageId, selectedPageId, width, height }) => (
  <svg width={width} height={height} style={SVG} aria-hidden>
    {edges.map((edge) => {
      const from = pageById.get(edge.fromPageId)
      const to = pageById.get(edge.toPageId)
      if (!from || !to) return null
      const active =
        hoveredPageId === edge.fromPageId ||
        hoveredPageId === edge.toPageId ||
        selectedPageId === edge.fromPageId ||
        selectedPageId === edge.toPageId
      const stroke = active ? COLOR.ACCENT : COLOR.BORDER_STRONG
      const mid = pageEdgeMid(from, to)
      return (
        <g key={edge.id}>
          <path
            d={pageEdgePath(from, to)}
            fill="none"
            stroke={stroke}
            strokeWidth={active ? 2 : 1.5}
            strokeDasharray={active ? undefined : "5 4"}
          />
          <polygon points={pageArrow(to)} fill={stroke} />
          {edge.condition ? (
            <text
              x={mid.x}
              y={mid.y - 6}
              textAnchor="middle"
              fill={active ? COLOR.ACCENT : COLOR.TEXT_MUTED}
              style={LABEL}
            >
              {edge.condition}
            </text>
          ) : null}
        </g>
      )
    })}
  </svg>
)

const SVG: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  pointerEvents: "none",
  overflow: "visible",
}

const LABEL: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2 }
