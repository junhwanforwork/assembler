"use client"

import { memo, useMemo, useState, type FC } from "react"
import type { Flow, Screen } from "@/lib/types/builder"
import { useBuilderStore } from "@/lib/store/builder"
import { COLOR, DURATION, EASE } from "@/lib/design-tokens"
import { edgePath, arrowPoints, edgeMidpoint } from "./flow-layout"

interface FlowEdgeProps {
  flow: Flow
  source: Screen
  target: Screen
  // 양 끝 화면 중 하나가 hover되면 강조.
  highlighted: boolean
}

// memo — 드래그 중인 노드에 닿지 않는 엣지는 source/target 참조가 그대로라 재렌더를 건너뛴다.
const FlowEdgeImpl: FC<FlowEdgeProps> = ({ flow, source, target, highlighted }) => {
  const removeFlow = useBuilderStore((s) => s.removeFlow)
  const [hovered, setHovered] = useState(false)

  const active = hovered || highlighted
  const stroke = active ? COLOR.ACCENT : COLOR.BORDER_STRONG
  // path 계산은 좌표가 바뀔 때만 — hover 토글 등 비좌표 재렌더에서 재계산하지 않는다.
  const mid = useMemo(() => edgeMidpoint(source, target), [source, target])
  const d = useMemo(() => edgePath(source, target), [source, target])
  const arrow = useMemo(() => arrowPoints(source, target), [source, target])

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 넓은 투명 hit area — 가는 선을 정확히 클릭하기 어렵기에 잡기 영역을 넓힌다. */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ pointerEvents: "stroke", cursor: "pointer" }}
      />
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={active ? 2 : 1.25}
        strokeDasharray={active ? undefined : "5 4"}
        strokeLinecap="round"
        style={{
          pointerEvents: "none",
          transition: `stroke ${DURATION.BASE} ${EASE.DEFAULT}`,
        }}
      />
      <polygon
        points={arrow}
        fill={stroke}
        style={{ pointerEvents: "none", transition: `fill ${DURATION.BASE} ${EASE.DEFAULT}` }}
      />

      {flow.label ? (
        <text
          x={mid.x}
          y={mid.y - 8}
          textAnchor="middle"
          style={{ pointerEvents: "none", userSelect: "none" }}
          fontSize={12}
          fontWeight={500}
          fill={active ? COLOR.ACCENT : COLOR.TEXT_MUTED}
        >
          {flow.label}
        </text>
      ) : null}

      {/* 삭제 배지 — 중간점. 항상 클릭 가능하되 hover 시에만 또렷해진다. */}
      <g
        role="button"
        aria-label="연결 삭제하기"
        tabIndex={0}
        onClick={() => removeFlow(flow.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            removeFlow(flow.id)
          }
        }}
        style={{ cursor: "pointer", pointerEvents: "auto", opacity: active ? 1 : 0.55 }}
      >
        <circle cx={mid.x} cy={mid.y} r={9} fill={COLOR.BG_BASE} stroke={stroke} strokeWidth={1.25} />
        <path
          d={`M ${mid.x - 3.5} ${mid.y - 3.5} L ${mid.x + 3.5} ${mid.y + 3.5} M ${mid.x + 3.5} ${mid.y - 3.5} L ${mid.x - 3.5} ${mid.y + 3.5}`}
          stroke={active ? COLOR.NEGATIVE : COLOR.TEXT_MUTED}
          strokeWidth={1.4}
          strokeLinecap="round"
          style={{ pointerEvents: "none" }}
        />
      </g>
    </g>
  )
}

export const FlowEdge = memo(FlowEdgeImpl)
