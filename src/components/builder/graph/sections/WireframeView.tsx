"use client"

import { type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { InfiniteCanvas } from "../wireframe/InfiniteCanvas"
import { WireframeBoard } from "../wireframe/WireframeBoard"
import { WireframeEdges } from "../wireframe/WireframeEdges"
import { framesBounds } from "../wireframe/canvas-geometry"

// 화면(Wireframe) 섹션 — 무한 캔버스에 페이지당 보드 1개(제목 + [화면 | Description]) (ASS-033/034/078/079).
// 보드가 제목·드래그·선택과 Description 표시(선택 페이지만)를 소유한다 — 페이지명 중복 제거.
export const WireframeView: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const selectedPageId = useGraphStore((s) => s.selectedPageId)
  const selectElement = useGraphStore((s) => s.selectElement)
  if (!graph) return null

  // 빈 영역 클릭은 요소 선택만 해제 — page 선택은 유지해 화면 뷰에 머문다(구조 뷰로 이탈 방지).
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <InfiniteCanvas
        contentBounds={framesBounds(graph.pages, selectedPageId)}
        onBackgroundClick={() => selectElement(null)}
      >
        <WireframeEdges graph={graph} />
        {graph.pages.map((page) => (
          <WireframeBoard key={page.id} page={page} graph={graph} />
        ))}
      </InfiniteCanvas>
    </div>
  )
}
