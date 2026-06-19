"use client"

import { useState, type CSSProperties, type FC, type PointerEvent as ReactPointerEvent } from "react"
import type { ProjectGraph, UIElement } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { isMappingComplete } from "@/lib/graph/selectors"
import { BlockRenderer } from "@/components/builder/screen/BlockRenderer"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY, INTERACTION } from "@/lib/design-tokens"
import { MappingChip } from "./MappingChip"
import { ElementMarker } from "./ElementMarker"

// 와이어프레임 요소 — BlockRenderer(읽기 전용) + 선택/hover + 번호 마커 + 매핑 칩.
// active(소속 Page가 선택됨)면 좌상단 번호 마커 상시 표시 — 우측 Description 번호와 1:1 정합.
// 미완성 경고는 마커의 WARNING 링으로 흡수(기존 resting ⚠ dot 대체).
export const ElementNode: FC<{ element: UIElement; graph: ProjectGraph; index: number; active: boolean }> = ({
  element,
  graph,
  index,
  active,
}) => {
  const selected = useGraphStore((s) => s.selectedElementId === element.id)
  const selectElement = useGraphStore((s) => s.selectElement)
  const [hover, setHover] = useState(false)
  const complete = isMappingComplete(element)

  const onSelect = (e: ReactPointerEvent) => {
    e.stopPropagation() // 프레임 드래그·배경 팬 차단
    selectElement(element.id)
  }

  // resting 상태는 조용하게(요소+번호만) — 이름·"매핑 미완성" 텍스트·매핑 칩은 hover/선택 시만 드러낸다.
  const showMeta = hover || selected

  return (
    <div
      onPointerDown={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...WRAP,
        outline: selected ? `2px solid ${COLOR.ACCENT}` : "2px solid transparent",
        backgroundColor: showMeta ? INTERACTION.HOVER_BG_SURFACE : "transparent",
      }}
    >
      {active ? <ElementMarker index={index} name={element.name} complete={complete} /> : null}
      {showMeta ? (
        <div style={NAME_ROW}>
          <span style={NAME}>{element.name}</span>
          {!complete ? (
            <span style={WARN}>
              <span aria-hidden>⚠</span> 매핑 미완성
            </span>
          ) : null}
        </div>
      ) : null}
      <div style={{ pointerEvents: "none" }}>
        <BlockRenderer block={{ id: element.id, type: element.type, props: element.props }} />
      </div>
      {showMeta ? <MappingChip element={element} graph={graph} /> : null}
    </div>
  )
}

const WRAP: CSSProperties = {
  position: "relative",
  padding: SPACING["3"],
  borderRadius: RADIUS.MD,
  cursor: "pointer",
  transition: INTERACTION.TRANSITION_BG,
}

const NAME_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: SPACING["2"],
  marginBottom: SPACING["1"],
}

const NAME: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }

const WARN: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.WARNING,
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
}
