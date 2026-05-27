"use client";

import { type FC, type ReactNode, type CSSProperties, useState } from "react";
import { BUTTON, COLOR, RADIUS, DURATION, EASE } from "@/lib/design-tokens";

export type ButtonVariant = "solid" | "primary" | "neutral" | "danger" | "ghost";
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
  "aria-label"?: string;
}

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
      <style>{`@keyframes buttonSpinner { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

const SIZE_STYLES: Record<ButtonSize, CSSProperties> = {
  sm: { padding: "5px 12px", fontSize: "14px", borderRadius: RADIUS.MD, height: "32px" },
  md: { padding: "9px 16px", fontSize: "14px", borderRadius: RADIUS.MD, height: "40px" },
  lg: { padding: "12px 24px", fontSize: "16px", borderRadius: RADIUS.MD, height: "48px" },
};

function getVariantBg(v: ButtonVariant): string {
  switch (v) {
    case "solid":   return COLOR.ACCENT;
    case "primary": return BUTTON.PRIMARY_BG;
    case "danger":  return BUTTON.DANGER_BG;
    case "neutral": return BUTTON.NEUTRAL_BG;
    case "ghost":   return BUTTON.GHOST_BG;
  }
}
function getVariantHoverBg(v: ButtonVariant): string {
  switch (v) {
    case "solid":   return COLOR.ACCENT_HOVER;
    case "primary": return BUTTON.PRIMARY_BG_HOVER;
    case "danger":  return BUTTON.DANGER_BG_HOVER;
    case "neutral": return BUTTON.NEUTRAL_BG_HOVER;
    case "ghost":   return BUTTON.GHOST_BG;
  }
}
function getVariantText(v: ButtonVariant): string {
  switch (v) {
    case "solid":   return COLOR.TEXT_INVERSE;
    case "primary": return BUTTON.PRIMARY_TEXT;
    case "danger":  return BUTTON.DANGER_TEXT;
    case "neutral": return BUTTON.NEUTRAL_TEXT;
    case "ghost":   return BUTTON.PRIMARY_TEXT;
  }
}

/**
 * Button — OPINION 의 tonal + solid variant 체계.
 * - solid: 화면 단일 최상위 CTA (accent fill + 흰 글자)
 * - primary: 기본 확인·저장 (tonal — accent_bg + accent_text)
 * - neutral: 닫기·취소 (elevated bg + 회색)
 * - danger: 삭제·파괴 (tonal red)
 * - ghost: 인라인 (transparent + accent text)
 *
 * loading 중에도 children 유지(레이아웃 시프트 방지) — visibility hidden 으로 너비 보존.
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
  "aria-label": ariaLabel,
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
    transform: isActive && !isInert ? "scale(0.97)" : "scale(1)",
    transition: `background-color ${DURATION.BASE} ${EASE.DEFAULT}, opacity ${DURATION.FAST} ${EASE.DEFAULT}, transform ${DURATION.PRESS} ${EASE.DEFAULT}`,
    fontWeight: 600,
    backgroundColor: bg,
    color: getVariantText(variant),
    position: "relative",
  };

  return (
    <button
      type={type}
      disabled={isInert}
      aria-label={ariaLabel}
      aria-busy={loading}
      onClick={!isInert ? onClick : undefined}
      onMouseEnter={() => !isInert && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onMouseDown={() => !isInert && setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      className={`inline-flex items-center justify-center gap-2 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--accent)]${className ? ` ${className}` : ""}`}
      style={{ ...baseStyle, ...SIZE_STYLES[size], ...style }}
    >
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

export default Button;
