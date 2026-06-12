"use client";

import { type FC, useState } from "react";
import { COLOR, INPUT, TYPOGRAPHY } from "@/lib/design-tokens";

interface NumberStepperProps {
  value: number | undefined;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  onChange: (value: number | undefined) => void;
}

export const NumberStepper: FC<NumberStepperProps> = ({
  value,
  min,
  max,
  step = 1,
  placeholder = "–",
  onChange,
}) => {
  const [focused, setFocused] = useState(false);

  const canDecrement = value !== undefined && (min === undefined || value - step >= min);
  const canIncrement = value !== undefined ? max === undefined || value + step <= max : true;

  function decrement() {
    if (!canDecrement) return;
    onChange(value! - step);
  }

  function increment() {
    if (value === undefined) {
      onChange(min ?? 1);
      return;
    }
    if (!canIncrement) return;
    onChange(value + step);
  }

  const btnBase: React.CSSProperties = {
    width: 28,
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
    fontSize: 16,
    lineHeight: 1,
    transition: "color 120ms",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: COLOR.BG_INPUT,
        border: `1px solid ${focused ? INPUT.BORDER_FOCUS : INPUT.BORDER_DEFAULT}`,
        borderRadius: 6,
        height: 34,
        overflow: "hidden",
        boxShadow: focused ? INPUT.SHADOW_FOCUS : undefined,
        transition: "border-color 150ms, box-shadow 150ms",
      }}
    >
      <button
        type="button"
        aria-label="값 감소"
        onClick={decrement}
        disabled={!canDecrement}
        style={{
          ...btnBase,
          color: canDecrement ? COLOR.TEXT_MUTED : COLOR.TEXT_DISABLED,
          opacity: canDecrement ? 1 : 0.35,
        }}
        onMouseEnter={(e) => {
          if (canDecrement) (e.currentTarget as HTMLButtonElement).style.color = COLOR.TEXT_PRIMARY;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = canDecrement
            ? COLOR.TEXT_MUTED
            : COLOR.TEXT_DISABLED;
        }}
      >
        −
      </button>

      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(undefined);
          } else {
            const n = parseInt(raw, 10);
            if (!isNaN(n)) onChange(n);
          }
        }}
        style={{
          flex: 1,
          minWidth: 0,
          background: "transparent",
          border: "none",
          outline: "none",
          textAlign: "center",
          ...TYPOGRAPHY.STYLE.BODY_2,
          color: value !== undefined ? COLOR.TEXT_PRIMARY : COLOR.TEXT_DISABLED,
        }}
      />

      <button
        type="button"
        aria-label="값 증가"
        onClick={increment}
        disabled={!canIncrement}
        style={{
          ...btnBase,
          color: canIncrement ? COLOR.TEXT_MUTED : COLOR.TEXT_DISABLED,
          opacity: canIncrement ? 1 : 0.35,
        }}
        onMouseEnter={(e) => {
          if (canIncrement) (e.currentTarget as HTMLButtonElement).style.color = COLOR.TEXT_PRIMARY;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = canIncrement
            ? COLOR.TEXT_MUTED
            : COLOR.TEXT_DISABLED;
        }}
      >
        +
      </button>
    </div>
  );
};
