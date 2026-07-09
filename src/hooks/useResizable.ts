"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react"

// 좌측 도킹 패널 폭 조절 프리미티브(ASM-076) — 포인터 드래그로 폭을 clamp 범위 안에서 조절한다.
// 순수 계산(clampWidth·nextWidthFromDrag)은 DOM 없이 검증 가능하게 분리 — 훅은 배선만 얹는다.

// 프롬프트 좌측 도킹 폭 범위(px) — 좁으면 대화가 답답하고 넓으면 캔버스를 잡아먹는다.
export const PROMPT_DOCK_MIN = 280
export const PROMPT_DOCK_MAX = 400
// 키보드(화살표) 한 스텝 폭 — separator 접근성(포커스만 되고 조작 불가 회피).
export const RESIZE_KEY_STEP = 16

export function clampWidth(width: number, min: number, max: number): number {
  if (width < min) return min
  if (width > max) return max
  return width
}

// 드래그 시작 시점의 폭(startWidth)에 포인터 이동량(deltaX)을 누적해 새 폭을 낸다.
// 좌측 패널의 우측 그립: 오른쪽으로 끌면(deltaX>0) 넓어진다.
export function nextWidthFromDrag(startWidth: number, deltaX: number, min: number, max: number): number {
  return clampWidth(startWidth + deltaX, min, max)
}

type ResizableOptions = {
  initialWidth: number
  min: number
  max: number
  // 드래그가 끝났을 때 확정 폭을 알린다(예: store 저장). 매 프레임이 아니라 커밋 시점 1회.
  onCommit?: (width: number) => void
}

type ResizeHandleProps = {
  onPointerDown: (e: ReactPointerEvent) => void
  onKeyDown: (e: ReactKeyboardEvent) => void
  role: "separator"
  "aria-orientation": "vertical"
  "aria-valuenow": number
  "aria-valuemin": number
  "aria-valuemax": number
  tabIndex: number
}

export function useResizable({ initialWidth, min, max, onCommit }: ResizableOptions): {
  width: number
  isDragging: boolean
  handleProps: ResizeHandleProps
} {
  const [width, setWidth] = useState(() => clampWidth(initialWidth, min, max))
  const [isDragging, setIsDragging] = useState(false)
  // 드래그 세션의 시작 좌표·폭. 렌더 사이에 살아남아야 해서 ref.
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  // 커밋 콜백에 넘길 최신 폭 — state 클로저 지연을 피한다.
  const widthRef = useRef(width)
  const moveRef = useRef<((e: PointerEvent) => void) | null>(null)
  const upRef = useRef<(() => void) | null>(null)

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const next = nextWidthFromDrag(drag.startWidth, e.clientX - drag.startX, min, max)
      widthRef.current = next
      setWidth(next)
    },
    [min, max],
  )

  const endDrag = useCallback(() => {
    if (!dragRef.current) return
    dragRef.current = null
    setIsDragging(false)
    if (moveRef.current) window.removeEventListener("pointermove", moveRef.current)
    if (upRef.current) window.removeEventListener("pointerup", upRef.current)
    moveRef.current = null
    upRef.current = null
    onCommit?.(widthRef.current)
  }, [onCommit])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      // 텍스트 선택·기본 드래그 억제 — 리사이즈 중 커서가 텍스트를 훑지 않게.
      e.preventDefault()
      dragRef.current = { startX: e.clientX, startWidth: widthRef.current }
      setIsDragging(true)
      moveRef.current = onPointerMove
      upRef.current = endDrag
      window.addEventListener("pointermove", onPointerMove)
      window.addEventListener("pointerup", endDrag)
    },
    [onPointerMove, endDrag],
  )

  // 키보드 조작 — 좌우 화살표로 한 스텝씩. separator가 포커스만 되고 조작 불가한 a11y 갭 해소.
  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
      e.preventDefault()
      const delta = e.key === "ArrowRight" ? RESIZE_KEY_STEP : -RESIZE_KEY_STEP
      const next = clampWidth(widthRef.current + delta, min, max)
      widthRef.current = next
      setWidth(next)
      onCommit?.(next)
    },
    [min, max, onCommit],
  )

  // 드래그 중 언마운트 시 리스너 누수 방지.
  useEffect(() => {
    return () => {
      if (moveRef.current) window.removeEventListener("pointermove", moveRef.current)
      if (upRef.current) window.removeEventListener("pointerup", upRef.current)
    }
  }, [])

  return {
    width,
    isDragging,
    handleProps: {
      onPointerDown,
      onKeyDown,
      role: "separator",
      "aria-orientation": "vertical",
      "aria-valuenow": width,
      "aria-valuemin": min,
      "aria-valuemax": max,
      tabIndex: 0,
    },
  }
}
