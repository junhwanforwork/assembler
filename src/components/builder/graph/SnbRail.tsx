"use client"

import { type FC, type ReactNode } from "react"
import { useGraphStore, type GraphSection } from "@/lib/store/graph"
import { COLOR, SPACING, RADIUS, TYPOGRAPHY, INTERACTION } from "@/lib/design-tokens"

// 최좌측 아이콘 레일 — 4개 메인 섹션 전환. 선택이 Tab+Canvas 표면을 결정.
const SECTIONS: { id: GraphSection; label: string; icon: ReactNode }[] = [
  { id: "doc", label: "문서", icon: <DocIcon /> },
  { id: "structure", label: "구조", icon: <StructureIcon /> },
  { id: "wireframe", label: "화면", icon: <WireframeIcon /> },
  { id: "apidata", label: "API·데이터", icon: <ApiIcon /> },
]

export const SnbRail: FC = () => {
  const section = useGraphStore((s) => s.section)
  const setSection = useGraphStore((s) => s.setSection)

  return (
    <nav style={RAIL_STYLE} aria-label="섹션">
      {SECTIONS.map((s) => {
        const active = section === s.id
        return (
          <button
            key={s.id}
            type="button"
            aria-label={s.label}
            aria-current={active}
            onClick={() => setSection(s.id)}
            style={{
              ...ITEM_STYLE,
              color: active ? COLOR.ACCENT : COLOR.TEXT_MUTED,
              backgroundColor: active ? COLOR.ACCENT_BG : "transparent",
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.backgroundColor = INTERACTION.HOVER_BG
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.backgroundColor = "transparent"
            }}
          >
            {s.icon}
            <span style={{ ...TYPOGRAPHY.STYLE.LABEL_2, fontSize: "10px" }}>{s.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

const RAIL_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: SPACING["1"],
  width: "64px",
  flexShrink: 0,
  padding: SPACING["2"],
  borderRight: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SURFACE,
}

const ITEM_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  padding: `${SPACING["2"]} 0`,
  border: "none",
  borderRadius: RADIUS.MD,
  cursor: "pointer",
  transition: INTERACTION.TRANSITION_BG,
}

// 단순 라인 아이콘 — stroke=currentColor로 active 색 상속.
function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="3.5" y="2.5" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 6h6M6 9h6M6 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function StructureIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="6.5" y="2" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="12" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="12" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 6v3M9 9H4.5v3M9 9h4.5v3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
function WireframeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 6.5h13M6.5 6.5v9" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
function ApiIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <ellipse cx="9" cy="4.5" rx="5.5" ry="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.5 4.5v9c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2v-9" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.5 9c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
