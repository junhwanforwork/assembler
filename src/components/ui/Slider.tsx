"use client";

import { type CSSProperties, type FC } from "react";
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens";

interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  ariaLabel?: string;
}

// 토큰 슬라이더 (ASS-212) — 네이티브 range(키보드·접근성 무료) + accent 트랙. min/현재값/max 라벨 동반.
export const Slider: FC<SliderProps> = ({ min, max, step = 1, value, onChange, ariaLabel }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: SPACING["2"] }}>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ ...RANGE_STYLE, accentColor: COLOR.ACCENT }}
    />
    <div style={ROW_STYLE}>
      <span style={EDGE_STYLE}>{min}</span>
      <span style={{ ...TYPOGRAPHY.STYLE.LABEL_1, color: COLOR.TEXT_PRIMARY }}>{value}</span>
      <span style={EDGE_STYLE}>{max}</span>
    </div>
  </div>
);

const RANGE_STYLE: CSSProperties = {
  width: "100%",
  height: "20px",
  cursor: "pointer",
};

const ROW_STYLE: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const EDGE_STYLE: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.TEXT_MUTED,
};
