"use client"

import { type CSSProperties, type FC } from "react"
import type { Page, ProjectGraph } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { elementsOfPage } from "@/lib/graph/selectors"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { DescriptionItem } from "../description/DescriptionItem"

const COLUMN_WIDTH = 340

// Description 컬럼 — 포커스 보드 우측 고정 폭 번호 스펙 리스트(좌 Screen | 우 Description).
// 제목 헤더는 WireframeView(보드)가 소유한다(페이지명 중복 제거). 여기는 스펙·선택 하이라이트만.
// 항목을 펼치면 컬럼(340px) 안에서 바로 편집한다(embedEditor 기본 true) — 우측 도크 인스펙터는 폐지(중복 제거).
export const CanvasDescription: FC<{ page: Page; graph: ProjectGraph }> = ({ page, graph }) => {
  const selectedElementId = useGraphStore((s) => s.selectedElementId)
  const selectElement = useGraphStore((s) => s.selectElement)

  const elements = elementsOfPage(graph, page.id)

  return (
    <div style={COLUMN} onPointerDown={(e) => e.stopPropagation()}>
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

const COLUMN: CSSProperties = {
  width: COLUMN_WIDTH,
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  borderLeft: `1px solid ${COLOR.BORDER_DEFAULT}`, // 화면과 컬럼 구분(같은 보드 안)
  backgroundColor: COLOR.BG_SURFACE,
  overflowY: "auto", // 긴 스펙은 컬럼 안에서 스크롤 — 보드 높이에 키 맞춤
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
