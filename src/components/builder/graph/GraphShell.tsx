"use client"

import { type FC, useEffect } from "react"
import type { ProjectGraph } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { COLOR } from "@/lib/design-tokens"
import { GraphHeader } from "./GraphHeader"
import { SnbRail } from "./SnbRail"
import { SectionTabNav } from "./SectionTabNav"
import { PromptPanel } from "./PromptPanel"
import { DocView } from "./sections/DocView"
import { StructureView } from "./sections/StructureView"
import { WireframeView } from "./sections/WireframeView"
import { ApiDataView } from "./sections/ApiDataView"

// 새 빌더 5영역 셸 (ASS-025): Header / SNB 레일 / Tab 내비 / Canvas / Prompt 패널.
// SNB 선택(section)에 따라 Tab·Canvas 표면이 바뀐다. ProjectGraph를 그래프 스토어로 소비.
export const GraphShell: FC<{ projectId: string; initialGraph: ProjectGraph }> = ({
  projectId,
  initialGraph,
}) => {
  const load = useGraphStore((s) => s.load)
  const graph = useGraphStore((s) => s.graph)
  const section = useGraphStore((s) => s.section)

  useEffect(() => {
    load(projectId, initialGraph)
  }, [projectId, initialGraph, load])

  if (!graph) {
    return <div style={{ ...SHELL_STYLE, alignItems: "center", justifyContent: "center" }} />
  }

  return (
    <div style={SHELL_STYLE}>
      <GraphHeader />
      <div style={BODY_STYLE}>
        <SnbRail />
        <SectionTabNav />
        <main style={CANVAS_STYLE}>
          {section === "doc" && <DocView />}
          {section === "structure" && <StructureView />}
          {section === "wireframe" && <WireframeView />}
          {section === "apidata" && <ApiDataView />}
        </main>
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
