"use client";

import { type CSSProperties, type FC, type ReactNode } from "react";
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens";

interface SelectChipProps {
  label: ReactNode;
  selected: boolean;
  onClick: () => void;
}

// 선택형 칩(pill) (ASS-212) — single 선택지·"알아서 정해줘" 토글 공용. 선택 시 accent 틴트(배경이 주 신호).
export const SelectChip: FC<SelectChipProps> = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    style={{
      ...CHIP,
      color: selected ? COLOR.ACCENT : COLOR.TEXT_SECONDARY,
      backgroundColor: selected ? COLOR.ACCENT_LIGHT : COLOR.BG_INPUT,
      border: `1px solid ${selected ? COLOR.ACCENT : COLOR.BORDER_DEFAULT}`,
    }}
  >
    {label}
  </button>
);

const CHIP: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: `${SPACING["2"]} ${SPACING["3"]}`,
  borderRadius: RADIUS.MD,
  ...TYPOGRAPHY.STYLE.LABEL_1,
  cursor: "pointer",
  textAlign: "left",
};
