"use client"

import { type FC, useMemo } from "react"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY, INTERACTION } from "@/lib/design-tokens"
import { useGraphStore } from "@/lib/store/graph"
import { resolveNodeDetail } from "@/lib/assembler/graph-selectors"
import type { DocLink } from "@/lib/types/assembler"
import { NODE_GLYPH, NODE_TINT } from "@/components/builder/tree/object-glyph"

// 객체 인스펙터(클릭=pin) — 선택된 객체의 이름·종류·설명 + 외부 문서 링크(새 탭).
// 변경 영향 목록은 ImpactPanel이 담당 — 여긴 객체 자체의 상세·참조만 본다.

export const ObjectInspector: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const selection = useGraphStore((s) => s.selection)

  const detail = useMemo(
    () => (graph ? resolveNodeDetail(graph, selection) : null),
    [graph, selection]
  )

  if (!detail) {
    return (
      <div style={CARD_STYLE}>
        <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED }}>
          트리에서 객체를 고르면 상세와 연결된 문서를 보여드릴게요.
        </p>
      </div>
    )
  }

  const glyph = NODE_GLYPH[detail.type]

  return (
    <div style={CARD_STYLE}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACING["2"] }}>
        <span
          aria-hidden
          style={{
            width: 18,
            height: 18,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: RADIUS.XS,
            backgroundColor: COLOR.BG_SECTION,
            color: NODE_TINT[detail.type],
            fontSize: "11px",
            fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD,
          }}
        >
          {glyph.letter}
        </span>
        <span style={{ ...TYPOGRAPHY.STYLE.TITLE_2_KO, color: COLOR.TEXT_PRIMARY }}>
          {detail.label}
        </span>
        {detail.sublabel && (
          <span style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }}>
            {detail.sublabel}
          </span>
        )}
      </div>

      <div style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }}>{glyph.label}</div>

      {detail.description && (
        <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY }}>
          {detail.description}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: SPACING["1"] }}>
        <div style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }}>문서</div>
        {detail.links.length === 0 ? (
          <p style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_DISABLED }}>
            아직 연결된 문서가 없어요.
          </p>
        ) : (
          detail.links.map((link, i) => <DocLinkRow key={`${link.url}-${i}`} link={link} />)
        )}
      </div>
    </div>
  )
}

const DocLinkRow: FC<{ link: DocLink }> = ({ link }) => (
  <a
    href={link.url}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: "flex",
      alignItems: "center",
      gap: SPACING["2"],
      padding: `${SPACING["1"]} ${SPACING["2"]}`,
      borderRadius: RADIUS.SM,
      textDecoration: "none",
      color: COLOR.ACCENT,
      transition: INTERACTION.TRANSITION_BG,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = INTERACTION.HOVER_BG_SURFACE)}
    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
  >
    <ExternalLinkIcon />
    <span style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_PRIMARY }}>{link.label}</span>
    <span
      style={{
        ...TYPOGRAPHY.STYLE.LABEL_2,
        color: COLOR.TEXT_MUTED,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        flex: 1,
        minWidth: 0,
      }}
    >
      {link.url.replace(/^https?:\/\//, "")}
    </span>
  </a>
)

const ExternalLinkIcon: FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ flexShrink: 0 }}>
    <path
      d="M5.5 3H3.5C2.94772 3 2.5 3.44772 2.5 4V10.5C2.5 11.0523 2.94772 11.5 3.5 11.5H10C10.5523 11.5 11 11.0523 11 10.5V8.5M8 3H11V6M11 3L6 8"
      stroke={COLOR.ACCENT}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
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
