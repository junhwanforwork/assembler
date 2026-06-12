"use client"

import { useMemo, useRef, useState, useCallback, type FC } from "react"
import type { Screen } from "@/lib/types/builder"
import { useBuilderStore } from "@/lib/store/builder"
import { COLOR } from "@/lib/design-tokens"
import { canvasBounds, sourceAnchor, NODE_W, NODE_H } from "./flow-layout"
import { ScreenNode } from "./ScreenNode"
import { FlowEdge } from "./FlowEdge"

// 진행 중인 연결의 끝점(캔버스 로컬 좌표).
interface PendingConnection {
  sourceId: string
  x: number
  y: number
}

// clientX/Y → 캔버스 로컬 좌표. 스크롤·오프셋을 보정한다.
function toLocal(rect: DOMRect, scrollLeft: number, scrollTop: number, clientX: number, clientY: number) {
  return { x: clientX - rect.left + scrollLeft, y: clientY - rect.top + scrollTop }
}

// 로컬 좌표가 어느 화면 노드 위에 있는지. 없으면 null.
function screenAtPoint(screens: Screen[], x: number, y: number): Screen | null {
  // 위에 그려진(배열 뒤쪽) 노드가 우선이도록 역순 탐색.
  for (let i = screens.length - 1; i >= 0; i--) {
    const s = screens[i]
    if (x >= s.x && x <= s.x + NODE_W && y >= s.y && y <= s.y + NODE_H) return s
  }
  return null
}

export const FlowCanvas: FC = () => {
  const screens = useBuilderStore((s) => s.screens)
  const flows = useBuilderStore((s) => s.flows)
  const activeScreenId = useBuilderStore((s) => s.activeScreenId)
  const addFlow = useBuilderStore((s) => s.addFlow)
  const moveScreen = useBuilderStore((s) => s.moveScreen)

  const scrollRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const [hoveredScreenId, setHoveredScreenId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingConnection | null>(null)
  // 드래그 중인 노드의 라이브 위치(절대 좌표). 엣지만 따라가게 하는 임시 상태 — store 미반영.
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)

  const handleDragMove = useCallback((id: string, x: number, y: number) => {
    setDrag({ id, x, y })
  }, [])

  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      moveScreen(id, x, y) // 드롭 시 1회만 store에 커밋
      setDrag(null)
    },
    [moveScreen]
  )

  // 드래그 중인 노드는 store 좌표 대신 라이브 좌표로 본다(엣지 끝점 계산용).
  const liveScreen = useCallback(
    (s: Screen): Screen => (drag && drag.id === s.id ? { ...s, x: drag.x, y: drag.y } : s),
    [drag]
  )

  const screenMap = useMemo(() => {
    const m = new Map<string, Screen>()
    for (const s of screens) m.set(s.id, s)
    return m
  }, [screens])

  const bounds = useMemo(() => canvasBounds(screens), [screens])

  const handleConnectStart = useCallback(
    (sourceId: string, clientX: number, clientY: number) => {
      const canvasEl = canvasRef.current
      const scrollEl = scrollRef.current
      if (!canvasEl || !scrollEl) return
      const rect = canvasEl.getBoundingClientRect()

      const updatePending = (cx: number, cy: number) => {
        const local = toLocal(rect, 0, 0, cx, cy)
        setPending({ sourceId, x: local.x, y: local.y })
      }
      updatePending(clientX, clientY)

      const onMove = (ev: PointerEvent) => updatePending(ev.clientX, ev.clientY)

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
        const local = toLocal(rect, 0, 0, ev.clientX, ev.clientY)
        const target = screenAtPoint(useBuilderStore.getState().screens, local.x, local.y)
        // 빈 공간이거나 자기 자신이면 취소(addFlow가 동일 id를 막지만 명시적으로 처리).
        if (target && target.id !== sourceId) addFlow(sourceId, target.id)
        setPending(null)
      }

      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    },
    [addFlow]
  )

  if (screens.length === 0) {
    return (
      <div
        className="flow_empty_area"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backgroundColor: COLOR.BG_SURFACE,
        }}
      >
        <p style={{ fontSize: "15px", color: COLOR.TEXT_SECONDARY, textAlign: "center" }}>
          화면을 추가하면 플로우를 연결할 수 있어요
        </p>
      </div>
    )
  }

  const pendingFrom = pending ? screenMap.get(pending.sourceId) : undefined
  const pendingAnchor = pendingFrom ? sourceAnchor(pendingFrom) : null

  return (
    <div
      ref={scrollRef}
      className="flow_canvas_scroll_area"
      style={{ width: "100%", height: "100%", overflow: "auto", backgroundColor: COLOR.BG_SURFACE }}
    >
      <div
        ref={canvasRef}
        className="flow_canvas_wrap"
        style={{ position: "relative", width: bounds.width, height: bounds.height }}
      >
        {/* 엣지 레이어 — 노드 아래. svg 자체는 pointerEvents none, 인터랙션 요소만 auto. */}
        <svg
          width={bounds.width}
          height={bounds.height}
          style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
        >
          {flows.map((flow) => {
            const source = screenMap.get(flow.sourceScreenId)
            const target = screenMap.get(flow.targetScreenId)
            if (!source || !target) return null
            const highlighted =
              hoveredScreenId === flow.sourceScreenId || hoveredScreenId === flow.targetScreenId
            return (
              <FlowEdge
                key={flow.id}
                flow={flow}
                source={liveScreen(source)}
                target={liveScreen(target)}
                highlighted={highlighted}
              />
            )
          })}

          {/* 진행 중인 연결선 — 커서를 따라간다. */}
          {pending && pendingAnchor ? (
            <line
              x1={pendingAnchor.x}
              y1={pendingAnchor.y}
              x2={pending.x}
              y2={pending.y}
              stroke={COLOR.ACCENT}
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
          ) : null}
        </svg>

        {/* 노드 레이어 */}
        {screens.map((screen) => (
          <ScreenNode
            key={screen.id}
            screen={screen}
            isActive={activeScreenId === screen.id}
            isHovered={hoveredScreenId === screen.id}
            onConnectStart={handleConnectStart}
            onHover={setHoveredScreenId}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>
    </div>
  )
}
