"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import styles from "./floating.module.css"
import { computeFloatingPosition } from "./floating"

interface PopoverProps {
  open: boolean
  onClose: () => void
  content: ReactNode
  width?: number
  // dialog의 접근 가능한 이름 — 시각 제목이 없는 패널이면 필수.
  "aria-label"?: string
  // 앵커 — 여는 트리거를 children으로 감싼다. 열기 상태는 호출부 소유(controlled).
  children: ReactNode
}

// 앵커에 붙는 인터랙티브 플로팅 패널. Esc·바깥 클릭으로 닫힌다.
// hover 설명은 Tooltip, 화면 중앙 차단형은 모달 패턴을 쓴다.
export function Popover({ open, onClose, content, width = 264, "aria-label": ariaLabel, children }: PopoverProps) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const panelNodeRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  // 패널 마운트 시 실측해 위치 확정(콜백 ref) — 측정 전 프레임은 hidden으로 깜빡임 방지.
  const panelRef = useCallback((node: HTMLDivElement | null) => {
    panelNodeRef.current = node
    if (!node) {
      setPos(null)
      return
    }
    const anchor = anchorRef.current?.getBoundingClientRect()
    if (anchor) setPos(computeFloatingPosition(anchor, node.getBoundingClientRect()))
  }, [])

  // 떠 있는 동안 스크롤·리사이즈를 따라 재배치 — 고정 좌표 고착 방지.
  useEffect(() => {
    if (!open) return
    const update = () => {
      const anchor = anchorRef.current?.getBoundingClientRect()
      const panel = panelNodeRef.current?.getBoundingClientRect()
      if (anchor && panel) setPos(computeFloatingPosition(anchor, panel))
    }
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (!anchorRef.current?.contains(target) && !panelNodeRef.current?.contains(target)) onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("pointerdown", onPointerDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("pointerdown", onPointerDown)
    }
  }, [open, onClose])

  return (
    <span ref={anchorRef} className={styles.anchor}>
      {children}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={ariaLabel}
          className={styles.surface}
          style={{ width, left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
        >
          {content}
        </div>
      )}
    </span>
  )
}
