"use client"

import { type CSSProperties, type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { PageMapCanvas } from "./PageMapCanvas"

// Structure(흐름) 섹션 — 페이지 맵 노드 다이어그램(그림1): 기능 스윔레인 + 좌→우 흐름 + 연결선.
// 구 텍스트 리스트를 PageMapCanvas로 대체.
export const StructureView: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const selectNode = useGraphStore((s) => s.selectNode)
  const selectedNode = useGraphStore((s) => s.selectedNode)
  if (!graph) return null

  const selectedPageId = selectedNode?.type === "page" ? selectedNode.id : undefined

  return (
    <div style={WRAP}>
      <div style={HEAD}>
        <h1 style={{ ...TYPOGRAPHY.STYLE.H3, color: COLOR.TEXT_PRIMARY, margin: 0 }}>화면 흐름</h1>
        <span style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }}>
          화면 {graph.pages.length} · 이동 {graph.userFlow.edges.length}
        </span>
      </div>
      <div style={SCROLL}>
        <PageMapCanvas graph={graph} onSelect={(pageId) => selectNode("page", pageId)} selectedId={selectedPageId} />
      </div>
    </div>
  )
}

const WRAP: CSSProperties = { display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }
const HEAD: CSSProperties = {
  display: "flex", alignItems: "baseline", gap: SPACING["3"],
  padding: `${SPACING["5"]} ${SPACING["6"]} ${SPACING["3"]}`, flexShrink: 0,
}
const SCROLL: CSSProperties = { flex: 1, minHeight: 0, overflow: "auto", padding: `0 ${SPACING["6"]} ${SPACING["6"]}` }
