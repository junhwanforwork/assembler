"use client"

import { useState, type CSSProperties, type FC, type PointerEvent as ReactPointerEvent } from "react"
import type { ProjectGraph, UIElement } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { isMappingComplete } from "@/lib/graph/selectors"
import { BlockRenderer } from "@/components/builder/screen/BlockRenderer"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY, INTERACTION } from "@/lib/design-tokens"
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

  // resting 상태는 조용하게(요소만) — 이름·"매핑 미완성" 텍스트·매핑 칩은 hover/선택 시만 드러낸다.
  // 미완성은 평소 작은 ⚠ dot으로만 알린다(매핑 가시성 원칙 유지, 어수선함 제거).
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
      {showMeta ? (
        <div style={NAME_ROW}>
          <span style={NAME}>{element.name}</span>
          {!complete ? (
            <span style={WARN}>
              <span aria-hidden>⚠</span> 매핑 미완성
            </span>
          ) : null}
        </div>
      ) : !complete ? (
        <span style={WARN_DOT} aria-label={`${element.name} 매핑 미완성`}>
          <span aria-hidden>⚠</span>
        </span>
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

// resting 미완성 마커 — 우상단 작은 ⚠. 색 단독 의미 전달 금지라 aria-label 동반.
const WARN_DOT: CSSProperties = {
  position: "absolute",
  top: SPACING["1"],
  right: SPACING["1"],
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.WARNING,
  lineHeight: 1,
}

const WARN: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.WARNING,
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
}
