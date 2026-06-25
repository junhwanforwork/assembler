"use client"

import { memo, useRef, useState, type FC, type PointerEvent as ReactPointerEvent } from "react"
import type { Screen } from "@/lib/types/builder"
import { useBuilderStore } from "@/lib/store/builder"
import { COLOR, RADIUS, SHADOW, DURATION, EASE } from "@/lib/design-tokens"
import { startProbe, endProbe } from "@/lib/perf/frame-monitor"
import { NODE_W, NODE_H } from "./flow-layout"

// 드래그/클릭 구분 임계값(px). 이 거리 미만으로 움직이면 클릭으로 간주한다.
const DRAG_THRESHOLD = 4

interface ScreenNodeProps {
  screen: Screen
  isActive: boolean
  isHovered: boolean
  // 연결 모드 시작 — 연결 핸들(+)에서 pointer down 시 호출. 클라이언트 좌표를 넘긴다.
  onConnectStart: (sourceId: string, clientX: number, clientY: number) => void
  onHover: (screenId: string | null) => void
  // 드래그 중 위치(절대 좌표) 보고 — 부모가 엣지를 라이브로 따라가게 한다. store는 건드리지 않는다.
  onDragMove: (screenId: string, x: number, y: number) => void
  // 드롭 시 1회 — 부모가 moveScreen으로 store에 커밋한다.
  onDragEnd: (screenId: string, x: number, y: number) => void
}

// memo — 한 노드를 드래그/hover해도 나머지 노드는 props가 그대로라 재렌더하지 않는다.
const ScreenNodeImpl: FC<ScreenNodeProps> = ({
  screen,
  isActive,
  isHovered,
  onConnectStart,
  onHover,
  onDragMove,
  onDragEnd,
}) => {
  const selectScreen = useBuilderStore((s) => s.selectScreen)
  const setView = useBuilderStore((s) => s.setView)

  const [dragging, setDragging] = useState(false)
  // 드래그 중 노드 변위(px). transform으로만 적용해 reflow 없이 합성(composite)으로 이동한다.
  // store는 드롭 시 1회만 갱신한다(매 프레임 글로벌 쓰기 제거).
  const [offset, setOffset] = useState<{ dx: number; dy: number } | null>(null)
  // 드래그 중 누적 이동 거리 — 임계값 미만이면 onPointerUp을 클릭으로 처리한다.
  const movedRef = useRef(0)
  // pointer down 시점의 커서·노드 좌표 스냅샷.
  const startRef = useRef({ pointerX: 0, pointerY: 0, screenX: 0, screenY: 0 })

  function handleBodyPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.stopPropagation()
    movedRef.current = 0
    startRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      screenX: screen.x,
      screenY: screen.y,
    }
    setDragging(true)
    startProbe("flow-drag") // perf: 드래그 구간 프레임 프로브(플래그 off면 no-op)

    const compute = (ev: PointerEvent) => {
      const dx = ev.clientX - startRef.current.pointerX
      const dy = ev.clientY - startRef.current.pointerY
      movedRef.current = Math.max(movedRef.current, Math.hypot(dx, dy))
      const nextX = Math.max(0, startRef.current.screenX + dx)
      const nextY = Math.max(0, startRef.current.screenY + dy)
      return { nextX, nextY }
    }

    const onMove = (ev: PointerEvent) => {
      const { nextX, nextY } = compute(ev)
      setOffset({ dx: nextX - startRef.current.screenX, dy: nextY - startRef.current.screenY })
      onDragMove(screen.id, nextX, nextY)
    }

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      const moved = movedRef.current >= DRAG_THRESHOLD
      setDragging(false)
      setOffset(null)
      endProbe("flow-drag") // perf: 드래그 프레임 결과 publish — pointercancel에서도 반드시 종료(프로브 누수 방지)
      if (moved) {
        const { nextX, nextY } = compute(ev)
        onDragEnd(screen.id, nextX, nextY)
      } else {
        // 거의 안 움직였으면 클릭 → 해당 화면 편집으로 진입.
        selectScreen(screen.id)
        setView("screen")
      }
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp) // 터치 중단·제스처 탈취 등 → onUp 경유로 endProbe 보장(pan 핸들러와 대칭)
  }

  function handleConnectPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return
    // 연결 핸들은 노드 이동과 분리 — 이벤트 버블링 차단.
    e.stopPropagation()
    e.preventDefault()
    onConnectStart(screen.id, e.clientX, e.clientY)
  }

  const blockCount = screen.blocks.length
  const summary = blockCount > 0 ? `블록 ${blockCount}개` : "아직 블록이 없어요"

  const borderColor = isActive ? COLOR.ACCENT : isHovered ? COLOR.BORDER_STRONG : COLOR.BORDER_DEFAULT

  return (
    <div
      className="flow_screen_node_wrap"
      onPointerDown={handleBodyPointerDown}
      onMouseEnter={() => onHover(screen.id)}
      onMouseLeave={() => onHover(null)}
      role="button"
      tabIndex={0}
      aria-label={`${screen.title} 화면 편집하기`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          selectScreen(screen.id)
          setView("screen")
        }
      }}
      style={{
        position: "absolute",
        left: screen.x,
        top: screen.y,
        width: NODE_W,
        height: NODE_H,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: 16,
        borderRadius: RADIUS.LG,
        backgroundColor: COLOR.BG_BASE,
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
      <span
        style={{
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.01em",
          color: COLOR.TEXT_MUTED,
        }}
      >
        화면
      </span>
      <span
        className="line-clamp-2"
        style={{
          fontSize: "16px",
          fontWeight: 600,
          lineHeight: "22px",
          color: COLOR.TEXT_PRIMARY,
        }}
      >
        {screen.title}
      </span>
      <span style={{ marginTop: "auto", fontSize: "13px", color: COLOR.TEXT_SECONDARY }}>
        {summary}
      </span>

      {/* 연결 핸들 — 오른쪽 중앙. pointer down 시 연결 모드 시작. */}
      <button
        type="button"
        aria-label={`${screen.title}에서 다른 화면으로 연결하기`}
        onPointerDown={handleConnectPointerDown}
        className="flow_connect_handle"
        style={{
          position: "absolute",
          right: -10,
          top: "50%",
          transform: "translateY(-50%)",
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: `1.5px solid ${COLOR.ACCENT}`,
          backgroundColor: COLOR.BG_BASE,
          color: COLOR.ACCENT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          lineHeight: 1,
          cursor: "crosshair",
          touchAction: "none",
          padding: 0,
          opacity: isHovered || isActive ? 1 : 0,
          transition: `opacity ${DURATION.FAST} ${EASE.DEFAULT}`,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M5.5 2v7M2 5.5h7" />
        </svg>
      </button>
    </div>
  )
}

export const ScreenNode = memo(ScreenNodeImpl)
