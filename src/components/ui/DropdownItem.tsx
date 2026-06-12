"use client";

import { type FC } from "react";
import { COLOR, TYPOGRAPHY } from "@/lib/design-tokens";

export interface DropdownItemProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export const DropdownItem: FC<DropdownItemProps> = ({
  label,
  selected = false,
  disabled = false,
  onClick,
}) => {
  return (
    <div
      role="option"
      aria-selected={selected}
      aria-disabled={disabled}
      className="dropdown_item flex items-center justify-between py-2.5 px-3 rounded-lg cursor-pointer transition-colors"
      style={{
        ...TYPOGRAPHY.STYLE.LABEL_1,
        color: selected ? COLOR.ACCENT : COLOR.TEXT_PRIMARY,
        fontWeight: selected ? TYPOGRAPHY.WEIGHT.MEDIUM : TYPOGRAPHY.WEIGHT.REGULAR,
        pointerEvents: disabled ? "none" : "auto",
        opacity: disabled ? 0.5 : 1,
      }}
      onClick={() => {
        if (!disabled) onClick();
      }}
    >
      <span>{label}</span>
      {selected && (
        // 10×10 checkmark — polyline matches spec: 2,5.5 → 4.5,8 → 8.5,2.5
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <polyline
            points="2,5.5 4.5,8 8.5,2.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
};
