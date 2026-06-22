"use client"

import { memo, useRef, useState, type CSSProperties, type FC, type PointerEvent as ReactPointerEvent } from "react"
import type { Page } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { COLOR, RADIUS, SHADOW, SPACING, TYPOGRAPHY, DURATION, EASE } from "@/lib/design-tokens"
import { useCanvas } from "../../wireframe/canvas-context"
import { SNODE_W, SNODE_H } from "./structure-geometry"

// 드래그/클릭 구분 임계값(px). 이 거리 미만이면 클릭으로 간주한다.
const DRAG_THRESHOLD = 4

interface StructureNodeProps {
  page: Page
  /** 대표 Feature 라벨(IA 그룹 표시). */
  featureLabel: string
  /** 매핑 미완성 요소 수(⚠ 배지). */
  incomplete: number
  isActive: boolean
  isHovered: boolean
  onHover: (pageId: string | null) => void
  // 드래그 중 위치(절대 좌표) 보고 — 부모가 엣지를 라이브로 따라가게 한다. store는 안 건드린다.
  onDragMove: (pageId: string, x: number, y: number) => void
  // 드롭 시 1회 — 부모가 movePage로 store에 커밋.
  onDragEnd: (pageId: string, x: number, y: number) => void
}

// memo — 한 노드를 드래그/hover해도 나머지 노드는 props가 그대로라 재렌더하지 않는다.
const StructureNodeImpl: FC<StructureNodeProps> = ({
  page,
  featureLabel,
  incomplete,
  isActive,
  isHovered,
  onHover,
  onDragMove,
  onDragEnd,
}) => {
  const selectNode = useGraphStore((s) => s.selectNode)
  // 캔버스 줌 — 드래그 델타를 world 단위로 보정(/zoom)한다. CSS scale이 걸린 레이어 안이라 필수.
  const { zoom } = useCanvas()

  const [dragging, setDragging] = useState(false)
  // 드래그 변위(px) — transform으로만 적용해 reflow 없이 합성 이동. store는 드롭 시 1회.
  const [offset, setOffset] = useState<{ dx: number; dy: number } | null>(null)
  const movedRef = useRef(0)
  const startRef = useRef({ px: 0, py: 0, x: 0, y: 0 })

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.stopPropagation()
    movedRef.current = 0
    startRef.current = { px: e.clientX, py: e.clientY, x: page.x, y: page.y }
    setDragging(true)

    const compute = (ev: PointerEvent) => {
      const rawDx = ev.clientX - startRef.current.px
      const rawDy = ev.clientY - startRef.current.py
      // 임계값은 화면 px(줌 무관), 위치는 world px(줌 보정).
      movedRef.current = Math.max(movedRef.current, Math.hypot(rawDx, rawDy))
      return {
        nx: Math.max(0, startRef.current.x + rawDx / zoom),
        ny: Math.max(0, startRef.current.y + rawDy / zoom),
      }
    }

    const onMove = (ev: PointerEvent) => {
      const { nx, ny } = compute(ev)
      setOffset({ dx: nx - startRef.current.x, dy: ny - startRef.current.y })
      onDragMove(page.id, nx, ny)
    }

    const cleanup = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onCancel)
      setDragging(false)
      setOffset(null)
    }

    const onUp = (ev: PointerEvent) => {
      cleanup()
      if (movedRef.current >= DRAG_THRESHOLD) {
        const { nx, ny } = compute(ev)
        onDragEnd(page.id, nx, ny)
      } else {
        // 거의 안 움직였으면 클릭 → 통합 선택(트리·화면 뷰 동기).
        selectNode("page", page.id)
      }
    }

    // 터치·펜 제스처 취소 시 stuck 방지 — 커밋 없이 상태만 되돌린다(부모 drag 라이브도 해제됨).
    const onCancel = () => {
      cleanup()
      onDragEnd(page.id, startRef.current.x, startRef.current.y)
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onCancel)
  }

  const borderColor = isActive ? COLOR.ACCENT : isHovered ? COLOR.BORDER_STRONG : COLOR.BORDER_DEFAULT

  return (
    <div
      onPointerDown={handlePointerDown}
      onMouseEnter={() => onHover(page.id)}
      onMouseLeave={() => onHover(null)}
      role="button"
      tabIndex={0}
      aria-label={`${page.name} 화면 열기`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          selectNode("page", page.id)
        }
      }}
      style={{
        position: "absolute",
        left: page.x,
        top: page.y,
        width: SNODE_W,
        minHeight: SNODE_H,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: `${SPACING["2"]} ${SPACING["3"]}`,
        borderRadius: RADIUS.MD,
        backgroundColor: COLOR.BG_SURFACE,
        border: `1.5px solid ${borderColor}`,
        boxShadow: isActive ? SHADOW.CARD_HOVER : SHADOW.CARD,
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
        // 드래그 중에는 transform으로만 이동(left/top 미변경 → reflow 없음). 드래그 노드는 위로.
        transform: offset ? `translate3d(${offset.dx}px, ${offset.dy}px, 0)` : undefined,
        zIndex: dragging ? 10 : undefined,
        transition: dragging
          ? "none"
          : `border-color ${DURATION.FAST} ${EASE.DEFAULT}, box-shadow ${DURATION.BASE} ${EASE.DEFAULT}`,
      }}
    >
      <div style={ROW}>
        <span style={NAME}>{page.name}</span>
        {incomplete > 0 ? (
          <span aria-label={`매핑 미완성 ${incomplete}개`} style={WARN}>
            <span aria-hidden>⚠</span> {incomplete}
          </span>
        ) : null}
      </div>
      <span style={FEATURE}>{featureLabel}</span>
    </div>
  )
}

export const StructureNode = memo(StructureNodeImpl)

const ROW: CSSProperties = { display: "flex", alignItems: "center", gap: SPACING["1"] }

const NAME: CSSProperties = {
  ...TYPOGRAPHY.STYLE.BODY_2,
  fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD,
  color: COLOR.TEXT_PRIMARY,
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}

const WARN: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.WARNING,
  marginLeft: "auto",
  flexShrink: 0,
}

const FEATURE: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.TEXT_MUTED,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}
