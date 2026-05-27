"use client";

import { useState, type CSSProperties } from "react";
import { COLOR, INTERACTION, RADIUS } from "@/lib/design-tokens";

interface FeatureSpecStateChipProps {
  label: string;
}

/**
 * 기능 명세 표의 상태 칩.
 * 색상 강조 X(success/error 같은 의미적 색 아님).
 * 좌측 dot 은 칩끼리 시각 구분용 — 의미 없음.
 */
export default function FeatureSpecStateChip({ label }: FeatureSpecStateChipProps) {
  const [hovered, setHovered] = useState(false);

  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px 4px 8px",
    borderRadius: RADIUS.PILL,
    border: `1px solid rgba(255, 255, 255, 0.04)`,
    background: hovered ? "var(--btn-neutral-bg-hover)" : COLOR.BG_ELEVATED,
    color: COLOR.TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 1,
    whiteSpace: "nowrap",
    transition: INTERACTION.TRANSITION_BG,
  };

  return (
    <span
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        aria-hidden="true"
        style={{
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: COLOR.TEXT_MUTED,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
