"use client";

import type { FeatureSpec } from "@/types";
import { COLOR, RADIUS } from "@/lib/design-tokens";
import FeatureSpecStateChip from "./FeatureSpecStateChip";

interface FeatureSpecCardListProps {
  features: FeatureSpec[];
}

/**
 * 기능 명세 — 모바일 카드 리스트 (< 768px).
 * 각 카드: # · spec · UI · 상태 칩 세로 배치.
 */
export default function FeatureSpecCardList({ features }: FeatureSpecCardListProps) {
  return (
    <ul
      role="list"
      style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}
    >
      {features.map((f, idx) => (
        <li
          key={f.id ?? idx}
          role="listitem"
          style={{
            background: COLOR.BG_CARD,
            border: `1px solid ${COLOR.BORDER_SUBTLE}`,
            borderRadius: RADIUS.MD,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                color: COLOR.TEXT_MUTED,
                fontSize: 12,
                fontVariantNumeric: "tabular-nums",
                width: 20,
              }}
              aria-label="번호"
            >
              {idx + 1}
            </span>
            <span style={{ color: COLOR.TEXT_PRIMARY, fontSize: 14, lineHeight: 1.5 }}>
              {f.spec}
            </span>
          </div>
          <Field label="UI" value={f.ui} />
          {f.states.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: COLOR.TEXT_MUTED, fontSize: 11, fontWeight: 600 }}>상태</span>
              <div
                role="group"
                aria-label="상태"
                style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
              >
                {f.states.map((s, i) => (
                  <FeatureSpecStateChip key={`${s}-${i}`} label={s} />
                ))}
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ color: COLOR.TEXT_MUTED, fontSize: 11, fontWeight: 600 }}>{label}</span>
      <span style={{ color: COLOR.TEXT_SECONDARY, fontSize: 13, lineHeight: 1.5 }}>{value}</span>
    </div>
  );
}
