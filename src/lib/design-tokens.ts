/**
 * OPINION Design System — Design Tokens
 *
 * Single source of truth for TypeScript/TSX usage.
 * All values MUST match the CSS variables defined in globals.css @theme.
 *
 * Rule: globals.css @theme is authoritative.
 *       This file mirrors those values so TSX components can import them.
 *       When you update a color in globals.css, update here too.
 *
 * Usage:
 *   import { COLOR, RADIUS, SHADOW } from '@/lib/design-tokens'
 *   style={{ backgroundColor: COLOR.BG_SURFACE }}
 */

// ─── Color (mirrors @theme in globals.css) ────────────────────────────────────

export const COLOR = {
  // Text
  TEXT_PRIMARY: "var(--color-text-primary)",
  TEXT_SECONDARY: "var(--color-text-secondary)",
  TEXT_LABEL: "var(--color-text-label)",
  TEXT_MUTED: "var(--color-text-muted)",
  TEXT_DISABLED: "var(--color-text-disabled)",
  TEXT_INVERSE: "var(--color-text-inverse)",

  // Background
  BG_BASE: "var(--color-bg-base)",
  BG_SURFACE: "var(--color-bg-surface)",
  BG_OVERLAY: "var(--color-bg-overlay)",
  BG_INPUT: "var(--color-bg-input)",
  BG_SECTION: "var(--color-bg-section)",
  PANEL_BG: "var(--color-panel-bg)",

  // Border
  BORDER_DEFAULT: "var(--color-border-default)",
  BORDER_STRONG: "var(--color-border-strong)",
  BORDER_FOCUS: "var(--color-border-focus)",
  BORDER_INPUT: "var(--color-border-input)",

  // Accent / Interactive
  ACCENT: "var(--color-accent)",
  ACCENT_HOVER: "var(--color-accent-hover)",
  ACCENT_SUBTLE: "var(--color-accent-subtle)",
  ACCENT_LIGHT: "var(--color-accent-light)",
  ACCENT_MUTED: "var(--color-accent-muted)",
  ACCENT_BG: "var(--color-accent-bg)",

  // Status
  POSITIVE: "var(--color-positive)",
  NEGATIVE: "var(--color-negative)",
  NEGATIVE_LIGHT: "var(--color-negative-light)",
  NEGATIVE_BG: "var(--color-negative-bg)",
  WARNING: "var(--color-warning)",
  STAR: "var(--color-star)",

  // Toggle
  TOGGLE_ACTIVE: "var(--color-toggle-active)",
  TOGGLE_INACTIVE: "var(--color-toggle-inactive)",
  TOGGLE_KNOB: "var(--color-toggle-knob)",

  // Status muted
  POSITIVE_MUTED: "var(--color-positive-muted)",
  WARNING_MUTED: "var(--color-warning-muted)",

  // Toast
  TOAST_BG: "var(--color-toast-bg)",
  TOAST_TEXT: "var(--color-toast-text)",

  // Fixed-dark surface (theme-independent — dark tiles on light surfaces)
  SURFACE_INVERSE: "var(--color-surface-inverse)",

  // Reward
  REWARD: "var(--color-reward)",
  REWARD_BG: "var(--color-reward-bg)",
} as const;

export type ColorToken = (typeof COLOR)[keyof typeof COLOR];

