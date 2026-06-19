"use client"

import { type CSSProperties, type FC } from "react"
import type { ProjectGraph, UIElement } from "@/lib/types/assembler"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { useElementMapping } from "../description/useElementMapping"

// 매핑 체인 칩 — Action → API(method path) → DB(name) → Result(kind). 선택/hover 시 요소 아래 인라인.
// 도출은 useElementMapping에 위임(DescriptionItem과 단일 출처). 빈 세그먼트는 muted "—".
export const MappingChip: FC<{ element: UIElement; graph: ProjectGraph }> = ({ element, graph }) => {
  const { action, apiText, dbText, resultLabel } = useElementMapping(element, graph)

  return (
    <div style={WRAP}>
      <Seg value={action} />
      <Arrow />
      <Seg value={apiText} mono />
      <Arrow />
      <Seg value={dbText} mono />
      <Arrow />
      <Seg value={resultLabel} />
    </div>
  )
}

const Seg: FC<{ value: string | null; mono?: boolean }> = ({ value, mono }) => (
  <span
    style={{
      ...SEG,
      color: value ? COLOR.TEXT_SECONDARY : COLOR.TEXT_MUTED,
      fontFamily: mono && value ? "var(--font-mono, monospace)" : undefined,
    }}
  >
    {value ?? "—"}
  </span>
)

const Arrow: FC = () => <span style={{ color: COLOR.TEXT_MUTED }}>→</span>

const WRAP: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: SPACING["1"],
  marginTop: SPACING["2"],
}

const SEG: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  padding: `2px ${SPACING["2"]}`,
  borderRadius: RADIUS.SM,
  backgroundColor: COLOR.BG_SECTION,
  whiteSpace: "nowrap",
}
