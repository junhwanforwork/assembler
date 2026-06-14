"use client"

import { type CSSProperties, type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { ApiList } from "./apidata/ApiList"
import { DatabaseList } from "./apidata/DatabaseList"

// API·데이터 섹션 — 전역 Api·Database 인라인 편집 (ASS-036).
export const ApiDataView: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  if (!graph) return null

  return (
    <div style={PAGE_STYLE}>
      <h1 style={{ ...TYPOGRAPHY.STYLE.H3, color: COLOR.TEXT_PRIMARY, margin: 0 }}>API · 데이터</h1>

      <p style={LABEL}>API ({graph.apis.length})</p>
      <ApiList />

      <p style={LABEL}>Database ({graph.databases.length})</p>
      <DatabaseList />
    </div>
  )
}

const PAGE_STYLE: CSSProperties = { maxWidth: "760px", margin: "0 auto", padding: `${SPACING["8"]} ${SPACING["6"]}` }
const LABEL: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_1, color: COLOR.TEXT_LABEL, margin: `${SPACING["6"]} 0 ${SPACING["2"]}` }
