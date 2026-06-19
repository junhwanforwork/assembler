"use client"

import { type FC, useEffect } from "react"
import type { ProjectGraph } from "@/lib/types/assembler"
import { useGraphStore, sectionForNodeType } from "@/lib/store/graph"
import { COLOR } from "@/lib/design-tokens"
import { GraphHeader } from "./GraphHeader"
import { ExplorerTree } from "./ExplorerTree"
import { PromptPanel } from "./PromptPanel"
import { DocView } from "./sections/DocView"
import { StructureView } from "./sections/StructureView"
import { WireframeView } from "./sections/WireframeView"
import { ApiDataView } from "./sections/ApiDataView"
import { GraphInspector } from "./inspector/GraphInspector"

// 빌더 셸 (ASS-025 → ASS-070 통합 트리): Header / EXPLORER 트리 / Canvas / (요소 인스펙터 도크) / Prompt.
// 캔버스 뷰는 선택 노드 타입에서 파생(sectionForNodeType) — 트리 선택이 화면을 결정한다.
export const GraphShell: FC<{ projectId: string; initialGraph: ProjectGraph }> = ({
  projectId,
  initialGraph,
}) => {
  const load = useGraphStore((s) => s.load)
  const graph = useGraphStore((s) => s.graph)
  const selectedNode = useGraphStore((s) => s.selectedNode)
  const selectedElementId = useGraphStore((s) => s.selectedElementId)

  useEffect(() => {
    load(projectId, initialGraph)
  }, [projectId, initialGraph, load])

  if (!graph) {
    return <div style={{ ...SHELL_STYLE, alignItems: "center", justifyContent: "center" }} />
  }

  const section = sectionForNodeType(selectedNode?.type ?? "root")

  return (
    <div style={SHELL_STYLE}>
      <GraphHeader />
      <div style={BODY_STYLE}>
        <ExplorerTree />
        <main style={CANVAS_STYLE}>
          {section === "doc" && <DocView />}
          {section === "structure" && <StructureView />}
          {section === "wireframe" && <WireframeView />}
          {section === "apidata" && <ApiDataView />}
        </main>
        {selectedElementId ? (
          <aside style={INSPECTOR_STYLE} aria-label="요소 매핑 편집">
            <GraphInspector graph={graph} />
          </aside>
        ) : null}
        <PromptPanel />
      </div>
    </div>
  )
}

const SHELL_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  backgroundColor: COLOR.BG_BASE,
}

const BODY_STYLE: React.CSSProperties = {
  display: "flex",
  flex: 1,
  minHeight: 0,
}

const CANVAS_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: "100%",
  overflow: "auto",
  backgroundColor: COLOR.BG_BASE,
}

const INSPECTOR_STYLE: React.CSSProperties = {
  width: "300px",
  flexShrink: 0,
  height: "100%",
  overflowY: "auto",
  padding: "12px",
  borderLeft: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SURFACE,
}
