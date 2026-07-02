"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import s from "./Modal.module.css"

// 모달 프리미티브 — 백드롭·Esc·포커스 트랩·z-index 토큰을 한 곳에서 강제한다(B-9).
// 열림 여부는 부모가 조건부 렌더로 결정한다(마운트 = 열림). 내용·액션은 children.
// closeDisabled 동안(생성 요청 중 등)은 백드롭·Esc 닫기를 막아 진행 중 작업을 보호한다.
// ⚠️ 클라이언트 전용 — 렌더 중 document를 읽으므로 인터랙션 이후 조건부 마운트로만 쓴다(서버 프리렌더 경로 금지).

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

  // 복원 대상은 렌더 시점에 캡처 — 자식 autoFocus가 커밋 중 포커스를 먼저 가져가서
  // effect 시점의 activeElement는 이미 모달 내부이기 때문.
  const [restoreTarget] = useState<HTMLElement | null>(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  )

  // 열릴 때: 자식 autoFocus가 이미 잡았으면 존중, 아니면 첫 포커스 가능 요소로.
  // 닫힐 때: 열기 전 포커스로 복원 — 키보드 사용자의 위치를 잃지 않는다.
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) {
      ;(dialog.querySelector<HTMLElement>(FOCUSABLE) ?? dialog).focus()
    }
    return () => restoreTarget?.focus()
  }, [restoreTarget])

  // aria-modal 선언과 실동작 일치 — 열려 있는 동안 뒤 페이지 스크롤 잠금.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
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

  // 백드롭 닫기는 mousedown이 백드롭에서 시작된 경우만 — 다이얼로그 안 텍스트 선택
  // 드래그를 백드롭 위에서 놓을 때 click(공통 조상 발화)으로 닫혀 입력이 유실되지 않게.
  const isMouseDownOnBackdrop = useRef(false)

  return createPortal(
    <div
      className={s.backdrop}
      onMouseDown={(e) => {
        isMouseDownOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && isMouseDownOnBackdrop.current && !closeDisabled) onClose()
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
