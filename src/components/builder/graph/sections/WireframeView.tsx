"use client"

import { type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { InfiniteCanvas } from "../wireframe/InfiniteCanvas"
import { PageFrame } from "../wireframe/PageFrame"
import { framesBounds } from "../wireframe/canvas-geometry"

// 화면(Wireframe) 섹션 — 무한 캔버스에 Page 프레임 + UI Element 스택 (ASS-033/034).
export const WireframeView: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const selectPage = useGraphStore((s) => s.selectPage)
  if (!graph) return null

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <InfiniteCanvas contentBounds={framesBounds(graph.pages)} onBackgroundClick={() => selectPage(null)}>
        {graph.pages.map((page) => (
          <PageFrame key={page.id} page={page} graph={graph} />
        ))}
      </InfiniteCanvas>
    </div>
  )
}
