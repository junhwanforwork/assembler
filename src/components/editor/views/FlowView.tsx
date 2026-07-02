"use client"

import { useMemo, useState } from "react"
import { clsx } from "clsx"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import { FLOW_CARD_H, FLOW_CARD_W, flowArrowPoints, flowEdgePath, layoutFlow } from "./flowUtils"
import s from "../editor.module.css"

// 유저플로우 — flow-view-pattern 캔버스(SVG 엣지 + absolute 노드, 라이브러리 없음).
// 노드 hover 시 연결된 엣지를 강조(점선→실선). 노드 클릭(#44)은 정의 대기라 미배선.
export function FlowView({ design }: { design: WorkspaceDesign }) {
  const { nodes, edges, width, height } = useMemo(
    () => layoutFlow(design.pages, design.flows),
    [design.pages, design.flows],
  )
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <section className={s.view}>
      <div className={s.viewHead}>
        <span className={s.viewTitle}>유저플로우</span>
        <div className={s.spacer} />
        <span className={s.countChip}>
          화면 <b>{design.pages.length}</b>
        </span>
        <span className={s.countChip}>
          이동 <b>{edges.length}</b>
        </span>
      </div>

      {nodes.length === 0 ? (
        <div className={s.placeholder}>
          <div className={s.placeholderTitle}>아직 화면이 없어요</div>
          <div className={s.placeholderSub}>화면이 생기면 화면 사이의 이동을 다이어그램으로 보여드릴게요.</div>
        </div>
      ) : (
        <div className={s.flowScroll}>
          <div className={s.flowCanvas} style={{ width, height, minWidth: width, minHeight: height }}>
            <svg className={s.flowEdges} width={width} height={height}>
              {edges.map((edge) => {
                const active = hovered === edge.fromPageId || hovered === edge.toPageId
                return (
                  <g key={edge.id}>
                    <path
                      d={flowEdgePath(edge)}
                      fill="none"
                      stroke={active ? "var(--brand)" : "var(--border)"}
                      strokeWidth={active ? 1.5 : 1}
                      strokeDasharray={active ? undefined : "4 3"}
                    />
                    <polygon
                      points={flowArrowPoints(edge.x2, edge.y2, edge.reverse)}
                      fill={active ? "var(--brand)" : "var(--border-strong)"}
                    />
                  </g>
                )
              })}
            </svg>

            {nodes.map((node) => (
              <div
                key={node.page.id}
                className={clsx(s.flowNode, hovered === node.page.id && s.flowNodeHover)}
                style={{ left: node.x, top: node.y, width: FLOW_CARD_W, height: FLOW_CARD_H }}
                onMouseEnter={() => setHovered(node.page.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className={s.flowDot} aria-hidden />
                <span className={s.flowNodeName}>{node.page.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
