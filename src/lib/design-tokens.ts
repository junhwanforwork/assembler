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
  // 크기 — 정본 globals.css(26/17/15.5/15/14.5/13/12/11px). caption은 ASM-035 실측 신설
  SIZE_HERO: "var(--font-size-hero)",
  SIZE_SECTION: "var(--font-size-section)",
  SIZE_TITLE: "var(--font-size-title)",
  SIZE_BODY: "var(--font-size-body)",
  SIZE_INPUT: "var(--font-size-input)",
  SIZE_LABEL: "var(--font-size-label)",
  SIZE_META: "var(--font-size-meta)",
  SIZE_CAPTION: "var(--font-size-caption)",
  // 무게 — 정본 globals.css(400/500/600/700)
  WEIGHT_REGULAR: "var(--font-weight-regular)",
  WEIGHT_MEDIUM: "var(--font-weight-medium)",
  WEIGHT_SEMIBOLD: "var(--font-weight-semibold)",
  WEIGHT_BOLD: "var(--font-weight-bold)",
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
