"use client"

import { type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { InfiniteCanvas } from "../wireframe/InfiniteCanvas"
import { PageFrame } from "../wireframe/PageFrame"
import { WireframeEdges } from "../wireframe/WireframeEdges"
import { CanvasDescription } from "../wireframe/CanvasDescription"
import { framesBounds } from "../wireframe/canvas-geometry"

// 화면(Wireframe) 섹션 — 무한 캔버스에 Page 프레임 + UI Element 스택 (ASS-033/034).
// 선택 Page가 있으면 그 화면 오른쪽에 Description 보드(CanvasDescription)를 같은 변환 레이어에 띄운다(ASS-078).
export const WireframeView: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const selectedPageId = useGraphStore((s) => s.selectedPageId)
  const selectElement = useGraphStore((s) => s.selectElement)
  if (!graph) return null

  const selectedPage = selectedPageId ? graph.pages.find((p) => p.id === selectedPageId) ?? null : null

  // 빈 영역 클릭은 요소 선택만 해제 — page 선택은 유지해 화면 뷰에 머문다(구조 뷰로 이탈 방지).
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <InfiniteCanvas
        contentBounds={framesBounds(graph.pages, selectedPageId)}
        onBackgroundClick={() => selectElement(null)}
      >
        <WireframeEdges graph={graph} />
        {graph.pages.map((page) => (
          <PageFrame key={page.id} page={page} graph={graph} />
        ))}
        {selectedPage ? <CanvasDescription page={selectedPage} graph={graph} /> : null}
      </InfiniteCanvas>
    </div>
  )
}
