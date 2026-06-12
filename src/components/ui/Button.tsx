"use client";

import { type FC, type ReactNode, type CSSProperties, useState } from "react";
import { BUTTON, COLOR, RADIUS, TYPOGRAPHY, DURATION, EASE } from "@/lib/design-tokens";

export type ButtonVariant = "primary" | "solid" | "danger" | "ghost" | "neutral";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  style?: CSSProperties;
}

// Spinner SVG — 16px, stroke-based, animates via CSS
function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{
        animation: "buttonSpinner 0.7s linear infinite",
        flexShrink: 0,
        position: "absolute",
      }}
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <style>{`
        @keyframes buttonSpinner {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
}

const SIZE_STYLES: Record<ButtonSize, CSSProperties> = {
  sm: {
    padding: "5px 12px",
    fontSize: "14px",
    borderRadius: RADIUS.MD,
    height: "32px",
  },
  md: {
    padding: "9px 16px",
    fontSize: "14px",
    borderRadius: RADIUS.MD,
    height: "40px",
  },
  lg: {
    padding: "12px 24px",
    fontSize: TYPOGRAPHY.SIZE.BASE,
    borderRadius: RADIUS.MD,
    height: "48px",
  },
};

// Returns base (non-hover) bg per variant — hover state is handled separately in the component
function getVariantBg(variant: ButtonVariant): string {
  switch (variant) {
    case "solid":
      return COLOR.ACCENT;
    case "primary":
      return BUTTON.PRIMARY_BG;
    case "danger":
      return BUTTON.DANGER_BG;
    case "ghost":
      return BUTTON.GHOST_BG;
    case "neutral":
      return BUTTON.NEUTRAL_BG;
  }
}

function getVariantHoverBg(variant: ButtonVariant): string {
  switch (variant) {
    case "solid":
      // ACCENT_HOVER is the 10%-darker blue (#1b64da) defined in design-tokens
      return COLOR.ACCENT_HOVER;
    case "primary":
      return BUTTON.PRIMARY_BG_HOVER;
    case "danger":
      return BUTTON.DANGER_BG_HOVER;
    case "ghost":
      return BUTTON.GHOST_BG; // ghost has no visible bg on hover either
    case "neutral":
      return BUTTON.NEUTRAL_BG_HOVER;
  }
}

function getVariantText(variant: ButtonVariant): string {
  switch (variant) {
    case "solid":
      return COLOR.TEXT_INVERSE; // white text on solid blue bg
    case "primary":
      return BUTTON.PRIMARY_TEXT;
    case "danger":
      return BUTTON.DANGER_TEXT;
    case "ghost":
      return BUTTON.PRIMARY_TEXT; // accent text on transparent bg
    case "neutral":
      return BUTTON.NEUTRAL_TEXT;
  }
}

/**
 * Button — tonal style system (light bg + colored text) plus a solid fill variant.
 * solid: filled ACCENT blue with white text — use for primary CTAs (publish, reopen).
 * loading=true shows a spinner overlaid on hidden children — no layout shift.
 */
export const Button: FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  children,
  leftIcon,
  rightIcon,
  onClick,
  type = "button",
  className,
  style,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const isInert = disabled || loading;

  const bg = isInert
    ? getVariantBg(variant)
    : isHovered
      ? getVariantHoverBg(variant)
      : getVariantBg(variant);

  const baseStyle: CSSProperties = {
    border: "none",
    cursor: isInert ? "not-allowed" : "pointer",
    opacity: isInert ? 0.55 : 1,
    // Press feedback: scale down slightly like Toss buttons
    transform: isActive && !isInert ? "scale(0.97)" : "scale(1)",
    transition: `background-color ${DURATION.BASE} ${EASE.DEFAULT}, opacity ${DURATION.FAST} ${EASE.DEFAULT}, transform ${DURATION.PRESS} ${EASE.DEFAULT}`,
    fontWeight: Number(TYPOGRAPHY.WEIGHT.SEMIBOLD),
    backgroundColor: bg,
    color: getVariantText(variant),
    position: "relative",
  };

  return (
    <button
      type={type}
      disabled={isInert}
      onClick={!isInert ? onClick : undefined}
      onMouseEnter={() => !isInert && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onMouseDown={() => !isInert && setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      className={`button_wrap inline-flex items-center justify-center gap-2 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4d94ff]${className ? ` ${className}` : ""}`}
      style={{ ...baseStyle, ...SIZE_STYLES[size], ...style }}
    >
      {/* Children remain in the DOM at all times to prevent layout shift on loading state.
          visibility:hidden keeps the button width stable while the spinner overlays it. */}
      <span
        style={{
          visibility: loading ? "hidden" : "visible",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {leftIcon}
        {children}
        {rightIcon}
      </span>
      {loading && <Spinner />}
    </button>
  );
};
