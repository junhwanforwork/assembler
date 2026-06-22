"use client"

import { type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { StructureCanvas } from "./structure/StructureCanvas"

// Structure(흐름) 섹션 — 페이지맵 캔버스(ASS-032). 노드=Page, 엣지=UserFlow.
// 이전 텍스트 리스트(IA+흐름 목록)는 인터랙티브 캔버스로 대체. 조립만 담당.
export const StructureView: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  if (!graph) return null
  return <StructureCanvas graph={graph} />
}
