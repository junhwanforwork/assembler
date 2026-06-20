"use client"

import { useRef, useState, type CSSProperties, type FC, type PointerEvent as ReactPointerEvent } from "react"
import type { Page, ProjectGraph } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { incompleteCount } from "@/lib/graph/selectors"
import { COLOR, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { frameWidth, frameHeight } from "./canvas-geometry"
import { useCanvas } from "./canvas-context"
import { PageFrame } from "./PageFrame"
import { CanvasDescription } from "./CanvasDescription"

const DRAG_THRESHOLD = 4
const TITLE_HEIGHT = 44

// 와이어프레임 보드 — 페이지당 바깥 frame 1개: 제목 1개(page.name + ⚠N + device) + 본문 [화면 | (선택 시) Description].
// 제목·드래그·선택을 보드가 소유한다 → 화면 헤더·Description 헤더의 페이지명 중복 제거(ASS-079).
// InfiniteCanvas 변환 레이어 안 absolute(page.x/y) — 줌/팬에 같이 움직인다.
export const WireframeBoard: FC<{ page: Page; graph: ProjectGraph }> = ({ page, graph }) => {
  const selectedPageId = useGraphStore((s) => s.selectedPageId)
  const selectedElementId = useGraphStore((s) => s.selectedElementId)
  const selectPage = useGraphStore((s) => s.selectPage)
  const movePage = useGraphStore((s) => s.movePage)
  const { zoom, focusBounds } = useCanvas()

  const active = selectedPageId === page.id
  const selected = active && selectedElementId === null
  const incomplete = incompleteCount(graph, page.id)

  const [offset, setOffset] = useState<{ dx: number; dy: number } | null>(null)
  const movedRef = useRef(0)

  const width = frameWidth(page)
  // 선택된 페이지만 Description 컬럼을 펼친다(비선택 페이지=노이즈↓).
  const showDescription = active

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

  const onFocus = () =>
    focusBounds({ x: page.x, y: page.y, width: width + (showDescription ? 360 : 0), height: TITLE_HEIGHT + frameHeight(page) })

  return (
    <div
      style={{
        ...BOARD,
        left: page.x,
        top: page.y,
        transform: offset ? `translate3d(${offset.dx}px, ${offset.dy}px, 0)` : undefined,
        zIndex: offset ? 10 : undefined,
        outline: selected ? `2px solid ${COLOR.ACCENT}` : `1px solid ${COLOR.BORDER_DEFAULT}`,
      }}
    >
      <header onPointerDown={onHeaderPointerDown} onDoubleClick={onFocus} style={HEADER}>
        <span style={TITLE}>{page.name}</span>
        <span style={DEVICE}>{page.device}</span>
        {incomplete > 0 ? (
          <span style={WARN}>
            <span aria-hidden>⚠</span> {incomplete}
          </span>
        ) : null}
      </header>
      <div style={BODY}>
        <PageFrame page={page} graph={graph} active={active} />
        {showDescription ? <CanvasDescription page={page} graph={graph} /> : null}
      </div>
    </div>
  )
}

const BOARD: CSSProperties = {
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
  height: TITLE_HEIGHT,
  padding: `0 ${SPACING["4"]}`,
  borderBottom: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SECTION,
  cursor: "grab",
}

const TITLE: CSSProperties = { ...TYPOGRAPHY.STYLE.TITLE_2, color: COLOR.TEXT_PRIMARY, flex: 1, minWidth: 0 }
const DEVICE: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }
const WARN: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.WARNING,
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
}

// 본문 = [화면 | Description] 가로 배치. 화면 폭은 device, Description은 고정 컬럼. 같은 보드 한 테두리.
const BODY: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "stretch",
}
