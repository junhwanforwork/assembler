"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { clsx } from "clsx"
import styles from "./floating.module.css"
import { computeFloatingPosition } from "./floating"

interface TooltipProps {
  content: ReactNode
  width?: number
  children: ReactNode
}

// hover/focus로 뜨는 비인터랙티브 설명 서피스 (프로토타입 .er-tip).
// 클릭으로 열고 닫는 인터랙티브 패널은 Popover를 쓴다.
export function Tooltip({ content, width = 264, children }: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const panelNodeRef = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  // 래퍼 span이 아니라 실제 자식 요소를 잰다 — 자식이 absolute 배치(ER 노드)면 span은 0-크기라 좌표가 어긋난다.
  const measureAnchor = useCallback(
    () => (anchorRef.current?.firstElementChild ?? anchorRef.current)?.getBoundingClientRect(),
    [],
  )

  // 패널 마운트 시 실측해 위치 확정(콜백 ref) — 측정 전 프레임은 hidden으로 깜빡임 방지.
  const panelRef = useCallback(
    (node: HTMLDivElement | null) => {
      panelNodeRef.current = node
      if (!node) {
        setPos(null)
        return
      }
      const anchor = measureAnchor()
      if (anchor) setPos(computeFloatingPosition(anchor, node.getBoundingClientRect()))
    },
    [measureAnchor],
  )

  // 떠 있는 동안 스크롤·리사이즈를 따라 재배치 — 고정 좌표 고착 방지.
  useEffect(() => {
    if (!visible) return
    const update = () => {
      const anchor = measureAnchor()
      const panel = panelNodeRef.current?.getBoundingClientRect()
      if (anchor && panel) setPos(computeFloatingPosition(anchor, panel))
    }
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [visible, measureAnchor])

  return (
    <span
      ref={anchorRef}
      className={styles.anchor}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          ref={panelRef}
          role="tooltip"
          className={clsx(styles.surface, styles.tooltip)}
          style={{ width, left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
        >
          {content}
        </div>
      )}
    </span>
  )
}
