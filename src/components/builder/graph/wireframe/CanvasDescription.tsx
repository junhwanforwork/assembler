"use client"

import { type CSSProperties, type FC } from "react"
import type { Page, ProjectGraph } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { elementsOfPage, incompleteCount } from "@/lib/graph/selectors"
import { COLOR, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { frameWidth } from "./canvas-geometry"
import { DescriptionItem } from "../description/DescriptionItem"

const BOARD_GAP = 40
const BOARD_WIDTH = 360

// 캔버스 Description 보드 — 선택 Page 오른쪽에 화면과 한 보드처럼 붙는다(좌 Screen | 우 Description).
// InfiniteCanvas 변환 레이어 안에 absolute 배치(page.x + 프레임폭 + GAP) → 줌/팬에 같이 움직인다.
// DescriptionItem을 embedEditor=false로 재사용 — 캔버스에선 스펙·선택 하이라이트만, 편집은 우측 도크 GraphInspector.
export const CanvasDescription: FC<{ page: Page; graph: ProjectGraph }> = ({ page, graph }) => {
  const selectedElementId = useGraphStore((s) => s.selectedElementId)
  const selectElement = useGraphStore((s) => s.selectElement)

  const elements = elementsOfPage(graph, page.id)
  const incomplete = incompleteCount(graph, page.id)
  const left = page.x + frameWidth(page) + BOARD_GAP

  return (
    <div style={{ ...BOARD, left, top: page.y }} onPointerDown={(e) => e.stopPropagation()}>
      <header style={HEADER}>
        <span style={TITLE}>{page.name}</span>
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
              embedEditor={false}
              onSelect={() => selectElement(selectedElementId === el.id ? null : el.id)}
            />
          ))}
        </ol>
      )}
    </div>
  )
}

const BOARD: CSSProperties = {
  position: "absolute",
  width: BOARD_WIDTH,
  display: "flex",
  flexDirection: "column",
  borderRadius: RADIUS.LG,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SURFACE,
  boxShadow: SHADOW.CARD,
  overflow: "hidden",
}

const HEADER: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: SPACING["2"],
  padding: `${SPACING["3"]} ${SPACING["4"]}`,
  borderBottom: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SECTION,
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
  backgroundColor: COLOR.BG_BASE,
}

const LIST: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["3"],
  listStyle: "none",
  margin: 0,
  padding: SPACING["4"],
}

const EMPTY: CSSProperties = {
  ...TYPOGRAPHY.STYLE.BODY_2,
  color: COLOR.TEXT_MUTED,
  margin: 0,
  padding: SPACING["4"],
}
