"use client"

import { type CSSProperties, type FC } from "react"
import type { ProjectGraph } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { elementsOfPage, incompleteCount } from "@/lib/graph/selectors"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { DescriptionItem } from "./DescriptionItem"

// 와이어프레임 Description 패널 (ASS-076) — 선택 Page의 요소를 번호 리스트로.
// 캔버스 번호 마커(ElementNode)와 같은 순서(elementsOfPage)라 ①②③ ↔ 항목 1:1 정합.
// 항목 클릭 → selectElement → 해당 항목 펼침(편집 폼 인라인). 빈 화면이면 빈 상태 안내.
export const DescriptionPanel: FC<{ graph: ProjectGraph; pageId: string }> = ({ graph, pageId }) => {
  const selectedElementId = useGraphStore((s) => s.selectedElementId)
  const selectElement = useGraphStore((s) => s.selectElement)

  const page = graph.pages.find((p) => p.id === pageId)
  const elements = elementsOfPage(graph, pageId)
  const incomplete = incompleteCount(graph, pageId)

  return (
    <div style={WRAP}>
      <header style={HEADER}>
        <span style={TITLE}>{page?.name ?? "화면"}</span>
        {incomplete > 0 ? (
          <span style={BADGE}>
            <span aria-hidden>⚠</span> 미완성 {incomplete}
          </span>
        ) : null}
      </header>

      {elements.length === 0 ? (
        <p style={EMPTY}>아직 요소가 없어요. 왼쪽 탐색기에서 요소를 추가해 보세요.</p>
      ) : (
        <ol style={LIST} role="list">
          {elements.map((el, i) => (
            <DescriptionItem
              key={el.id}
              index={i + 1}
              element={el}
              graph={graph}
              expanded={selectedElementId === el.id}
              onSelect={() => selectElement(selectedElementId === el.id ? null : el.id)}
            />
          ))}
        </ol>
      )}
    </div>
  )
}

const WRAP: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
}

const HEADER: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: SPACING["2"],
  padding: `${SPACING["3"]} ${SPACING["4"]}`,
  borderBottom: `1px solid ${COLOR.BORDER_DEFAULT}`,
  flexShrink: 0,
}

const TITLE: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_1, color: COLOR.TEXT_PRIMARY, flex: 1, minWidth: 0 }
const BADGE: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.WARNING,
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  padding: `2px ${SPACING["2"]}`,
  borderRadius: RADIUS.PILL,
  backgroundColor: COLOR.BG_SECTION,
}

const LIST: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["3"],
  listStyle: "none",
  margin: 0,
  padding: SPACING["4"],
  overflowY: "auto",
}

const EMPTY: CSSProperties = {
  ...TYPOGRAPHY.STYLE.BODY_2,
  color: COLOR.TEXT_MUTED,
  margin: 0,
  padding: SPACING["4"],
}
