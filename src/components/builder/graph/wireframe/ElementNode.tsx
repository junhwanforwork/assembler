"use client"

import { useRef, useState, type CSSProperties, type FC, type PointerEvent as ReactPointerEvent } from "react"
import type { ProjectGraph, UIElement } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { isMappingComplete } from "@/lib/graph/selectors"
import { SkeletonBlockRenderer } from "./SkeletonBlockRenderer"
import { COLOR, RADIUS, SPACING, INTERACTION } from "@/lib/design-tokens"
import { ElementMarker } from "./ElementMarker"
import { ElementTooltip } from "./ElementTooltip"

// 와이어프레임 요소 — SkeletonBlockRenderer(모노크롬 low-fi) + 선택/hover + 번호 마커.
// active(소속 Page가 선택됨)면 좌상단 번호 마커 상시 표시 — 우측 Description 번호와 1:1 정합.
// hover 시 매핑은 인라인으로 펼치지 않고(박스 크기 불변) 포털 플로팅 툴팁(ElementTooltip)으로 띄운다.
export const ElementNode: FC<{ element: UIElement; graph: ProjectGraph; index: number; active: boolean }> = ({
  element,
  graph,
  index,
  active,
}) => {
  const selected = useGraphStore((s) => s.selectedElementId === element.id)
  const selectElement = useGraphStore((s) => s.selectElement)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const complete = isMappingComplete(element)

  const onSelect = (e: ReactPointerEvent) => {
    e.stopPropagation() // 프레임 드래그·배경 팬 차단
    selectElement(element.id)
  }

  // hover 진입 시 요소 화면 좌표를 스냅샷 — 툴팁 위치 기준(줌/팬 무관 fixed).
  const onEnter = () => {
    if (wrapRef.current) setAnchorRect(wrapRef.current.getBoundingClientRect())
  }

  return (
    <div
      ref={wrapRef}
      onPointerDown={onSelect}
      onMouseEnter={onEnter}
      onMouseLeave={() => setAnchorRect(null)}
      style={{
        ...WRAP,
        outline: selected ? `2px solid ${COLOR.ACCENT}` : "2px solid transparent",
        backgroundColor: anchorRect || selected ? INTERACTION.HOVER_BG_SURFACE : "transparent",
      }}
    >
      {active ? <ElementMarker index={index} name={element.name} complete={complete} /> : null}
      <div style={{ pointerEvents: "none" }}>
        <SkeletonBlockRenderer block={{ id: element.id, type: element.type, props: element.props }} />
      </div>
      {anchorRect ? <ElementTooltip element={element} graph={graph} anchorRect={anchorRect} /> : null}
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
