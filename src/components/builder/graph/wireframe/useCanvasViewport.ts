"use client"

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { type Bounds, type Viewport, fitViewport, zoomAtPoint } from "./canvas-geometry"

// 무한 캔버스 뷰포트(pan/zoom) — 로컬 state + ref, store 미반영(표현 전용).
// 트랙패드 스크롤=팬 · Cmd/Ctrl+휠=커서중심 줌 · 빈 공간 드래그=팬 · 리셋/핏.
export function useCanvasViewport() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewport, setViewport] = useState<Viewport>({ pan: { x: 0, y: 0 }, zoom: 1 })
  const vpRef = useRef(viewport)
  useEffect(() => {
    vpRef.current = viewport
  }, [viewport])

  // wheel은 preventDefault 위해 non-passive 수동 등록(React onWheel은 passive).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.0015)
        setViewport((v) => zoomAtPoint(v, factor, e.clientX - rect.left, e.clientY - rect.top))
      } else {
        setViewport((v) => ({ ...v, pan: { x: v.pan.x - e.deltaX, y: v.pan.y - e.deltaY } }))
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  // 빈 공간 드래그 팬 — 프레임은 pointerdown에서 stopPropagation 하므로 여기 도달 = 배경.
  const startPan = useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0) return
    const startX = e.clientX
    const startY = e.clientY
    const origin = vpRef.current.pan
    const onMove = (ev: PointerEvent) => {
      setViewport((v) => ({
        ...v,
        pan: { x: origin.x + (ev.clientX - startX), y: origin.y + (ev.clientY - startY) },
      }))
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }, [])

  const zoomBy = useCallback((factor: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setViewport((v) => zoomAtPoint(v, factor, rect.width / 2, rect.height / 2))
  }, [])

  const reset = useCallback(() => setViewport({ pan: { x: 0, y: 0 }, zoom: 1 }), [])

  const fit = useCallback((bounds: Bounds) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setViewport(fitViewport(bounds, rect.width, rect.height))
  }, [])

  return { containerRef, viewport, startPan, zoomBy, reset, fit }
}
