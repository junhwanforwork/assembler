"use client"

import { type FC, useMemo } from "react"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY, INTERACTION } from "@/lib/design-tokens"
import { useGraphStore } from "@/lib/store/graph"
import { computeImpact, type ImpactItem } from "@/lib/assembler/impact"
import { NODE_GLYPH, NODE_TINT } from "@/components/builder/tree/object-glyph"

// 변경 영향 패널 — 선택된 객체를 바꾸면 "어디어디 바꿔야 하는지"를 종류별로 보여준다.
// Biz가 정책을 누르면 Dev가 손댈 객체 목록이 한 장으로 나오는 핸드오프 뷰.

export const ImpactPanel: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const selection = useGraphStore((s) => s.selection)
  const select = useGraphStore((s) => s.select)

  const impact = useMemo(
    () => (graph ? computeImpact(graph, selection) : null),
    [graph, selection]
  )

  if (!impact) {
    return (
      <div style={CARD_STYLE}>
        <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED }}>
          왼쪽 트리에서 객체를 고르면 변경 시 영향받는 곳을 보여드릴게요.
        </p>
      </div>
    )
  }

  const headline =
    impact.total === 0
      ? "직접 연결된 하위 객체가 없어요."
      : impact.direction === "downstream"
        ? `이 객체를 바꾸면 ${impact.total}곳을 함께 손봐야 해요.`
        : `이 공유 객체를 바꾸면 ${impact.total}곳이 영향받아요.`

  return (
    <div style={CARD_STYLE}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACING["2"] }}>
        <Glyph type={impact.origin.type} />
        <span style={{ ...TYPOGRAPHY.STYLE.TITLE_2_KO, color: COLOR.TEXT_PRIMARY }}>
          {impact.origin.label}
        </span>
      </div>

      <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY }}>{headline}</p>

      {impact.groups.map((group) => (
        <div key={group.type} style={{ display: "flex", flexDirection: "column", gap: SPACING["1"] }}>
          <div style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }}>
            {NODE_GLYPH[group.type].label} · {group.items.length}
          </div>
          {group.items.map((item) => (
            <ImpactRow key={`${item.type}:${item.id}`} item={item} onSelect={() => select(item)} />
          ))}
        </div>
      ))}
    </div>
  )
}

const ImpactRow: FC<{ item: ImpactItem; onSelect: () => void }> = ({ item, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    style={{
      display: "flex",
      alignItems: "center",
      gap: SPACING["2"],
      width: "100%",
      padding: `${SPACING["1"]} ${SPACING["2"]}`,
      background: "transparent",
      border: "none",
      borderRadius: RADIUS.SM,
      cursor: "pointer",
      textAlign: "left",
      transition: INTERACTION.TRANSITION_BG,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = INTERACTION.HOVER_BG_SURFACE)}
    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
  >
    <Glyph type={item.type} />
    <span
      style={{
        ...TYPOGRAPHY.STYLE.BODY_2,
        color: COLOR.TEXT_PRIMARY,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        flex: 1,
        minWidth: 0,
      }}
    >
      {item.label}
    </span>
    {item.sublabel && (
      <span style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED, flexShrink: 0 }}>
        {item.sublabel}
      </span>
    )}
  </button>
)

const Glyph: FC<{ type: ImpactItem["type"] }> = ({ type }) => (
  <span
    aria-hidden
    style={{
      width: 16,
      height: 16,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: RADIUS.XS,
      backgroundColor: COLOR.BG_SECTION,
      color: NODE_TINT[type],
      fontSize: "10px",
      fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD,
      lineHeight: "16px",
    }}
  >
    {NODE_GLYPH[type].letter}
  </span>
)

const CARD_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["3"],
  padding: SPACING["4"],
  backgroundColor: COLOR.BG_SURFACE,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  borderRadius: RADIUS.LG,
}
