"use client"

import { type CSSProperties, type FC } from "react"
import { COLOR, SPACING, TYPOGRAPHY, RADIUS, FONT_FAMILY } from "@/lib/design-tokens"

// 카탈로그 칩 (ASS-080) — Used in·Trigger·Database·Error 값을 작은 라벨로. 색만으로 의미 전달 금지 규칙상
// negative tone도 텍스트가 곧 의미라 칩 형태는 동일, 색만 살짝 구분(에러 케이스 가독).
export const Chip: FC<{ label: string; tone?: "default" | "negative"; mono?: boolean }> = ({
  label,
  tone = "default",
  mono = false,
}) => {
  const isNegative = tone === "negative"
  return (
    <span
      style={{
        ...CHIP,
        color: isNegative ? COLOR.NEGATIVE : COLOR.TEXT_SECONDARY,
        backgroundColor: isNegative ? COLOR.NEGATIVE_BG : COLOR.BG_INPUT,
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : FONT_FAMILY.SANS,
      }}
    >
      {label}
    </span>
  )
}

const CHIP: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  maxWidth: "100%",
  padding: `2px ${SPACING["2"]}`,
  borderRadius: RADIUS.SM,
  ...TYPOGRAPHY.STYLE.LABEL_2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}
