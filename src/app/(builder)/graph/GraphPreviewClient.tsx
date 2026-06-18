"use client"

import { type FC, useEffect } from "react"
import { COLOR, SPACING } from "@/lib/design-tokens"
import { useGraphStore } from "@/lib/store/graph"
import { SAMPLE_GRAPH } from "@/lib/assembler/sample-graph"
import { ObjectTree } from "@/components/builder/tree/ObjectTree"
import { AiPromptPanel } from "@/components/builder/prompt/AiPromptPanel"
import { ObjectInspector } from "@/components/builder/inspector/ObjectInspector"
import { ImpactPanel } from "@/components/builder/impact/ImpactPanel"

// Object Tree 프리뷰 — 시드 그래프를 적재해 좌측 네비게이터를 렌더한다.
// AI Prompt 생성(다음 슬라이스)이 붙으면 SAMPLE_GRAPH 자리를 생성 결과로 교체한다.

export const GraphPreviewClient: FC = () => {
  const loadGraph = useGraphStore((s) => s.loadGraph)

  useEffect(() => {
    loadGraph(SAMPLE_GRAPH)
  }, [loadGraph])

  return (
    <div style={SHELL_STYLE}>
      <aside style={TREE_PANEL_STYLE}>
        <ObjectTree />
      </aside>
      <main style={CANVAS_STYLE}>
        <AiPromptPanel />
        <ObjectInspector />
        <ImpactPanel />
      </main>
    </div>
  )
}

const SHELL_STYLE: React.CSSProperties = {
  display: "flex",
  height: "100vh",
  backgroundColor: COLOR.BG_BASE,
}

const TREE_PANEL_STYLE: React.CSSProperties = {
  width: 280,
  flexShrink: 0,
  height: "100%",
  overflowY: "auto",
  borderRight: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SURFACE,
}

const CANVAS_STYLE: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: SPACING["4"],
  overflowY: "auto",
  padding: SPACING["8"],
}
