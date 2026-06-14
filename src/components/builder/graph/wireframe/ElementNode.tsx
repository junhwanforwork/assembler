"use client"

import { useState, type CSSProperties, type FC, type PointerEvent as ReactPointerEvent } from "react"
import type { ProjectGraph, UIElement } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { isMappingComplete } from "@/lib/graph/selectors"
import { BlockRenderer } from "@/components/builder/screen/BlockRenderer"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { MappingChip } from "./MappingChip"

// 와이어프레임 요소 — BlockRenderer(읽기 전용) + 선택/hover + 매핑 미완성 ⚠ + 매핑 칩.
export const ElementNode: FC<{ element: UIElement; graph: ProjectGraph }> = ({ element, graph }) => {
  const selected = useGraphStore((s) => s.selectedElementId === element.id)
  const selectElement = useGraphStore((s) => s.selectElement)
  const [hover, setHover] = useState(false)
  const complete = isMappingComplete(element)

  const onSelect = (e: ReactPointerEvent) => {
    e.stopPropagation() // 프레임 드래그·배경 팬 차단
    selectElement(element.id)
  }

  return (
    <div
      onPointerDown={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...WRAP,
        outline: selected ? `2px solid ${COLOR.ACCENT}` : "2px solid transparent",
        backgroundColor: hover && !selected ? COLOR.BG_SECTION : "transparent",
      }}
    >
      <div style={NAME_ROW}>
        <span style={NAME}>{element.name}</span>
        {!complete ? (
          <span style={WARN}>
            <span aria-hidden>⚠</span> 매핑 미완성
          </span>
        ) : null}
      </div>
      <div style={{ pointerEvents: "none" }}>
        <BlockRenderer block={{ id: element.id, type: element.type, props: element.props }} />
      </div>
      {selected || hover ? <MappingChip element={element} graph={graph} /> : null}
    </div>
  )
}

const WRAP: CSSProperties = {
  padding: SPACING["2"],
  borderRadius: RADIUS.MD,
  cursor: "pointer",
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
