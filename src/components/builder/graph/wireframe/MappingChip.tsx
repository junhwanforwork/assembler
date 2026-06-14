"use client"

import { type CSSProperties, type FC } from "react"
import type { ProjectGraph, UIElement, UIElementResult } from "@/lib/types/assembler"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"

const RESULT_LABEL: Record<UIElementResult["kind"], string> = {
  navigate: "이동",
  stateChange: "상태 변화",
  toast: "토스트",
  inlineError: "인라인 에러",
  none: "없음",
}

// 매핑 체인 칩 — Action → API(method path) → DB(name) → Result(kind). 선택/hover 시 요소 아래 인라인.
// 빈 세그먼트는 muted "—" (kind none/stateChange의 빈 API는 경고 아님 — ⚠는 프레임/Layers의 isMappingComplete 소관).
export const MappingChip: FC<{ element: UIElement; graph: ProjectGraph }> = ({ element, graph }) => {
  const apis = element.apiIds
    .map((id) => graph.apis.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
  const dbs = element.databaseIds
    .map((id) => graph.databases.find((d) => d.id === id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d))

  const apiText =
    apis.length === 0 ? null : apis.length === 1 ? `${apis[0].method} ${apis[0].path}` : `API ${apis.length}`
  const dbText = dbs.length === 0 ? null : dbs.length === 1 ? dbs[0].name : `DB ${dbs.length}`

  return (
    <div style={WRAP}>
      <Seg value={element.action || null} />
      <Arrow />
      <Seg value={apiText} mono />
      <Arrow />
      <Seg value={dbText} mono />
      <Arrow />
      <Seg value={RESULT_LABEL[element.result.kind]} />
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
