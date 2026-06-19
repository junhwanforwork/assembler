"use client"

import { type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { InfiniteCanvas } from "../wireframe/InfiniteCanvas"
import { PageFrame } from "../wireframe/PageFrame"
import { WireframeEdges } from "../wireframe/WireframeEdges"
import { framesBounds } from "../wireframe/canvas-geometry"

// 화면(Wireframe) 섹션 — 무한 캔버스에 Page 프레임 + UI Element 스택 (ASS-033/034).
export const WireframeView: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const selectElement = useGraphStore((s) => s.selectElement)
  if (!graph) return null

  // 빈 영역 클릭은 요소 선택만 해제 — page 선택은 유지해 화면 뷰에 머문다(구조 뷰로 이탈 방지).
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <InfiniteCanvas contentBounds={framesBounds(graph.pages)} onBackgroundClick={() => selectElement(null)}>
        <WireframeEdges graph={graph} />
        {graph.pages.map((page) => (
          <PageFrame key={page.id} page={page} graph={graph} />
        ))}
      </InfiniteCanvas>
    </div>
  )
}
