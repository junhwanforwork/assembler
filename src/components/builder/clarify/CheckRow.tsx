"use client";

import { type CSSProperties, type FC } from "react";
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens";

interface CheckRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}

// 멀티선택 체크 행 (ASS-212) — 박스 + 라벨(+설명). 선택 시 accent 틴트(배경이 주 신호).
export const CheckRow: FC<CheckRowProps> = ({ label, description, checked, onChange }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={onChange}
    style={{
      ...ROW,
      borderColor: checked ? COLOR.ACCENT : COLOR.BORDER_DEFAULT,
      backgroundColor: checked ? COLOR.ACCENT_LIGHT : COLOR.BG_INPUT,
    }}
  >
    <span
      aria-hidden="true"
      style={{
        ...BOX,
        borderColor: checked ? COLOR.ACCENT : COLOR.BORDER_STRONG,
        backgroundColor: checked ? COLOR.ACCENT : "transparent",
      }}
    >
      {checked ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 6.2 5 8.6l4.5-5" stroke={COLOR.TEXT_INVERSE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
    <span style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
      <span style={{ ...TYPOGRAPHY.STYLE.LABEL_1, color: COLOR.TEXT_PRIMARY }}>{label}</span>
      {description ? (
        <span style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }}>{description}</span>
      ) : null}
    </span>
  </button>
);

const ROW: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: SPACING["3"],
  width: "100%",
  padding: SPACING["3"],
  borderRadius: RADIUS.MD,
  borderStyle: "solid",
  borderWidth: "1px",
  cursor: "pointer",
  textAlign: "left",
};

const BOX: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "18px",
  height: "18px",
  flexShrink: 0,
  marginTop: "1px",
  borderRadius: RADIUS.XS,
  borderStyle: "solid",
  borderWidth: "1.5px",
};
