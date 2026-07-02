"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import s from "./Modal.module.css"

// 모달 프리미티브 — 백드롭·Esc·포커스 트랩·z-index 토큰을 한 곳에서 강제한다(B-9).
// 열림 여부는 부모가 조건부 렌더로 결정한다(마운트 = 열림). 내용·액션은 children.
// closeDisabled 동안(생성 요청 중 등)은 백드롭·Esc 닫기를 막아 진행 중 작업을 보호한다.

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({
  labelledBy,
  onClose,
  closeDisabled = false,
  children,
}: {
  labelledBy: string
  onClose: () => void
  closeDisabled?: boolean
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // 열릴 때: 자식 autoFocus가 이미 잡았으면 존중, 아니면 첫 포커스 가능 요소로.
  // 닫힐 때: 열기 전 포커스로 복원 — 키보드 사용자의 위치를 잃지 않는다.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) {
      ;(dialog.querySelector<HTMLElement>(FOCUSABLE) ?? dialog).focus()
    }
    return () => previous?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // isComposing 가드 — 한글 조합 취소 Esc가 모달까지 닫지 않게.
        if (!e.isComposing && !closeDisabled) onClose()
        return
      }
      if (e.key !== "Tab") return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusables.length === 0) {
        e.preventDefault()
        dialog.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      const isInside = active instanceof HTMLElement && dialog.contains(active)
      if (e.shiftKey ? active === first || !isInside : active === last || !isInside) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose, closeDisabled])

  return createPortal(
    <div
      className={s.backdrop}
      onClick={() => {
        if (!closeDisabled) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={s.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
