import { type FC } from "react"
import type { UIElementType } from "@/lib/types/assembler"

// Tab 트리용 미니 글리프. stroke=currentColor로 행 색(선택/hover) 상속.
const SVG = { width: 14, height: 14, viewBox: "0 0 14 14", fill: "none" } as const
const S = { stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

// 펼침 chevron — 부모에서 rotate(90deg)로 ▾ 표현(기본 ▸).
export const IconChevron: FC = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path d="M3.5 2L6.5 5L3.5 8" {...S} />
  </svg>
)

export const IconFolder: FC = () => (
  <svg {...SVG} aria-hidden="true">
    <path d="M1.5 3.5h3l1 1.2h6.5v6.3h-10.5z" {...S} />
  </svg>
)

const IconPage: FC = () => (
  <svg {...SVG} aria-hidden="true">
    <path d="M3 1.5h5l3 3v8h-8z" {...S} />
    <path d="M8 1.5v3h3" {...S} />
  </svg>
)

// UIElementType → 카테고리 글리프 (10종을 4류로 묶음 — 풀 세트는 후속).
export function ElementIcon({ type }: { type: UIElementType }) {
  switch (type) {
    case "button":
      return (
        <svg {...SVG} aria-hidden="true">
          <rect x="2" y="4.5" width="10" height="5" rx="2.5" {...S} />
        </svg>
      )
    case "text-input":
    case "textarea":
    case "dropdown":
    case "number-stepper":
      return (
        <svg {...SVG} aria-hidden="true">
          <rect x="2" y="4" width="10" height="6" rx="1.5" {...S} />
          <path d="M4 7h3" {...S} />
        </svg>
      )
    case "toggle":
      return (
        <svg {...SVG} aria-hidden="true">
          <rect x="1.5" y="4.5" width="11" height="5" rx="2.5" {...S} />
          <circle cx="9.5" cy="7" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      )
    case "badge":
      return (
        <svg {...SVG} aria-hidden="true">
          <path d="M2.5 5l2.5-2.5h6.5v6.5l-2.5 2.5h-4z" {...S} />
        </svg>
      )
    case "divider":
      return (
        <svg {...SVG} aria-hidden="true">
          <path d="M2 7h10" {...S} />
        </svg>
      )
    default: // heading / text
      return (
        <svg {...SVG} aria-hidden="true">
          <path d="M2.5 3.5h9M2.5 7h9M2.5 10.5h6" {...S} />
        </svg>
      )
  }
}

export { IconPage }
