"use client"

import { type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { COLOR, SPACING, RADIUS, TYPOGRAPHY, INTERACTION, DURATION, EASE } from "@/lib/design-tokens"
import { IconChevron } from "./icons"
import type { TreeNode } from "./TreeNav"

// 트리 한 행 + (펼침 시) 자식 재귀. 들여쓰기는 자식 컨테이너 marginLeft + 좌측 가이드선.
export const TreeRow: FC<{ node: TreeNode; depth: number }> = ({ node, depth }) => {
  const collapsedIds = useGraphStore((s) => s.collapsedIds)
  const toggleCollapsed = useGraphStore((s) => s.toggleCollapsed)

  const hasChildren = !!node.children && node.children.length > 0
  const expanded = hasChildren && !collapsedIds.has(node.id)

  const onRowClick = () => {
    if (node.onClick) node.onClick()
    else if (hasChildren) toggleCollapsed(node.id)
  }

  return (
    <div role="treeitem" aria-expanded={hasChildren ? expanded : undefined} aria-selected={node.selected}>
      <button
        type="button"
        onClick={onRowClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          width: "100%",
          padding: `${SPACING["1"]} ${SPACING["2"]}`,
          border: "none",
          borderRadius: RADIUS.SM,
          cursor: "pointer",
          textAlign: "left",
          backgroundColor: node.selected ? COLOR.ACCENT_BG : "transparent",
          color: node.selected ? COLOR.ACCENT : COLOR.TEXT_SECONDARY,
          transition: INTERACTION.TRANSITION_BG,
          ...TYPOGRAPHY.STYLE.LABEL_2,
        }}
        onMouseEnter={(e) => {
          if (!node.selected) e.currentTarget.style.backgroundColor = INTERACTION.HOVER_BG
        }}
        onMouseLeave={(e) => {
          if (!node.selected) e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        <span
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation()
              toggleCollapsed(node.id)
            }
          }}
          style={{
            display: "inline-flex",
            width: "12px",
            justifyContent: "center",
            color: COLOR.TEXT_MUTED,
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: `transform ${DURATION.FAST} ${EASE.DEFAULT}`,
          }}
        >
          {hasChildren ? <IconChevron /> : null}
        </span>
        {node.icon ? <span style={{ display: "inline-flex", flexShrink: 0 }}>{node.icon}</span> : null}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {node.label}
        </span>
        {node.badge ? (
          <span style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.WARNING, flexShrink: 0 }}>⚠ {node.badge}</span>
        ) : null}
      </button>

      {expanded && (
        <div
          style={{
            marginLeft: "13px",
            paddingLeft: SPACING["1"],
          }}
        >
          {node.children!.map((child) => (
            <TreeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
