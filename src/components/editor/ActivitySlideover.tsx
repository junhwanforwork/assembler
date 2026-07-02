"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { Activity } from "@/lib/types/assembler"
import { api } from "@/lib/api/client"
import { errorMessage } from "@/lib/api/messages"
import { Button, IconButton } from "@/components/ui/Button"
import { activityLine, relativeTime } from "./activityCopy"
import { CloseIcon } from "./icons"
import s from "./ActivitySlideover.module.css"

// 활동 타임라인 슬라이드오버(ASM-024, editor-interactions #7) — TopBar 기록 버튼에서 진입.
// ui/Modal은 센터 다이얼로그라 형태만 다르고, 백드롭·Esc·포커스 복원·스크롤 잠금 규칙은 같게 지킨다.
// ⚠️ 클라이언트 전용 — Modal과 동일하게 인터랙션 이후 조건부 마운트로만 쓴다(마운트 = 열림).

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

type FetchState =
  | { kind: "loading" }
  | { kind: "error"; error: unknown }
  | { kind: "ready"; activity: Activity[] }

export function ActivitySlideover({ productId, onClose }: { productId: string; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<FetchState>({ kind: "loading" })
  // 재시도는 attempt 증가로 같은 effect를 다시 태운다 — fetch 경로를 한 곳으로 유지.
  const [attempt, setAttempt] = useState(0)

  const retry = () => {
    setState({ kind: "loading" })
    setAttempt((n) => n + 1)
  }

  useEffect(() => {
    let active = true
    api
      .get<{ activity: Activity[] }>(`/api/products/${productId}/activity`)
      .then((data) => {
        if (active) setState({ kind: "ready", activity: data.activity })
      })
      .catch((err: unknown) => {
        if (active) setState({ kind: "error", error: err })
      })
    return () => {
      active = false
    }
  }, [productId, attempt])

  // 포커스 복원 대상은 렌더 시점에 캡처(Modal과 같은 이유 — effect 시점엔 이미 내부로 이동).
  const [restoreTarget] = useState<HTMLElement | null>(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  )

  useEffect(() => {
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) {
      ;(panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus()
    }
    return () => restoreTarget?.focus()
  }, [restoreTarget])

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
        // isComposing 가드 — 한글 조합 취소 Esc가 패널까지 닫지 않게.
        if (!e.isComposing) onClose()
        return
      }
      if (e.key !== "Tab") return
      const panel = panelRef.current
      if (!panel) return
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusables.length === 0) {
        e.preventDefault()
        panel.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      const isInside = active instanceof HTMLElement && panel.contains(active)
      if (e.shiftKey ? active === first || !isInside : active === last || !isInside) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const isMouseDownOnBackdrop = useRef(false)

  return createPortal(
    <div
      className={s.backdrop}
      onMouseDown={(e) => {
        isMouseDownOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && isMouseDownOnBackdrop.current) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={s.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-slideover-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={s.head}>
          <span id="activity-slideover-title" className={s.title}>
            최근 활동
          </span>
          <IconButton label="기록 닫기" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        <div className={s.body}>
          {state.kind === "loading" && <div className={s.muted}>불러오는 중이에요…</div>}

          {state.kind === "error" && (
            <div>
              <div className={s.muted}>{errorMessage(state.error)}</div>
              <div className={s.retry}>
                <Button variant="ghost" size="sm" onClick={retry}>
                  다시 시도하기
                </Button>
              </div>
            </div>
          )}

          {state.kind === "ready" &&
            (state.activity.length === 0 ? (
              <div className={s.muted}>아직 활동이 없어요. 스펙을 만들고 바꾸면 여기에 쌓여요.</div>
            ) : (
              <ActivityList activity={state.activity} />
            ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

function ActivityList({ activity }: { activity: Activity[] }) {
  // 상대 시간 기준은 목록 렌더 시점 1회 — 항목마다 new Date()를 만들지 않는다.
  const now = new Date()
  return (
    <ol className={s.list}>
      {activity.map((item) => {
        const line = activityLine(item.type, item.metadata)
        return (
          <li key={item.id} className={s.item}>
            <span className={s.dot} aria-hidden />
            <div className={s.itemBody}>
              <div className={s.itemTitle}>{line.title}</div>
              <div className={s.itemMeta}>
                {line.name && <span className={s.itemName}>{line.name}</span>}
                <span>{relativeTime(item.createdAt, now)}</span>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
