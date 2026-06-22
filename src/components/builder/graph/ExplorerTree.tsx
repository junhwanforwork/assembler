"use client"

import { type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { COLOR, SPACING, TYPOGRAPHY, LAYOUT, SHADOW } from "@/lib/design-tokens"
import { TreeNav } from "./tree/TreeNav"
import { buildExplorerNodes } from "./explorer-nodes"
import { ExplorerPageTools } from "./ExplorerPageTools"

// 통합 EXPLORER 트리(ASS-070) — 구 SnbRail 4모드 전환 + 섹션별 좌측 나브를 한 트리로 대체.
// 한 트리에서 모든 객체(요구·기능▸Page▸요소·API·DB) 탐색, 노드 선택이 캔버스 뷰를 결정.
export const ExplorerTree: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const selectedNode = useGraphStore((s) => s.selectedNode)
  const selectNode = useGraphStore((s) => s.selectNode)
  if (!graph) return null

  const nodes = buildExplorerNodes(graph, selectedNode, selectNode)

  return (
    <aside style={NAV_STYLE} aria-label="객체 탐색기">
      <p style={TITLE}>탐색기</p>
      <TreeNav nodes={nodes} label="객체 탐색기" />
      <ExplorerPageTools graph={graph} />
    </aside>
  )
}

const NAV_STYLE: React.CSSProperties = {
  width: "280px",
  flexShrink: 0,
  height: "100%",
  overflowY: "auto",
  padding: SPACING["2"],
  borderRadius: LAYOUT.PANEL_RADIUS,
  boxShadow: SHADOW.PANEL,
  backgroundColor: COLOR.PANEL_BG,
}

const TITLE: React.CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.TEXT_MUTED,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  margin: `${SPACING["1"]} 0 ${SPACING["2"]}`,
  paddingLeft: SPACING["2"],
}
