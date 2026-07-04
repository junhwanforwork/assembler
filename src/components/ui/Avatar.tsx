import { COLOR, RADIUS, TYPOGRAPHY } from "@/lib/design-tokens"

// 사용자 이니셜 아바타. 중성 표면 + 보더(브랜드 장식 남용 금지).
export function Avatar({ initial, size = 32 }: { initial: string; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: RADIUS.PILL,
        background: COLOR.BG_CARD,
        border: `1px solid ${COLOR.BORDER_STRONG}`,
        color: COLOR.TEXT_PRIMARY,
        fontSize: TYPOGRAPHY.SIZE_LABEL,
        fontWeight: TYPOGRAPHY.WEIGHT_SEMIBOLD,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
      }}
    >
      {initial}
    </span>
  )
}
