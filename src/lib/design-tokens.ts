// Assembler 디자인 토큰 — TS 미러. 정본은 globals.css의 CSS 변수(1:1).
// 컴포넌트는 COLOR.X 또는 var(--x) 어느 쪽이든 OK. 인라인 hex 하드코딩 금지(이 파일만 예외).
// 색 방향: 중성 블랙 + 블루 브랜드. 그라데이션 금지.

export const COLOR = {
  BG_BASE: "var(--bg-base)",
  BG_CARD: "var(--bg-card)",
  BG_ELEVATED: "var(--bg-elevated)",
  BG_OVERLAY: "var(--bg-overlay)",

  TEXT_PRIMARY: "var(--text-primary)",
  TEXT_SECONDARY: "var(--text-secondary)",
  TEXT_MUTED: "var(--text-muted)",
  TEXT_INVERSE: "var(--text-inverse)",

  BORDER: "var(--border)",
  BORDER_STRONG: "var(--border-strong)",

  BRAND: "var(--brand)",
  BRAND_HOVER: "var(--brand-hover)",
  BRAND_SOFT: "var(--brand-soft)",

  SURFACE_TINT: "var(--surface-tint)",

  POSITIVE: "var(--positive)",
  NEGATIVE: "var(--negative)",
  WARNING: "var(--warning)",
  POSITIVE_SOFT: "var(--positive-soft)",
  NEGATIVE_SOFT: "var(--negative-soft)",
  WARNING_SOFT: "var(--warning-soft)",
} as const

// 색(--border/--border-strong)과 1:1 짝인 선 굵기.
export const BORDER_WIDTH = {
  DEFAULT: "var(--border-width)",
  STRONG: "var(--border-width-strong)",
} as const

// 아이콘 SVG stroke-width 단일값 — ui/editor icons.tsx 공용 (CSS 변수 아님, 숫자 상수).
export const ICON_STROKE = 1.75

export const SHADOW = {
  POP: "var(--shadow-pop)",
  PANEL: "var(--shadow-panel)",
} as const

export const RADIUS = {
  XS: "var(--radius-xs)",
  SM: "var(--radius-sm)",
  CONTROL: "var(--radius-control)",
  CARD: "var(--radius-card)",
  LG: "var(--radius-lg)",
  PILL: "var(--radius-pill)",
} as const

// 8px 그리드.
export const SPACING = {
  XS: "4px",
  SM: "8px",
  MD: "12px",
  LG: "16px",
  XL: "24px",
  XXL: "32px",
} as const

export const TYPOGRAPHY = {
  // 크기 (프로토타입 추출)
  SIZE_HERO: "26px",
  SIZE_SECTION: "17px",
  SIZE_TITLE: "15px",
  SIZE_BODY: "14.5px",
  SIZE_INPUT: "15.5px",
  SIZE_LABEL: "13px",
  SIZE_META: "12px",
  // 무게
  WEIGHT_REGULAR: 400,
  WEIGHT_MEDIUM: 500,
  WEIGHT_SEMIBOLD: 600,
  WEIGHT_BOLD: 700,
} as const

export const INTERACTION = {
  HOVER_BG: "var(--hover-bg)",
  ACTIVE_BG: "var(--active-bg)",
  TRANSITION: "var(--transition-base)",
} as const

export const DURATION = {
  FAST: "var(--duration-fast)",
  BASE: "var(--duration-base)",
  SLOW: "var(--duration-slow)",
  DRAW: "var(--duration-draw)",
  LOOP: "var(--duration-loop)",
} as const

export const EASE = {
  DEFAULT: "var(--ease-standard)",
  OUT: "var(--ease-out)",
  SPRING: "var(--ease-spring)",
} as const

export const Z_INDEX = {
  MODAL: "var(--z-modal)",
  TOAST: "var(--z-toast)",
} as const

export const LAYOUT = {
  CONTAINER_MAX: "1440px",
} as const
