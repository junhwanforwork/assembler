"use client"

import { useMemo, useState, type CSSProperties, type FC } from "react"
import type { Page, ProjectGraph } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { incompleteCount } from "@/lib/graph/selectors"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { InfiniteCanvas } from "../../wireframe/InfiniteCanvas"
import { StructureNode } from "./StructureNode"
import { StructureEdges } from "./StructureEdges"
import { pagesBounds, pageCanvasSize } from "./structure-geometry"

// 흐름 탭 페이지맵 캔버스(ASS-032). InfiniteCanvas 위에 Page 노드(절대배치) + UserFlow 엣지.
// 노드 드래그→movePage(드롭 1회), 클릭→selectNode("page"). 엣지/노드 편집은 ASS-082~.
export const StructureCanvas: FC<{ graph: ProjectGraph }> = ({ graph }) => {
  const movePage = useGraphStore((s) => s.movePage)
  const selectedNode = useGraphStore((s) => s.selectedNode)
  const selectedPageId = selectedNode?.type === "page" ? selectedNode.id : null

  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null)
  // 드래그 중인 페이지의 라이브 좌표 — 엣지 끝점만 따라가게 하는 임시 상태(store 미반영).
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)

  const featureName = useMemo(() => {
    const m = new Map<string, string>()
    for (const f of graph.features) m.set(f.id, f.name)
    return m
  }, [graph.features])

  const featureLabelOf = (featureIds: string[]): string => {
    if (featureIds.length === 0) return "미분류"
    const name = featureName.get(featureIds[0]) ?? "기능"
    return featureIds.length > 1 ? `${name} 외 ${featureIds.length - 1}` : name
  }

  // 라이브 좌표는 엣지 끝점에만 먹인다 — 노드는 store 좌표 + transform이 변위를 소유(FlowCanvas 패턴).
  // 노드까지 라이브로 주면 left(라이브) + transform(offset)이 이중 적용돼 2배속으로 질주한다.
  const pageById = useMemo(() => {
    const m = new Map<string, Page>()
    for (const p of graph.pages) m.set(p.id, drag && drag.id === p.id ? { ...p, x: drag.x, y: drag.y } : p)
    return m
  }, [graph.pages, drag])

  // bounds·size는 store 좌표 기준(드래그마다 재계산 안 함). 엣지 SVG는 overflow:visible이라 확장 시에도 안 잘림.
  const bounds = useMemo(() => pagesBounds(graph.pages), [graph.pages])
  const size = useMemo(() => pageCanvasSize(graph.pages), [graph.pages])

  if (graph.pages.length === 0) {
    return (
      <div style={EMPTY_WRAP}>
        <p style={EMPTY}>아직 화면이 없어요. 왼쪽 탐색기에서 화면을 추가해 보세요.</p>
      </div>
    )
  }

  return (
    <div style={ROOT}>
      <InfiniteCanvas contentBounds={bounds}>
        <StructureEdges
          edges={graph.userFlow.edges}
          pageById={pageById}
          hoveredPageId={hoveredPageId}
          selectedPageId={selectedPageId}
          width={size.width}
          height={size.height}
        />
        {graph.pages.map((p) => (
          <StructureNode
            key={p.id}
            page={p}
            featureLabel={featureLabelOf(p.featureIds)}
            incomplete={incompleteCount(graph, p.id)}
            isActive={selectedPageId === p.id}
            isHovered={hoveredPageId === p.id}
            onHover={setHoveredPageId}
            onDragMove={(id, x, y) => setDrag({ id, x, y })}
            onDragEnd={(id, x, y) => {
              movePage(id, x, y)
              setDrag(null)
            }}
          />
        ))}
      </InfiniteCanvas>
    </div>
  )
}

const ROOT: CSSProperties = { width: "100%", height: "100%", backgroundColor: COLOR.BG_BASE }

const EMPTY_WRAP: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: SPACING["6"],
  backgroundColor: COLOR.BG_BASE,
}

const EMPTY: CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, margin: 0 }
