"use client"

import { useState, type FC, type CSSProperties } from "react"
import { COLOR, INTERACTION, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"

// 빈 입력창 앞에서 "무엇을 적어야 할지" 막막함을 줄이는 시작 예시 칩 — 클릭하면 입력창을 채운다.
// 칩은 CTA(동사+하기)가 아니라 입력 프리필 어포던스라 Button 컴포넌트가 아닌 칩 패턴으로 둔다(토큰만 사용).
const SUGGESTIONS = ["러닝 크루 모임 앱", "중고 거래 플랫폼", "사내 경비 정산 툴"] as const

interface HeroSuggestionsProps {
  onPick: (suggestion: string) => void
  disabled: boolean
}

export const HeroSuggestions: FC<HeroSuggestionsProps> = ({ onPick, disabled }) => (
  <div style={WRAP_STYLE} role="group" aria-label="아이디어 예시">
    {SUGGESTIONS.map((suggestion) => (
      <Chip key={suggestion} label={suggestion} disabled={disabled} onClick={() => onPick(suggestion)} />
    ))}
  </div>
)

const Chip: FC<{ label: string; disabled: boolean; onClick: () => void }> = ({ label, disabled, onClick }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...CHIP_STYLE,
        backgroundColor: hovered && !disabled ? COLOR.BG_SURFACE : COLOR.BG_SECTION,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  )
}

const WRAP_STYLE: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: SPACING["2"],
}

const CHIP_STYLE: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_1,
  color: COLOR.TEXT_SECONDARY,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  borderRadius: RADIUS.PILL,
  padding: `${SPACING["2"]} ${SPACING["4"]}`,
  transition: INTERACTION.TRANSITION_BG,
}
