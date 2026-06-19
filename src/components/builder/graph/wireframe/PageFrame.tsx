"use client"

import { useRef, useState, type CSSProperties, type FC, type PointerEvent as ReactPointerEvent } from "react"
import type { Page, ProjectGraph } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { elementsOfPage, incompleteCount } from "@/lib/graph/selectors"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY, SHADOW } from "@/lib/design-tokens"
import { frameWidth } from "./canvas-geometry"
import { useCanvas } from "./canvas-context"
import { ElementNode } from "./ElementNode"

const DRAG_THRESHOLD = 4
const FRAME_FOCUS_HEIGHT = 520

// 와이어프레임 Page 프레임 — device 폭, 헤더(드래그·더블클릭 포커스) + 요소 스택.
export const PageFrame: FC<{ page: Page; graph: ProjectGraph }> = ({ page, graph }) => {
  const selectedPageId = useGraphStore((s) => s.selectedPageId)
  const selectedElementId = useGraphStore((s) => s.selectedElementId)
  const selected = selectedPageId === page.id && selectedElementId === null
  const active = selectedPageId === page.id
  const selectPage = useGraphStore((s) => s.selectPage)
  const movePage = useGraphStore((s) => s.movePage)
  const { zoom, focusBounds } = useCanvas()

  const [offset, setOffset] = useState<{ dx: number; dy: number } | null>(null)
  const movedRef = useRef(0)

  const width = frameWidth(page)
  const elements = elementsOfPage(graph, page.id)
  const incomplete = incompleteCount(graph, page.id)

  // 헤더 드래그 = 이동(zoom 보정, pointerup 1회 커밋). 임계 미만 = 선택.
  const onHeaderPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    movedRef.current = 0
    const onMove = (ev: PointerEvent) => {
      movedRef.current = Math.max(movedRef.current, Math.hypot(ev.clientX - startX, ev.clientY - startY))
      setOffset({ dx: (ev.clientX - startX) / zoom, dy: (ev.clientY - startY) / zoom })
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      if (ev.type !== "pointercancel" && movedRef.current >= DRAG_THRESHOLD) {
        movePage(page.id, page.x + (ev.clientX - startX) / zoom, page.y + (ev.clientY - startY) / zoom)
      } else if (ev.type !== "pointercancel") {
        selectPage(page.id)
      }
      setOffset(null)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
  }

  return (
    <div
      style={{
        ...FRAME,
        left: page.x,
        top: page.y,
        width,
        transform: offset ? `translate3d(${offset.dx}px, ${offset.dy}px, 0)` : undefined,
        zIndex: offset ? 10 : undefined,
        outline: selected ? `2px solid ${COLOR.ACCENT}` : `1px solid ${COLOR.BORDER_DEFAULT}`,
      }}
    >
      <header
        onPointerDown={onHeaderPointerDown}
        onDoubleClick={() => focusBounds({ x: page.x, y: page.y, width, height: FRAME_FOCUS_HEIGHT })}
        style={HEADER}
      >
        <span style={TITLE}>{page.name}</span>
        <span style={DEVICE}>{page.device}</span>
        {incomplete > 0 ? (
          <span style={WARN}>
            <span aria-hidden>⚠</span> {incomplete}
          </span>
        ) : null}
      </header>
      <div style={BODY}>
        {elements.length === 0 ? (
          <p style={EMPTY}>빈 화면이에요. 왼쪽 탐색기에서 요소를 추가해 보세요.</p>
        ) : (
          elements.map((el, i) => (
            <ElementNode key={el.id} element={el} graph={graph} index={i + 1} active={active} />
          ))
        )}
      </div>
    </div>
  )
}

const FRAME: CSSProperties = {
  position: "absolute",
  borderRadius: RADIUS.LG,
  backgroundColor: COLOR.BG_SURFACE,
  overflow: "hidden",
  boxShadow: SHADOW.CARD, // 캔버스(BG_BASE)와 분리감 — 평면 유지, 카드감만
}

const HEADER: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: SPACING["2"],
  padding: `${SPACING["2"]} ${SPACING["3"]}`,
  borderBottom: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SECTION,
  cursor: "grab",
}

const TITLE: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_1, color: COLOR.TEXT_PRIMARY, flex: 1, minWidth: 0 }
const DEVICE: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }
const WARN: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.WARNING,
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
}

const BODY: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["4"], // 요소 간 호흡 (12→16px)
  padding: SPACING["4"],
  minHeight: 160,
  backgroundColor: COLOR.BG_BASE, // 화면 본문 = 중성 "종이"(헤더 BG_SECTION과 분리)
}

const EMPTY: CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, margin: 0 }
