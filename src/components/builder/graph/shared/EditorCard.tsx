"use client"

import { type CSSProperties, type FC, type ReactNode } from "react"
import { COLOR, SPACING, RADIUS } from "@/lib/design-tokens"
import { InlineDeleteButton } from "./InlineDeleteButton"

// 편집 카드 — 필드 묶음 + 우상단 인라인 삭제. Doc/ApiData 섹션 공용.
export const EditorCard: FC<{ onDelete: () => void; deleteLabel: string; children: ReactNode }> = ({
  onDelete,
  deleteLabel,
  children,
}) => (
  <div style={CARD}>
    <div style={FIELDS}>{children}</div>
    <InlineDeleteButton label={deleteLabel} onClick={onDelete} />
  </div>
)

const CARD: CSSProperties = {
  display: "flex",
  gap: SPACING["2"],
  alignItems: "flex-start",
  padding: SPACING["4"],
  borderRadius: RADIUS.LG,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SECTION,
}

const FIELDS: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: SPACING["2"],
}
