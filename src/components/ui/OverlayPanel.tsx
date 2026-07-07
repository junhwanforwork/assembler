"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { clsx } from "clsx"
import { IconButton } from "./Button"
import { CloseIcon } from "./icons"
import {
  OVERLAY_FOCUSABLE,
  exitDurationMs,
  isBackdropDismiss,
  nextPhase,
  resolveFocusTrap,
  shouldCloseOnEscape,
  type OverlayPhase,
} from "./overlayPanelRules"
import s from "./OverlayPanel.module.css"

// 오버레이 창 프리미티브(ASM-055) — 클로드 데스크톱식 "열고 닫는 임시 창".
// Modal과의 역할 구분: Modal은 차단형(작업 완료를 요구), OverlayPanel은 비차단 참조 창
// (열어두고 보다가 닫는다). 백드롭·Esc·포커스 트랩·포커스 복원·스크롤 잠금 규칙은 Modal과 동일.
// - side="right": 우측 슬라이드오버(옛 ActivitySlideover 형태)
// - variant="window": 중앙 떠 있는 창 — --shadow-overlay(4단)·scale+fade 등장
// Modal과 달리 open prop을 받는 이유: 퇴장 애니메이션 동안 마운트를 유지해야 해서(조건부 마운트로는 불가).
// ⚠️ 클라이언트 전용 — 열릴 때 document를 읽으므로 인터랙션 이후에만 open을 켠다(서버 프리렌더 경로 금지).

export function OverlayPanel({
  open,
  onClose,
  title,
  titleId,
  meta,
  footer,
  side = "right",
  variant,
  closeLabel = "닫기",
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  // aria-labelledby 대상 id — 소비처가 고정 id를 주면 e2e·접근성 셀렉터가 안정된다.
  titleId: string
  // 제목 옆 보조 라벨 슬롯(스코프 표기 등 — "· 전체 프로덕트")
  meta?: ReactNode
  footer?: ReactNode
  side?: "right"
  variant?: "window"
  closeLabel?: string
  children: ReactNode
}) {
  void side // 현재 우측뿐 — 값 확장(left 등) 대비 API만 고정
  const panelRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<OverlayPhase>("closed")
  const [restoreTarget, setRestoreTarget] = useState<HTMLElement | null>(null)

  // open 전이 → 위상 보정(React 파생 상태 패턴 — 렌더 중 자기 상태 setState). 전이는 전부 nextPhase.
  // effect로 미루지 않는 이유: 복원 대상 캡처가 effect 시점엔 늦다(자식 autoFocus가
  // 커밋 중 포커스를 먼저 내부로 옮긴다 — Modal과 같은 이유).
  if (open && phase !== "open") {
    setPhase(nextPhase(phase, "open"))
    if (phase === "closed" && typeof document !== "undefined") {
      setRestoreTarget(document.activeElement instanceof HTMLElement ? document.activeElement : null)
    }
  }
  if (!open && phase === "open") setPhase(nextPhase(phase, "close"))

  // closing → closed: 등장과 대칭인 퇴장 시간 뒤 언마운트.
  // 모션 감소 선호면 0ms 타이머 — 다음 틱에 즉시 언마운트(effect 동기 setState 금지 규칙 준수).
  useEffect(() => {
    if (phase !== "closing") return
    const ms = exitDurationMs(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    const timer = setTimeout(() => setPhase((p) => nextPhase(p, "exit-timer")), ms)
    return () => clearTimeout(timer)
  }, [phase])

  const mounted = phase !== "closed"

  // 열릴 때: 자식 autoFocus가 이미 잡았으면 존중, 아니면 첫 포커스 가능 요소로.
  useEffect(() => {
    if (phase !== "open") return
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) {
      ;(panel.querySelector<HTMLElement>(OVERLAY_FOCUSABLE) ?? panel).focus()
    }
  }, [phase])

  // 완전히 닫힐 때(또는 열린 채 언마운트) 열기 전 포커스로 복원 — 키보드 사용자의 위치 보존.
  // restoreTarget은 닫힌 상태에서 열릴 때만 바뀌므로 열려 있는 동안 이 effect는 재실행되지 않는다.
  useEffect(() => {
    if (!mounted) return
    return () => restoreTarget?.focus()
  }, [mounted, restoreTarget])

  // 떠 있는 동안 body 스크롤 잠금.
  useEffect(() => {
    if (!mounted) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mounted])

  // Esc 닫기 + Tab 포커스 트랩 — 퇴장 중(closing)에는 상호작용 없음.
  useEffect(() => {
    if (phase !== "open") return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldCloseOnEscape(e.key, e.isComposing)) {
        onClose()
        return
      }
      if (e.key !== "Tab") return
      const panel = panelRef.current
      if (!panel) return
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(OVERLAY_FOCUSABLE))
      const active = document.activeElement
      const insideIndex = active instanceof HTMLElement && panel.contains(active) ? focusables.indexOf(active) : -1
      const resolution = resolveFocusTrap({
        shiftKey: e.shiftKey,
        focusableCount: focusables.length,
        activeIndex: insideIndex === -1 ? null : insideIndex,
      })
      if (resolution.kind === "none") return
      e.preventDefault()
      if (resolution.kind === "panel") panel.focus()
      else focusables[resolution.index].focus()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [phase, onClose])

  const mouseDownOnBackdrop = useRef(false)

  if (!mounted) return null

  const isWindow = variant === "window"

  return createPortal(
    <div
      className={clsx(s.backdrop, isWindow ? s.backdropWindow : s.backdropRight, phase === "closing" && s.closing)}
      onMouseDown={(e) => {
        mouseDownOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (phase === "open" && isBackdropDismiss(e.target === e.currentTarget, mouseDownOnBackdrop.current)) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={isWindow ? s.window : s.panelRight}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={s.head}>
          <span id={titleId} className={s.title}>
            {title}
          </span>
          {meta !== undefined && <span className={s.meta}>{meta}</span>}
          <IconButton label={closeLabel} className={s.closeBtn} onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        <div className={s.body}>{children}</div>

        {footer !== undefined && <div className={s.foot}>{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
