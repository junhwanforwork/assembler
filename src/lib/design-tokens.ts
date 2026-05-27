/**
 * HowCloud Design System — Design Tokens
 *
 * OPINION DS 를 기반으로 howcloud 다크 팔레트에 맞춰 발췌·매핑.
 * globals.css 의 CSS 변수가 authoritative — 이 파일은 TSX 에서 import 가능한 mirror.
 *
 * 색을 바꿀 땐 globals.css 와 이 파일을 함께 수정한다.
 *
 * Usage:
 *   import { COLOR, RADIUS, SHADOW } from "@/lib/design-tokens"
 *   style={{ backgroundColor: COLOR.BG_SURFACE, color: COLOR.TEXT_PRIMARY }}
 */

// ─── Color ────────────────────────────────────────────────────────────────────

export const COLOR = {
  // Text
  TEXT_PRIMARY: "var(--text-primary)",
  TEXT_LABEL: "var(--text-label)",
  TEXT_SECONDARY: "var(--text-secondary)",
  TEXT_MUTED: "var(--text-muted)",
  TEXT_DISABLED: "var(--text-disabled)",
  TEXT_INVERSE: "var(--text-inverse)",

  // Background
  BG_BASE: "var(--bg-base)",
  BG_SURFACE: "var(--bg-surface)",
  BG_CARD: "var(--bg-card)",
  BG_ELEVATED: "var(--bg-elevated)",
  BG_PANEL: "var(--bg-panel)",
  BG_OVERLAY: "var(--bg-overlay)",

  // Border
  BORDER_SUBTLE: "var(--border-subtle)",
  BORDER_DEFAULT: "var(--border-default)",
  BORDER_STRONG: "var(--border-strong)",

  // Accent
  ACCENT: "var(--accent)",
  ACCENT_HOVER: "var(--accent-hover)",
  ACCENT_SUBTLE: "var(--accent-subtle)",
  ACCENT_LIGHT: "var(--accent-light)",
  ACCENT_MUTED: "var(--accent-muted)",
  ACCENT_BG: "var(--accent-bg)",

  // Status
  POSITIVE: "var(--positive)",
  NEGATIVE: "var(--negative)",
  NEGATIVE_BG: "var(--negative-bg)",
  WARNING: "var(--warning)",
  NEW_GREEN: "var(--new-green)",

  // Overlay — 브랜드 색 위에 얹는 dark alpha (이니셜 백 등)
  OVERLAY_DARK: "var(--overlay-dark-alpha)",
} as const;

export type ColorToken = (typeof COLOR)[keyof typeof COLOR];

// ─── Typography ───────────────────────────────────────────────────────────────
// OPINION 의 STYLE/SIZE/WEIGHT/TRACKING 체계를 그대로 가져옴 (도메인 무관).

export const TYPOGRAPHY = {
  STYLE: {
    DISPLAY: { fontSize: "30px", fontWeight: "700", lineHeight: "40px", letterSpacing: "-0.03em" },
    H1: { fontSize: "26px", fontWeight: "700", lineHeight: "35px", letterSpacing: "-0.025em" },
    H2: { fontSize: "22px", fontWeight: "700", lineHeight: "31px", letterSpacing: "-0.02em" },
    H3: { fontSize: "20px", fontWeight: "600", lineHeight: "29px", letterSpacing: "-0.01em" },
    TITLE_1: { fontSize: "18px", fontWeight: "600", lineHeight: "28px", letterSpacing: "-0.01em" },
    TITLE_2: { fontSize: "16px", fontWeight: "600", lineHeight: "24px", letterSpacing: "0" },
    TITLE_1_KO: { fontSize: "18px", fontWeight: "500", lineHeight: "28px", letterSpacing: "-0.01em" },
    TITLE_2_KO: { fontSize: "16px", fontWeight: "500", lineHeight: "24px", letterSpacing: "0" },
    BODY_1: { fontSize: "16px", fontWeight: "400", lineHeight: "24px", letterSpacing: "0" },
    BODY_2: { fontSize: "14px", fontWeight: "400", lineHeight: "20px", letterSpacing: "0" },
    LABEL_1: { fontSize: "14px", fontWeight: "500", lineHeight: "20px", letterSpacing: "0" },
    LABEL_2: { fontSize: "12px", fontWeight: "500", lineHeight: "16px", letterSpacing: "0.01em" },
  },
  SIZE: {
    XS: "12px",
    SM: "14px",
    BASE: "16px",
    LG: "18px",
    XL: "22px",
    XXL: "30px",
  },
  WEIGHT: {
    REGULAR: "400",
    MEDIUM: "500",
    SEMIBOLD: "600",
    BOLD: "700",
  },
  TRACKING: {
    TIGHT: "-0.025em",
    NORMAL: "0",
    WIDE: "0.01em",
  },
} as const;

