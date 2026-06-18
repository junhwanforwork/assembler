"use client"

import { type FC, useState } from "react"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY, INTERACTION, DURATION, EASE } from "@/lib/design-tokens"
import { nodeKey, useGraphStore } from "@/lib/store/graph"
import type { TreeNode } from "@/lib/assembler/graph-selectors"
import { NODE_GLYPH, NODE_TINT } from "./object-glyph"

// 트리 한 행 — 들여쓰기 + 펼침 토글 + 글리프 + 라벨 + 고립 배지. 자식은 재귀 렌더.
// 상태(펼침/선택)는 graph 스토어가 단일 출처 — 행은 키로 조회만 한다.

const ROW_H = 28
const INDENT = 14

export const TreeRow: FC<{ node: TreeNode; depth: number }> = ({ node, depth }) => {
  const key = nodeKey(node.type, node.id)
  const isOpen = useGraphStore((s) => !!s.expanded[key])
  const isSelected = useGraphStore(
    (s) => s.selection?.type === node.type && s.selection.id === node.id
  )
  const toggleExpanded = useGraphStore((s) => s.toggleExpanded)
  const select = useGraphStore((s) => s.select)
  const [hovered, setHovered] = useState(false)

  const hasChildren = node.children.length > 0
  const glyph = NODE_GLYPH[node.type]

  const rowBg = isSelected
    ? INTERACTION.ACTIVE_BG
    : hovered
      ? INTERACTION.HOVER_BG
      : "transparent"

  return (
    <>
      <div
        role="treeitem"
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-selected={isSelected}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => select({ type: node.type, id: node.id })}
        style={{
          display: "flex",
          alignItems: "center",
          gap: SPACING["2"],
          height: ROW_H,
          paddingLeft: SPACING["2"],
          paddingRight: SPACING["2"],
          marginLeft: depth * INDENT,
          borderRadius: RADIUS.SM,
          backgroundColor: rowBg,
          transition: INTERACTION.TRANSITION_BG,
          cursor: "pointer",
        }}
      >
        <button
          type="button"
          aria-label={hasChildren ? (isOpen ? "접기" : "펼치기") : undefined}
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) toggleExpanded(key)
          }}
          style={{
            width: 14,
            height: 14,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: hasChildren ? "pointer" : "default",
            color: COLOR.TEXT_MUTED,
            visibility: hasChildren ? "visible" : "hidden",
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: `transform ${DURATION.FAST} ${EASE.DEFAULT}`,
          }}
        >
          <Chevron />
        </button>

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
            color: NODE_TINT[node.type],
            fontSize: "10px",
            fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD,
            lineHeight: "16px",
          }}
        >
          {glyph.letter}
        </span>

        <span
          title={`${glyph.label}: ${node.label}`}
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
          {node.label}
        </span>

        {node.sublabel && (
          <span
            style={{
              ...TYPOGRAPHY.STYLE.LABEL_2,
              color: COLOR.TEXT_MUTED,
              flexShrink: 0,
            }}
          >
            {node.sublabel}
          </span>
        )}

        {node.isolated && (
          <span
            title="연결이 없어요. 다른 객체와 매핑해 주세요"
            style={{
              ...TYPOGRAPHY.STYLE.LABEL_2,
              color: COLOR.WARNING,
              flexShrink: 0,
            }}
          >
            ⚠
          </span>
        )}
      </div>

      {hasChildren &&
        isOpen &&
        node.children.map((child) => (
          <TreeRow key={nodeKey(child.type, child.id)} node={child} depth={depth + 1} />
        ))}
    </>
  )
}

const Chevron: FC = () => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
    <path
      d="M2.5 1.5L5.5 4L2.5 6.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
