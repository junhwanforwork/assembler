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

// 통합 트리 그룹 헤더 글리프 (ASS-070) — 요구사항·기능·API·Database. 이모지 대신 SVG로 DS 일관.
export const IconRequirement: FC = () => (
  <svg {...SVG} aria-hidden="true">
    <rect x="3" y="2" width="8" height="10" rx="1" {...S} />
    <path d="M5 5h4M5 7.5h4M5 10h2.5" {...S} />
  </svg>
)

export const IconFeature: FC = () => (
  <svg {...SVG} aria-hidden="true">
    <rect x="2" y="2" width="4.5" height="4.5" rx="1" {...S} />
    <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" {...S} />
    <path d="M6.5 4.25h2.5v3.25" {...S} />
  </svg>
)

export const IconApi: FC = () => (
  <svg {...SVG} aria-hidden="true">
    <path d="M5 4L2.5 7L5 10" {...S} />
    <path d="M9 4l2.5 3L9 10" {...S} />
  </svg>
)

export const IconDatabase: FC = () => (
  <svg {...SVG} aria-hidden="true">
    <ellipse cx="7" cy="3.5" rx="4" ry="1.6" {...S} />
    <path d="M3 3.5v7c0 .9 1.8 1.6 4 1.6s4-.7 4-1.6v-7" {...S} />
    <path d="M3 7c0 .9 1.8 1.6 4 1.6s4-.7 4-1.6" {...S} />
  </svg>
)

const IconPage: FC = () => (
  <svg {...SVG} aria-hidden="true">
    <path d="M3 1.5h5l3 3v8h-8z" {...S} />
    <path d="M8 1.5v3h3" {...S} />
  </svg>
)

// 루트(프로젝트 개요/흐름) 진입 — 홈 글리프.
export const IconRoot: FC = () => (
  <svg {...SVG} aria-hidden="true">
    <path d="M2.5 6.5L7 2.5l4.5 4" {...S} />
    <path d="M3.75 6v5.5h6.5V6" {...S} />
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