// ─── Typography ───────────────────────────────────────────────────────────────
//
// Scale: Toss TDS 기반 (11→13→15→17→20→22→26→30px)
// 레퍼런스: Toss Design System t1~t7, Material Design 3 type roles
// 폰트: Poppins (Latin/숫자) + Wanted Sans (한국어) → --font-sans CSS 변수
//
// ── 사용 규칙 ──────────────────────────────────────────────────────────────────
//
// 1. TYPOGRAPHY.STYLE.* 스프레드 — 다중 속성이 필요한 경우 (fontSize + weight + lineHeight)
//      style={{ ...TYPOGRAPHY.STYLE.BODY_1, color: COLOR.TEXT_PRIMARY }}
//
// 2. Tailwind text-* 클래스 — 크기 하나만 필요한 경우
//      className="text-sm"  → 13px (= BODY_2/LABEL_1)
//      className="text-base" → 15px (= BODY_1/TITLE_2)
//
// 3. 동일 엘리먼트에 두 시스템 혼용 금지
//      ❌ className="text-sm" + style={{ fontSize: "15px" }}
//      ✅ style={{ ...TYPOGRAPHY.STYLE.BODY_1 }}
//      ✅ className="text-base font-semibold"  (Tailwind만)
//
// ── 웨이트 규칙 ────────────────────────────────────────────────────────────────
//   700 (Bold)     → 숫자/금액/히어로값, H1~H2 대형 제목
//   600 (Semibold) → UI 제목, 카드 헤딩, 섹션명, 네비게이션
//   500 (Medium)   → 버튼, 배지, 탭 레이블, 리스트 항목
//   400 (Regular)  → 본문, 설명문, 입력값
//
// ── 자간(letterSpacing) 규칙 ────────────────────────────────────────────────
//   30px+   : -0.03em (대형 제목 응집력)
//   22~26px : -0.02em~-0.025em (Wanted Sans 보정)
//   15~20px : -0.01em~0
//   13px    : 0
//   11px    : +0.01em (극소형 가독성 보상 — MD3 Label Small 원칙)
//
// ── 행간(lineHeight) 계약 ────────────────────────────────────────────────────
// 모든 lineHeight는 절대값(px). 비율(1.5 등) 사용 금지.
// 이 값이 CSS line-height이자 Figma Auto Height bounding box.
//
// TYPOGRAPHY.STYLE.* — 전체 텍스트 스타일 (style prop에 스프레드)
// TYPOGRAPHY.SIZE.*  — 단일 크기 토큰 (SIZE.SM = "13px")
export const TYPOGRAPHY = {
  // ── Semantic type styles (preferred) ──────────────────────────────────────
  // lineHeight is the full bounding box height — use it as the spacing unit in
  // Auto Layout (Figma) and as the CSS line-height value in code.
  STYLE: {
    DISPLAY: { fontSize: "30px", fontWeight: "700", lineHeight: "40px", letterSpacing: "-0.03em" }, // Hero numbers — bounding box: 40px
    H1: { fontSize: "26px", fontWeight: "700", lineHeight: "35px", letterSpacing: "-0.025em" }, // Page titles — bounding box: 35px
    H2: { fontSize: "22px", fontWeight: "700", lineHeight: "31px", letterSpacing: "-0.02em" }, // Section headings — bounding box: 31px
    H3: { fontSize: "20px", fontWeight: "600", lineHeight: "29px", letterSpacing: "-0.01em" }, // Card headings — bounding box: 29px
    TITLE_1: { fontSize: "18px", fontWeight: "600", lineHeight: "28px", letterSpacing: "-0.01em" }, // Nav labels, content titles — bounding box: 28px
    TITLE_2: { fontSize: "16px", fontWeight: "600", lineHeight: "24px", letterSpacing: "0" }, // Section labels, subtitles — bounding box: 24px
    // Korean-tuned variants — Wanted Sans at 600 renders visually heavier than Poppins at the same weight.
    // Use these for pure-Korean titles where 600 feels too heavy and 400 lacks hierarchy.
    TITLE_1_KO: {
      fontSize: "18px",
      fontWeight: "500",
      lineHeight: "28px",
      letterSpacing: "-0.01em",
    }, // Korean survey/content titles — bounding box: 28px
    TITLE_2_KO: { fontSize: "16px", fontWeight: "500", lineHeight: "24px", letterSpacing: "0" }, // Korean card titles / list item titles — bounding box: 24px
    BODY_1: { fontSize: "16px", fontWeight: "400", lineHeight: "24px", letterSpacing: "0" }, // Primary body copy — bounding box: 24px
    BODY_2: { fontSize: "14px", fontWeight: "400", lineHeight: "20px", letterSpacing: "0" }, // Secondary body, descriptions — bounding box: 20px
    LABEL_1: { fontSize: "14px", fontWeight: "500", lineHeight: "20px", letterSpacing: "0" }, // Buttons, badges, UI controls — bounding box: 20px
    LABEL_2: { fontSize: "12px", fontWeight: "500", lineHeight: "16px", letterSpacing: "0.01em" }, // Captions, hints, timestamps — bounding box: 16px
  },
  // ── Raw scales (single-dimension utilities) ────────────────────────────────
  SIZE: {
    XS: "12px", // LABEL_2 — captions, hints (min font size)
    SM: "14px", // BODY_2 / LABEL_1 — secondary body, buttons
    BASE: "16px", // BODY_1 / TITLE_2 — primary body, labels
    LG: "18px", // TITLE_1 — nav labels, content titles
    XL: "22px", // H2 — section headings
    XXL: "30px", // DISPLAY — hero numbers
  },
  WEIGHT: {
    //
    // ── Weight 사용 규칙 ────────────────────────────────────────────────────
    //
    // 기준: MD3(400/500 binary) + KRDS(400/700 binary) 연구에서 도출.
    // "weight 단계가 많을수록 계층이 오히려 희석된다" — 꼭 필요한 곳에만 쓸 것.
    //
    // 700 (BOLD)
    //   → 화면 내 단 하나의 최상위 계층. 다른 요소들이 조연이 되는 숫자/수치.
    //   → 히어로 숫자, 금액, H1·H2 대형 제목
    //   → 한 화면에 Bold 요소가 3개 이상이면 모두 Bold가 아닌 것처럼 보임.
    //
    // 600 (SEMIBOLD)
    //   → 구조를 만드는 레이블. "읽지 않아도 섹션이 구분되어야" 하는 텍스트.
    //   → H3, TITLE_1, TITLE_2, 카드 헤딩, 네비게이션, 섹션 타이틀
    //   → Body_1(400)과 같은 크기(15px)에서도 600이면 계층 분리 가능.
    //
    // 500 (MEDIUM)
    //   → 배경(색)이 있는 UI 컨트롤에만 제한적으로 사용.
    //   → 버튼 레이블, 뱃지, 탭 레이블, LABEL_1/LABEL_2
    //   → 순수 본문 텍스트·리스트 항목에는 사용 금지 — 400 또는 600으로 대체.
    //   → 12px(LABEL_2)에서 500·400 차이는 시각적으로 미미 → letter-spacing이 보완.
    //   → Poppins(Latin)에서 500은 Wanted Sans(Korean) 500보다 약간 굵어 보임 —
    //     한영 혼용 줄에서 시각적 불균형이 생기면 400으로 낮추는 것을 고려.
    //
    // 400 (REGULAR)
    //   → 눈이 쉬는 텍스트. 읽기용 콘텐츠의 기본.
    //   → Body, 설명문, 입력값, Placeholder, 날짜·메타 정보
    //   → 작은 크기(14px 이하) 본문은 항상 400 — 500과 차이가 없고 무게만 늘어남.
    //
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

// Legacy aliases — kept for backwards compat. Prefer TYPOGRAPHY.SIZE.* for new code.
export const FONT_SIZE = {
  XS: TYPOGRAPHY.SIZE.XS,
  SM: TYPOGRAPHY.SIZE.SM,
  BASE: TYPOGRAPHY.SIZE.BASE,
  LG: TYPOGRAPHY.SIZE.LG,
  XL: TYPOGRAPHY.SIZE.XL,
  "2XL": TYPOGRAPHY.SIZE.XXL,
  "3XL": TYPOGRAPHY.SIZE.XXL,
} as const;

export const FONT_WEIGHT = {
  REGULAR: 400,
  MEDIUM: 500,
  SEMIBOLD: 600,
  BOLD: 700,
} as const;

export const FONT_FAMILY = {
  // Poppins (Latin/숫자) + Wanted Sans (한국어)
  // Poppins: next/font/google → --font-poppins CSS 변수
  // Wanted Sans: CDN → "Wanted Sans" 폰트명으로 로드됨
  // 참고: 이 값은 CSS cascade에서 --font-sans로 자동 적용됨.
  //        인라인 style={{ fontFamily: FONT_FAMILY.SANS }} 은 특수 케이스에만 사용.
  SANS: 'var(--font-poppins), "Wanted Sans", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif',
} as const;

// ─── Spacing (4px base grid, mirrors @theme) ─────────────────────────────────

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

// ─── Border Radius (mirrors @theme) ──────────────────────────────────────────

export const RADIUS = {
  XS: "4px", // --radius-xs
  SM: "8px", // --radius-sm  (6→8)
  MD: "12px", // --radius-md  (8→12) — buttons, inputs, chips
  LG: "16px", // --radius-lg  (12→16) — cards
  XL: "20px", // --radius-xl  (16→20) — modals, large panels
  "2XL": "24px", // --radius-2xl (22→24) — major panels
  PILL: "100px", // --radius-pill
} as const;

// ─── Shadow (mirrors @theme) ─────────────────────────────────────────────────

export const SHADOW = {
  CARD: "var(--shadow-card)",
  CARD_HOVER: "var(--shadow-card-hover)",
  DROPDOWN: "var(--shadow-dropdown)",
  MODAL: "var(--shadow-modal)",
  NAV: "var(--shadow-nav)",
  AMBIENT: "var(--shadow-ambient)",
  PANEL: "var(--shadow-panel)", // 떠 있는 셸 패널 전용 (card~modal 중간)
} as const;

// ─── Layout (floating shell — mirrors --panel-* in globals.css) ───────────────

export const LAYOUT = {
  PANEL_GAP: "var(--panel-gap)", // 플로팅 패널 사이·가장자리 간격
  PANEL_RADIUS: "var(--panel-radius)", // 플로팅 패널 라운드 (20px)
} as const;

// ─── Interaction System ───────────────────────────────────────────────────────
//
// Toss 원칙: border 변경으로 인터랙션 표현 금지 — 배경색 전환 또는 scale 사용
//
// 사용 패턴:
//   List row / flat card (MainList)       → hover: INTERACTION.HOVER_BG (배경색만)
//   Compact card (SummarizedContainer)    → hover: INTERACTION.SCALE_UP + HOVER_BG
//   Pressed/active                        → INTERACTION.ACTIVE_BG
//
// 금지:
//   ❌ border-color 변경으로 hover 표현
//   ❌ box-shadow 추가/강화로 hover 표현
//   ✅ backgroundColor 전환
//   ✅ scale transform (카드 계열)

export const INTERACTION = {
  // ── Hover backgrounds ──────────────────────────────────────────────────────
  HOVER_BG: "var(--color-interaction-hover)",
  HOVER_BG_SURFACE: "var(--color-interaction-hover-surface)",
  ACTIVE_BG: "var(--color-interaction-active)",

  // ── Scale transforms (compact card계열) ────────────────────────────────────
  SCALE_UP: "scale(1.02)", // SummarizedContainer card hover
  SCALE_NONE: "scale(1)",

  // ── Transition shorthands ──────────────────────────────────────────────────
  TRANSITION_BG: "background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  TRANSITION_CARD:
    "transform 200ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

// ─── Transition (mirrors @theme) ─────────────────────────────────────────────

export const DURATION = {
  PRESS: "80ms", // press/active — instant physical feedback
  FAST: "120ms", // --duration-fast
  BASE: "200ms", // --duration-base
  SLOW: "320ms", // --duration-slow
} as const;

export const EASE = {
  DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)", // --ease-default
} as const;

// ─── Input tokens ────────────────────────────────────────────────────────────
// Single source of truth for all text input / textarea / searchbar states.
// Import INPUT wherever a raw <input>/<textarea> is styled directly.

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

// ─── Question type accent colors ─────────────────────────────────────────────
// Visual differentiators — intentionally NOT part of the system palette.
// Single source of truth: update here only.
// Used by: QuestionTypeIcon, FlowView, QuestionCard

// Figma spec (channel 3m6k53gj): 모든 타입 동일한 단색 시스템
//   배경: #f2f3ff (연보라-파랑 tint)
//   아이콘: #004ac6 (진파랑 단색 stroke)
// icon bg와 icon stroke 두 값으로 구성.
export const QUESTION_TYPE_COLOR = {
  multiple_choice: "#004ac6",
  short_text: "#004ac6",
  long_text: "#004ac6",
  scale: "#004ac6",
  grade: "#004ac6",
  checkbox: "#004ac6",
  dropdown: "#004ac6",
  ranking: "#004ac6",
  startpoint: "#004ac6",
  endpoint: "#004ac6",
} as const;

// 아이콘 배경 (chip/badge bg) — 모든 타입 공통
export const QUESTION_TYPE_ICON_BG = "var(--color-accent-light)";

// ─── Flow canvas layout constants ────────────────────────────────────────────

export const FLOW_LAYOUT = {
  NODE_WIDTH: 240,
  NODE_HEIGHT: 107,
  NODE_H_GAP: 48,
  SECTION_PAD_X: 24,
  SECTION_PAD_Y: 16,
  SECTION_HEADER_H: 34,
  SECTION_V_GAP: 80,
  START_X: 60,
  START_Y: 60,
} as const;

// ─── Toggle dimensions (numeric — used for inline geometry) ──────────────────

export const TOGGLE = {
  // 36×20px — increased from 31×15 to meet 44px touch target (via label min-height) and match Toss-level visual weight
  TRACK_WIDTH: 36,
  TRACK_HEIGHT: 20,
  KNOB_SIZE: 16,
  KNOB_OFFSET: 2,
} as const;

// ─── Button variants ──────────────────────────────────────────────────────────
// Tonal style: light bg + colored text. No solid-fill action buttons.
//
// Usage:
//   style={{ backgroundColor: BUTTON.PRIMARY_BG, color: BUTTON.PRIMARY_TEXT }}
//   className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
//
// Hover: use BUTTON.*_BG_HOVER in a onMouseEnter/Leave or Tailwind hover: class.

export const BUTTON = {
  // Primary — blue tonal (confirm, save, submit)
  PRIMARY_BG: "var(--color-button-primary-bg)",
  PRIMARY_BG_HOVER: "var(--color-button-primary-bg-hover)",
  PRIMARY_TEXT: "var(--color-button-primary-text)",

  // Danger — red tonal (delete, reset, destructive)
  DANGER_BG: "var(--color-button-danger-bg)",
  DANGER_BG_HOVER: "var(--color-button-danger-bg-hover)",
  DANGER_TEXT: "var(--color-button-danger-text)",

  // Neutral — gray (cancel, dismiss)
  NEUTRAL_BG: "var(--color-button-neutral-bg)",
  NEUTRAL_BG_HOVER: "var(--color-button-neutral-bg-hover)",
  NEUTRAL_TEXT: "var(--color-button-neutral-text)",

  // Ghost — fully transparent bg; text color provided by variant
  GHOST_BG: "transparent",
} as const;

// ─── Z-Index scale ────────────────────────────────────────────────────────────
// 중앙 관리 — 값을 바꿀 때 이 파일만 수정.
// 각 레이어 의미:
//   PANEL     builder 좌/우 패널
//   TOOLBAR   view toggle, resize handle, sticky bars
//   SIDEBAR   fixed/sticky sidebar
//   NAVBAR    global top navbar (항상 콘텐츠 위)
//   DROPDOWN  dropdown, datepicker, tooltip (콘텐츠 위, 모달 아래)
//   BACKDROP  modal backdrop (DROPDOWN 위)
//   MODAL     modal content (BACKDROP 위)
//   TOAST     최상위 — 언제나 visible

export const Z_INDEX = {
  PANEL: 10,
  TOOLBAR: 20,
  SIDEBAR: 40,
  NAVBAR: 50,
  DROPDOWN: 100,
  BACKDROP: 200,
  MODAL: 210,
  PORTAL_DROPDOWN: 9000, // createPortal 기반 드롭다운 (overflow-hidden 탈출용)
  TOAST: 9999,
} as const;

// ─── Section label style (shared across editors) ──────────────────────────────
// Micro-label used to title each editor section (보기, 설정, 조건 분기 로직).
// Wide tracking (0.06em) was removed — looks unnatural with Korean characters.
export const SECTION_LABEL_STYLE = {
  fontSize: "12px",
  fontWeight: "600" as const,
  letterSpacing: "0",
  color: COLOR.TEXT_MUTED, // #6B7D8E — slightly more readable than TEXT_DISABLED without competing with content
} as const;
