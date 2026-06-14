"use client"

import { useState, type CSSProperties, type FC } from "react"
import { COLOR, RADIUS, INTERACTION } from "@/lib/design-tokens"

// 카드·행 인라인 삭제 어포던스. 아이콘 전용이라 raw button + aria-label (button.md 아이콘 전용 예외).
export const InlineDeleteButton: FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...BASE,
        color: hover ? COLOR.NEGATIVE : COLOR.TEXT_MUTED,
        backgroundColor: hover ? COLOR.NEGATIVE_BG : "transparent",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  )
}

const BASE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  padding: 0,
  border: "none",
  borderRadius: RADIUS.MD,
  cursor: "pointer",
  flexShrink: 0,
  transition: INTERACTION.TRANSITION_BG,
}
