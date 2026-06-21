"use client"

import { type CSSProperties, type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { ApiCatalogTable } from "./apidata/ApiCatalogTable"
import { DatabaseList } from "./apidata/DatabaseList"

// API·데이터 섹션 — API는 비개발자용 카탈로그 테이블(ASS-080), Database는 인라인 편집(ASS-036).
export const ApiDataView: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  if (!graph) return null

  return (
    <div>
      <ApiCatalogTable />

      <div style={DB_STYLE}>
        <p style={LABEL}>Database ({graph.databases.length})</p>
        <DatabaseList />
      </div>
    </div>
  )
}

const DB_STYLE: CSSProperties = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: `0 ${SPACING["6"]} ${SPACING["8"]}`,
}
const LABEL: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_1, color: COLOR.TEXT_LABEL, margin: `${SPACING["6"]} 0 ${SPACING["2"]}` }
