"use client"

import { type FC, type CSSProperties, useEffect, useRef } from "react"
import { Button } from "@/components/ui"
import { COLOR, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { OAuthButtons } from "./OAuthButtons"

// 가치 포착 게이트 — 익명 사용자가 공유·내보내기를 시도할 때 "방금 만든 걸 보관" 프레이밍으로 가입 유도.
// 닫아도 익명 작업은 그대로 유지된다(데이터 손실 없음) — 협박이 아니라 보관 제안.
interface AuthGateModalProps {
  open: boolean
  onClose: () => void
  next?: string
}

export const AuthGateModal: FC<AuthGateModalProps> = ({ open, onClose, next }) => {
  const cardRef = useRef<HTMLDivElement>(null)

  // 열렸을 때만: Esc로 닫기 + 다이얼로그로 초기 포커스 이동 후 닫힐 때 직전 포커스 복원.
  // (aria-modal 약속을 지키려 포커스를 다이얼로그 안으로 들인다. effect 본문 setState 없음 — onClose는 prop.)
  useEffect(() => {
    if (!open) return
    const prevFocused = document.activeElement as HTMLElement | null
    cardRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      prevFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div style={BACKDROP_STYLE} role="dialog" aria-modal="true" aria-label="계정에 보관하기" onClick={onClose}>
      <div ref={cardRef} tabIndex={-1} style={CARD_STYLE} onClick={(e) => e.stopPropagation()}>
        <div style={INTRO_STYLE}>
          <h2 style={{ ...TYPOGRAPHY.STYLE.H3, color: COLOR.TEXT_PRIMARY, margin: 0 }}>
            방금 만든 설계를 계정에 보관해요
          </h2>
          <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY, margin: 0 }}>
            가입하면 이 프로젝트가 그대로 옮겨가고, 어디서나 이어서 작업할 수 있어요.
          </p>
        </div>
        <OAuthButtons next={next} />
        <Button variant="neutral" size="md" className="w-full" onClick={onClose}>
          닫기
        </Button>
      </div>
    </div>
  )
}

const BACKDROP_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: SPACING["4"],
  backgroundColor: COLOR.BG_OVERLAY,
}

const CARD_STYLE: CSSProperties = {
  width: "100%",
  maxWidth: "400px",
  display: "flex",
  flexDirection: "column",
  gap: SPACING["5"],
  padding: SPACING["6"],
  borderRadius: RADIUS.LG,
  backgroundColor: COLOR.PANEL_BG,
  boxShadow: SHADOW.MODAL,
}

const INTRO_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["2"],
}
