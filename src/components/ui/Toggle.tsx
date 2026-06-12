"use client";

import { type FC } from "react";
import { TOGGLE, COLOR, DURATION, EASE, TYPOGRAPHY } from "@/lib/design-tokens";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  labelStyle?: React.CSSProperties;
  disabled?: boolean;
  id?: string;
}

/**
 * Toggle — pill-shaped switch.
 *
 * Track: 36×20px (increased from 31×15 for Toss-level visual weight)
 * Knob:  16×16px circle, 2px inset from edge
 * translateX = TRACK_WIDTH - KNOB_SIZE - KNOB_OFFSET (auto via tokens)
 * Active: #3182f6   Inactive: #c7c8d0
 * Touch target: 44px min-height on label wrapper (WCAG 2.5.5)
 */
const Toggle: FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  labelStyle,
  disabled = false,
  id,
}) => {
  const trackWidth = TOGGLE.TRACK_WIDTH;
  const trackHeight = TOGGLE.TRACK_HEIGHT;
  const knobSize = TOGGLE.KNOB_SIZE;
  const knobOffset = TOGGLE.KNOB_OFFSET;

  // Translate the knob: from left edge to right edge
  const knobTranslateX = checked ? trackWidth - knobSize - knobOffset : knobOffset;

  const handleClick = () => {
    if (!disabled) onChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleClick();
    }
  };

  const trackColor = disabled
    ? COLOR.TEXT_DISABLED
    : checked
      ? COLOR.TOGGLE_ACTIVE
      : COLOR.BORDER_INPUT;

  const transition = `background-color ${DURATION.BASE} ${EASE.DEFAULT}`;
  const knobTransition = `transform ${DURATION.BASE} ${EASE.DEFAULT}`;

  return (
    <label
      htmlFor={id}
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: "44px", // WCAG 2.5.5 touch target — ensures tap comfort on mobile
        gap: "8px",
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
      }}
    >
      {/* Hidden native checkbox for form compatibility */}
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        disabled={disabled}
        onChange={handleClick}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        onKeyDown={handleKeyDown}
      />

      {/* Track */}
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          display: "inline-block",
          width: `${trackWidth}px`,
          height: `${trackHeight}px`,
          borderRadius: "999px",
          backgroundColor: trackColor,
          transition,
          flexShrink: 0,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {/* Knob */}
        <span
          style={{
            position: "absolute",
            top: `${knobOffset}px`,
            left: 0,
            width: `${knobSize}px`,
            height: `${knobSize}px`,
            borderRadius: "50%",
            backgroundColor: COLOR.TOGGLE_KNOB,
            boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
            transform: `translateX(${knobTranslateX}px)`,
            transition: knobTransition,
          }}
        />
      </span>

      {/* Optional label — caller can override style via labelStyle for section-header contexts */}
      {label && (
        <span
          style={{
            fontSize: TYPOGRAPHY.SIZE.SM,
            fontWeight: 500,
            color: disabled ? COLOR.TEXT_DISABLED : COLOR.TEXT_SECONDARY,
            lineHeight: 1.4,
            ...labelStyle,
          }}
        >
          {label}
        </span>
      )}
    </label>
  );
};

export default Toggle;
