"use client"

import { type FC, useMemo } from "react"
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { useGraphStore } from "@/lib/store/graph"
import { buildGraphTree } from "@/lib/assembler/graph-selectors"
import { TreeRow } from "./TreeRow"

// 좌측 객체 네비게이터 — ProjectGraph를 "Requirement → … → UI Element" 계층 +
// 전역 공유 객체(API·DB) 섹션으로 그린다. 코드 에디터의 파일 트리에 대응.

export const ObjectTree: FC = () => {
  const graph = useGraphStore((s) => s.graph)
  const tree = useMemo(() => (graph ? buildGraphTree(graph) : null), [graph])

  if (!graph || !tree) {
    return (
      <div style={{ padding: SPACING["4"] }}>
        <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED }}>
          아직 만든 그래프가 없어요. 제품 아이디어를 입력해 시작해 보세요.
        </p>
      </div>
    )
  }

  return (
    <div role="tree" aria-label="제품 객체 트리" style={{ padding: SPACING["2"] }}>
      <SectionLabel text="요구사항" />
      {tree.roots.map((node) => (
        <TreeRow key={`${node.type}:${node.id}`} node={node} depth={0} />
      ))}

      <div style={{ height: SPACING["4"] }} />
      <SectionLabel text="공유 객체" />
      {tree.apis.map((node) => (
        <TreeRow key={`${node.type}:${node.id}`} node={node} depth={0} />
      ))}
      {tree.databases.map((node) => (
        <TreeRow key={`${node.type}:${node.id}`} node={node} depth={0} />
      ))}
    </div>
  )
}

const SectionLabel: FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      ...TYPOGRAPHY.STYLE.LABEL_2,
      color: COLOR.TEXT_MUTED,
      padding: `${SPACING["1"]} ${SPACING["2"]}`,
      textTransform: "uppercase",
    }}
  >
    {text}
  </div>
)
