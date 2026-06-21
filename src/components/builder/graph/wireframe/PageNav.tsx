"use client"

import { type CSSProperties, type FC } from "react"
import type { Page } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY, INTERACTION } from "@/lib/design-tokens"

// 페이지 prev/next — 현재 페이지 인덱스 기준 인접 페이지로 selectNode("page"). 트리 선택과 동기.
// 1개면 양쪽 비활성. 보드 제목 줄 우측에 작게 배치.
export const PageNav: FC<{ pages: Page[]; currentId: string }> = ({ pages, currentId }) => {
  const selectNode = useGraphStore((s) => s.selectNode)
  const index = pages.findIndex((p) => p.id === currentId)
  const prev = index > 0 ? pages[index - 1] : null
  const next = index >= 0 && index < pages.length - 1 ? pages[index + 1] : null

  return (
    <div style={WRAP}>
      <NavButton label="이전 화면" disabled={!prev} onClick={() => prev && selectNode("page", prev.id)}>
        ←
      </NavButton>
      <span style={COUNTER}>
        {index + 1} / {pages.length}
      </span>
      <NavButton label="다음 화면" disabled={!next} onClick={() => next && selectNode("page", next.id)}>
        →
      </NavButton>
    </div>
  )
}

const NavButton: FC<{ label: string; disabled: boolean; onClick: () => void; children: string }> = ({
  label,
  disabled,
  onClick,
  children,
}) => (
  <button
    type="button"
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    style={{
      ...BTN,
      color: disabled ? COLOR.TEXT_DISABLED : COLOR.TEXT_SECONDARY,
      cursor: disabled ? "default" : "pointer",
    }}
    onMouseEnter={(e) => {
      if (!disabled) e.currentTarget.style.backgroundColor = INTERACTION.HOVER_BG_SURFACE
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = "transparent"
    }}
  >
    {children}
  </button>
)

const WRAP: CSSProperties = { display: "inline-flex", alignItems: "center", gap: SPACING["1"] }

const BTN: CSSProperties = {
  width: 28,
  height: 28,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: RADIUS.MD,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: "transparent",
  ...TYPOGRAPHY.STYLE.LABEL_1,
  transition: INTERACTION.TRANSITION_BG,
}

const COUNTER: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED, padding: `0 ${SPACING["1"]}` }
