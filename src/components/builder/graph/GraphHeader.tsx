"use client"

import { type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { isMappingComplete } from "@/lib/graph/selectors"
import { Button } from "@/components/ui"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"

// 빌더 상단 바: 프로젝트 정체성 + 진행률 + 전역 액션(공유·내보내기 — 후속 배선).
export const GraphHeader: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  if (!graph) return null

  const total = graph.uiElements.length
  const complete = graph.uiElements.filter(isMappingComplete).length
  const progress = total === 0 ? 0 : Math.round((complete / total) * 100)

  return (
    <header style={HEADER_STYLE}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACING["3"], minWidth: 0 }}>
        <span style={{ ...TYPOGRAPHY.STYLE.TITLE_2_KO, color: COLOR.TEXT_PRIMARY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {graph.name || "제목 없는 프로젝트"}
        </span>
        <span style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }}>
          매핑 완성 {progress}%
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: SPACING["2"] }}>
        <Button variant="neutral" size="sm">공유하기</Button>
        <Button variant="neutral" size="sm">내보내기</Button>
      </div>
    </header>
  )
}

const HEADER_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: "52px",
  flexShrink: 0,
  padding: `0 ${SPACING["4"]}`,
  borderBottom: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SURFACE,
}