export const FONT_SIZE = TYPOGRAPHY.SIZE;
export const FONT_WEIGHT = {
  REGULAR: 400,
  MEDIUM: 500,
  SEMIBOLD: 600,
  BOLD: 700,
} as const;

// ─── Spacing (4px base grid) ──────────────────────────────────────────────────

export const SPACING = {
  "1": "4px",
  "2": "8px",
  "3": "12px",
  "4": "16px",
  "5": "20px",
  "6": "24px",
  "8": "32px",
  "10": "40px",
  "12": "48px",
  "16": "64px",
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const RADIUS = {
  XS: "4px",
  SM: "8px",
  MD: "12px",
  LG: "14px",
  XL: "20px",
  PILL: "100px",
  FULL: "9999px",
} as const;

// ─── Shadow ───────────────────────────────────────────────────────────────────

export const SHADOW = {
  CARD: "var(--shadow-card)",
  CARD_HOVER: "var(--shadow-card-hover)",
  DROPDOWN: "var(--shadow-dropdown)",
  MODAL: "var(--shadow-modal)",
  AMBIENT: "var(--shadow-ambient)",
} as const;

// ─── Interaction System ───────────────────────────────────────────────────────
// Toss 원칙: border 변경으로 hover 표현 금지 — 배경색 전환 또는 scale 사용.

export const INTERACTION = {
  HOVER_BG: "var(--interaction-hover)",
  HOVER_BG_SURFACE: "var(--interaction-hover-surface)",
  ACTIVE_BG: "var(--interaction-active)",
  SCALE_UP: "scale(1.02)",
  SCALE_NONE: "scale(1)",
  TRANSITION_BG: "background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  TRANSITION_CARD:
    "transform 200ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

// ─── Duration / Ease ──────────────────────────────────────────────────────────

export const DURATION = {
  PRESS: "80ms",
  FAST: "120ms",
  BASE: "200ms",
  SLOW: "320ms",
} as const;

export const EASE = {
  DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

// ─── Input ────────────────────────────────────────────────────────────────────

export const INPUT = {
  BORDER_DEFAULT: "var(--input-border-default)",
  BORDER_HOVER: "var(--input-border-hover)",
  BORDER_FOCUS: "var(--input-border-focus)",
  BORDER_ERROR: "var(--input-border-error)",
  BG_DEFAULT: "var(--input-bg-default)",
  BG_HOVER: "var(--input-bg-hover)",
  BG_DISABLED: "var(--input-bg-disabled)",
  SHADOW_FOCUS: "var(--input-shadow-focus)",
  SHADOW_ERROR: "var(--input-shadow-error)",
  TRANSITION:
    "border-color 120ms cubic-bezier(0.4,0,0.2,1), box-shadow 120ms cubic-bezier(0.4,0,0.2,1), background-color 120ms cubic-bezier(0.4,0,0.2,1)",
} as const;

// ─── Button ───────────────────────────────────────────────────────────────────
// Tonal variants (light bg + colored text) + solid (full accent) + neutral.

export const BUTTON = {
  PRIMARY_BG: "var(--btn-primary-bg)",
  PRIMARY_BG_HOVER: "var(--btn-primary-bg-hover)",
  PRIMARY_TEXT: "var(--btn-primary-text)",
  DANGER_BG: "var(--btn-danger-bg)",
  DANGER_BG_HOVER: "var(--btn-danger-bg-hover)",
  DANGER_TEXT: "var(--btn-danger-text)",
  NEUTRAL_BG: "var(--btn-neutral-bg)",
  NEUTRAL_BG_HOVER: "var(--btn-neutral-bg-hover)",
  NEUTRAL_TEXT: "var(--btn-neutral-text)",
  GHOST_BG: "transparent",
} as const;

// ─── Z-Index ──────────────────────────────────────────────────────────────────

export const Z_INDEX = {
  PANEL: 10,
  TOOLBAR: 20,
  SIDEBAR: 40,
  NAVBAR: 50,
  DROPDOWN: 100,
  BACKDROP: 200,
  MODAL: 210,
  TOAST: 9999,
} as const;
