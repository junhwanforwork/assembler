"use client"

import { type CSSProperties, type FC } from "react"
import { createPortal } from "react-dom"
import type { ProjectGraph, UIElement } from "@/lib/types/assembler"
import { COLOR, RADIUS, SHADOW, SPACING, TYPOGRAPHY, Z_INDEX } from "@/lib/design-tokens"
import { useElementMapping } from "../description/useElementMapping"

const GAP = 12
const TOOLTIP_WIDTH = 280
const TOOLTIP_EST_HEIGHT = 140 // 줄바꿈 포함 추정 — 하단 넘침 clamp용

// 요소 hover 플로팅 툴팁 — 요소 박스를 넓히지 않도록 document.body 포털로 렌더(PageFrame overflow:hidden 탈출).
// position:fixed + anchorRect 기준(요소 오른쪽, 화면 우측 넘치면 왼쪽) — 화면 좌표라 줌 영향 없음. pointerEvents 없음.
export const ElementTooltip: FC<{ element: UIElement; graph: ProjectGraph; anchorRect: DOMRect }> = ({
  element,
  graph,
  anchorRect,
}) => {
  const { action, apiText, dbText, resultLabel, resultDetail, complete } = useElementMapping(element, graph)

  // anchorRect는 클라이언트 mouseenter에서만 세팅 → 이 컴포넌트는 항상 클라이언트에서만 렌더(document.body 존재 보장).
  // 오른쪽 공간이 부족하면 요소 왼쪽으로 뒤집어 화면 밖 잘림 방지.
  const overflowsRight = anchorRect.right + GAP + TOOLTIP_WIDTH > window.innerWidth
  const left = overflowsRight ? anchorRect.left - GAP - TOOLTIP_WIDTH : anchorRect.right + GAP
  // 하단 넘침 시 위로 끌어올림(상·하 양쪽 clamp).
  const top = Math.min(Math.max(GAP, anchorRect.top), window.innerHeight - TOOLTIP_EST_HEIGHT - GAP)

  return createPortal(
    <div style={{ ...WRAP, left, top }} role="tooltip">
      <div style={HEAD}>
        <span style={NAME}>{element.name}</span>
        {!complete ? (
          <span style={WARN}>
            <span aria-hidden>⚠</span> 미완성
          </span>
        ) : null}
      </div>
      <div style={CHAIN}>
        <Seg value={action} />
        <Arrow />
        <Seg value={apiText} mono />
        <Arrow />
        <Seg value={dbText} mono />
        <Arrow />
        <Seg value={resultDetail ? `${resultLabel} · ${resultDetail}` : resultLabel} />
      </div>
    </div>,
    document.body
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
  position: "fixed",
  width: TOOLTIP_WIDTH,
  display: "flex",
  flexDirection: "column",
  gap: SPACING["2"],
  padding: SPACING["3"],
  borderRadius: RADIUS.MD,
  border: `1px solid ${COLOR.BORDER_STRONG}`,
  backgroundColor: COLOR.BG_SECTION,
  boxShadow: SHADOW.DROPDOWN,
  pointerEvents: "none",
  zIndex: Z_INDEX.PORTAL_DROPDOWN,
}

const HEAD: CSSProperties = { display: "flex", alignItems: "center", gap: SPACING["2"] }
const NAME: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_1, color: COLOR.TEXT_PRIMARY, flex: 1, minWidth: 0 }
const WARN: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.WARNING,
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
}

const CHAIN: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: SPACING["1"],
}

const SEG: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  padding: `2px ${SPACING["2"]}`,
  borderRadius: RADIUS.SM,
  backgroundColor: COLOR.BG_BASE,
  whiteSpace: "nowrap",
}
