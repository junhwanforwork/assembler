"use client"

import { type FC, useEffect } from "react"
import type { ProjectGraph } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { COLOR } from "@/lib/design-tokens"
import { GraphHeader } from "./GraphHeader"
import { ExplorerTree } from "./ExplorerTree"
import { PromptPanel } from "./PromptPanel"
import { CanvasTabs } from "./CanvasTabs"
import { GraphInspector } from "./inspector/GraphInspector"

// 빌더 셸 (ASS-025 → ASS-070 통합 트리 → ASS-071 뷰탭): Header / EXPLORER 트리 / Canvas / (요소 인스펙터 도크) / Prompt.
// 캔버스는 CanvasTabs가 선택 노드 타입별 탭셋으로 라우팅 — 한 객체를 여러 각도(화면/문서/흐름/표)로 본다.
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

  return (
    <div style={SHELL_STYLE}>
      <GraphHeader />
      <div style={BODY_STYLE}>
        <ExplorerTree />
        <main style={CANVAS_STYLE}>
          {/* 노드가 바뀌면 remount → 활성 탭이 기본 탭으로 리셋(CanvasTabs 내부 로컬 state). */}
          <CanvasTabs key={`${selectedNode?.type ?? "root"}:${selectedNode?.id ?? ""}`} />
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
  minHeight: 0,
  overflow: "hidden", // 스크롤은 CanvasTabs 콘텐츠 영역이 소유 (탭바 고정)
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
