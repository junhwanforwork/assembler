"use client"

import { type CSSProperties, type FC } from "react"
import { COLOR, RADIUS, TYPOGRAPHY } from "@/lib/design-tokens"

// 번호 배지 — 와이어프레임 요소 좌상단 콜아웃. ACCENT 원 + INVERSE 숫자.
// 미완성이면 WARNING 링 + aria-label(색 단독 의미 전달 금지 — 텍스트 동반).
export const ElementMarker: FC<{ index: number; name: string; complete: boolean }> = ({
  index,
  name,
  complete,
}) => (
  <span
    style={{
      ...BADGE,
      boxShadow: complete ? undefined : `0 0 0 2px ${COLOR.WARNING}`,
    }}
    aria-label={complete ? `${index}번 ${name}` : `${index}번 ${name} 매핑 미완성`}
  >
    {index}
  </span>
)

const BADGE: CSSProperties = {
  position: "absolute",
  top: -8,
  left: -8,
  width: 18,
  height: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: RADIUS.PILL,
  backgroundColor: COLOR.ACCENT,
  color: COLOR.TEXT_INVERSE,
  ...TYPOGRAPHY.STYLE.LABEL_2,
  fontWeight: 600,
  lineHeight: 1,
  zIndex: 1,
}
