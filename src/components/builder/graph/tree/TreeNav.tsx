"use client"

import { type FC, type ReactNode } from "react"
import { TreeRow } from "./TreeRow"

// Tab 내비 공용 트리 모델 — 섹션별 빌더가 graph → TreeNode[]로 변환해 넘긴다.
export type TreeNode = {
  id: string
  label: string
  icon?: ReactNode
  /** 매핑 미완성 등 경고 수 (>0이면 ⚠N). */
  badge?: number
  selected?: boolean
  /** 리프 선택 동작. 없으면 행 클릭 = 펼침 토글(그룹). */
  onClick?: () => void
  children?: TreeNode[]
}

// 풀 VS Code식 접이식 트리. role=tree, 각 노드 TreeRow 재귀.
export const TreeNav: FC<{ nodes: TreeNode[]; label: string }> = ({ nodes, label }) => (
  <div role="tree" aria-label={label}>
    {nodes.map((n) => (
      <TreeRow key={n.id} node={n} depth={0} />
    ))}
  </div>
)
