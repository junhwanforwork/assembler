"use client";

import { useState, type CSSProperties } from "react";
import type { FeatureSpec } from "@/types";
import { COLOR, INTERACTION } from "@/lib/design-tokens";
import FeatureSpecStateChip from "./FeatureSpecStateChip";

interface FeatureSpecTableProps {
  features: FeatureSpec[];
}

/**
 * 기능 명세 표 — 데스크탑 4열.
 * sticky thead, 행 hover bg 전환, semantic <table> + <th scope>.
 */
export default function FeatureSpecTable({ features }: FeatureSpecTableProps) {
  return (
    <div className="feature_spec_table_wrap" style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 14,
          color: COLOR.TEXT_PRIMARY,
        }}
      >
        <thead>
          <tr
            style={{
              position: "sticky",
              top: 0,
              background: COLOR.BG_CARD,
              borderBottom: `1px solid ${COLOR.BORDER_DEFAULT}`,
            }}
          >
            <th scope="col" style={headCellStyle({ width: 48 })}>#</th>
            <th scope="col" style={headCellStyle()}>기능 명세</th>
            <th scope="col" style={headCellStyle()}>UI</th>
            <th scope="col" style={headCellStyle()}>상태</th>
          </tr>
        </thead>
        <tbody>
          {features.map((f, idx) => (
            <Row key={f.id ?? idx} feature={f} index={idx + 1} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ feature, index }: { feature: FeatureSpec; index: number }) {
  const [hovered, setHovered] = useState(false);
  const rowStyle: CSSProperties = {
    background: hovered ? INTERACTION.HOVER_BG : "transparent",
    transition: INTERACTION.TRANSITION_BG,
    borderBottom: `1px solid ${COLOR.BORDER_SUBTLE}`,
  };
  return (
    <tr
      style={rowStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td
        style={{
          ...bodyCellStyle,
          color: COLOR.TEXT_MUTED,
          fontVariantNumeric: "tabular-nums",
          width: 48,
        }}
      >
        {index}
      </td>
      <td style={bodyCellStyle}>{feature.spec}</td>
      <td style={{ ...bodyCellStyle, color: COLOR.TEXT_SECONDARY }}>{feature.ui}</td>
      <td style={bodyCellStyle}>
        {feature.states.length === 0 ? (
          <span style={{ color: COLOR.TEXT_MUTED, fontSize: 13 }}>—</span>
        ) : (
          <div
            role="group"
            aria-label="상태"
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {feature.states.map((s, i) => (
              <FeatureSpecStateChip key={`${s}-${i}`} label={s} />
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

function headCellStyle(overrides?: CSSProperties): CSSProperties {
  return {
    textAlign: "left",
    padding: "10px 16px",
    fontSize: 12,
    fontWeight: 600,
    color: COLOR.TEXT_SECONDARY,
    letterSpacing: 0.2,
    ...overrides,
  };
}

const bodyCellStyle: CSSProperties = {
  padding: "12px 16px",
  verticalAlign: "top",
  lineHeight: 1.5,
};
