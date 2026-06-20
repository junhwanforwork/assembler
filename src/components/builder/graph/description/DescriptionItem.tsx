"use client"

import { useEffect, useRef, type CSSProperties, type FC } from "react"
import type { ProjectGraph, UIElement } from "@/lib/types/assembler"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { GraphInspector } from "../inspector/GraphInspector"
import { useElementMapping } from "./useElementMapping"

// Description 항목 — 번호 배지 + 이름 + 구조화 스펙(노출정보/Action/API/DB/Result/States/⚠).
// expanded + embedEditor면 GraphInspector(embedded) 폼을 인라인으로 펼쳐 편집. 클릭 → onSelect(selectElement).
// 캔버스 보드(CanvasDescription)에선 embedEditor=false — 펼쳐도 편집 폼 미렌더(스펙·선택 하이라이트만, 편집은 우측 도크 GraphInspector).
// selected면 패널 스크롤 영역에서 자기 위치로 scrollIntoView.
export const DescriptionItem: FC<{
  index: number
  element: UIElement
  graph: ProjectGraph
  expanded: boolean
  onSelect: () => void
  embedEditor?: boolean
}> = ({ index, element, graph, expanded, onSelect, embedEditor = true }) => {
  const { action, apiText, dbText, resultLabel, resultDetail, exposure, states, complete } = useElementMapping(
    element,
    graph
  )
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (expanded) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [expanded])

  return (
    <li
      ref={ref}
      style={{ ...ITEM, outline: expanded ? `1px solid ${COLOR.ACCENT}` : `1px solid ${COLOR.BORDER_DEFAULT}` }}
      aria-current={expanded ? "true" : undefined}
    >
      <button type="button" onClick={onSelect} style={HEAD} aria-expanded={expanded}>
        <span style={{ ...BADGE, boxShadow: complete ? undefined : `0 0 0 2px ${COLOR.WARNING}` }}>{index}</span>
        <span style={NAME}>{element.name}</span>
        {!complete ? (
          <span style={WARN}>
            <span aria-hidden>⚠</span> 미완성
          </span>
        ) : null}
      </button>

      <dl style={SPEC}>
        <Row label="노출 정보" value={exposure} />
        <Row label="동작" value={action} />
        <Row label="API" value={apiText} mono />
        <Row label="Database" value={dbText} mono />
        <Row label="결과" value={resultDetail ? `${resultLabel} · ${resultDetail}` : resultLabel} />
        <Row label="States" value={states.length > 0 ? states.join(" · ") : null} />
      </dl>

      {expanded && embedEditor ? (
        <div style={EDIT}>
          <GraphInspector graph={graph} embedded />
        </div>
      ) : null}
    </li>
  )
}

const Row: FC<{ label: string; value: string | null; mono?: boolean }> = ({ label, value, mono }) => (
  <div style={ROW}>
    <dt style={ROW_LABEL}>{label}</dt>
    <dd
      style={{
        ...ROW_VALUE,
        color: value ? COLOR.TEXT_SECONDARY : COLOR.TEXT_MUTED,
        fontFamily: mono && value ? "var(--font-mono, monospace)" : undefined,
      }}
    >
      {value ?? "—"}
    </dd>
  </div>
)

const ITEM: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["2"],
  padding: SPACING["3"],
  borderRadius: RADIUS.MD,
  backgroundColor: COLOR.BG_BASE,
}

const HEAD: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: SPACING["2"],
  width: "100%",
  border: "none",
  background: "transparent",
  padding: 0,
  cursor: "pointer",
  textAlign: "left",
}

const BADGE: CSSProperties = {
  flexShrink: 0,
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
}

const NAME: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_1, color: COLOR.TEXT_PRIMARY, flex: 1, minWidth: 0 }
const WARN: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.WARNING,
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
}

const SPEC: CSSProperties = { display: "flex", flexDirection: "column", gap: SPACING["1"], margin: 0 }
const ROW: CSSProperties = { display: "flex", gap: SPACING["2"] }
const ROW_LABEL: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED, width: 64, flexShrink: 0 }
const ROW_VALUE: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, margin: 0, flex: 1, minWidth: 0, wordBreak: "break-word" }

const EDIT: CSSProperties = {
  marginTop: SPACING["1"],
  paddingTop: SPACING["3"],
  borderTop: `1px solid ${COLOR.BORDER_DEFAULT}`,
}
