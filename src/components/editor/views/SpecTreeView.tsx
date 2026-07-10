"use client"

import { useMemo } from "react"
import { clsx } from "clsx"
import type { Feature, Requirement, WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { flowEdgePath } from "./flowUtils"
import { layoutSpecTree, TREE_NODE_H, TREE_NODE_W, TREE_ROOT_W } from "./specTreeUtils"
import { SpecItemMenu } from "../SpecItemMenu"
import m from "../SpecItemMenu.module.css"
import s from "../editor.module.css"

// 트리뷰 — PRD 루트 → 요구사항 → 선택 요구사항의 기능(flow-view-pattern).
// 노드 클릭이 store 선택을 바꾸므로 디렉토리 뷰와 같은 선택을 공유한다(#41). hover 강조는 CSS(#40).
export function SpecTreeView({
  requirements,
  features,
  selectedReqId,
  selectedFeatureId,
  workspaceId,
  design,
}: {
  requirements: Requirement[]
  features: Feature[]
  selectedReqId: string | null
  selectedFeatureId: string | null
  // 아이템 3dot 메뉴(ASM-081)의 유료 제안 호출·점프 해석용.
  workspaceId: string
  design: WorkspaceDesign
}) {
  const selectSpecReq = useEditorStore((st) => st.selectSpecReq)
  const selectSpecFeature = useEditorStore((st) => st.selectSpecFeature)

  const layout = useMemo(
    () => layoutSpecTree(requirements, features, selectedReqId),
    [requirements, features, selectedReqId],
  )

  if (requirements.length === 0) {
    return (
      <div className={s.emptyCol} style={{ flex: 1 }}>
        조건에 맞는 요구사항이 없어요. 필터를 풀거나 검색어를 바꿔보세요.
      </div>
    )
  }

  return (
    <div className={s.flowScroll}>
      <div
        className={s.flowCanvas}
        style={{ width: layout.width, height: layout.height, minWidth: layout.width, minHeight: layout.height }}
      >
        <svg className={s.flowEdges} width={layout.width} height={layout.height}>
          {layout.edges.map((edge) => (
            <path
              key={edge.id}
              d={flowEdgePath(edge)}
              fill="none"
              stroke={edge.brand ? "var(--brand)" : "var(--edge)"}
              strokeWidth={edge.brand ? 1.5 : 1}
            />
          ))}
        </svg>

        <div
          className={clsx(s.tnode, s.tnodeRoot)}
          style={{ left: layout.root.x, top: layout.root.y, width: TREE_ROOT_W, height: TREE_NODE_H }}
        >
          PRD
        </div>

        {layout.reqNodes.map((n) => (
          <div key={n.req.id}>
            <button
              className={clsx(s.tnode, n.req.id === selectedReqId && s.tnodeSel)}
              style={{ left: n.x, top: n.y, width: TREE_NODE_W, height: TREE_NODE_H }}
              onClick={() => selectSpecReq(n.req.id)}
            >
              <span className={s.flowNodeName}>{n.req.title}</span>
            </button>
            {/* 노드 우상단 오버레이 — 노드 버튼과 형제(버튼 중첩 회피). 좌표는 노드 배치를 따른다. */}
            <div className={m.overNode} style={{ left: n.x + TREE_NODE_W - 28, top: n.y + 4 }}>
              <SpecItemMenu workspaceId={workspaceId} design={design} kind="requirement" />
            </div>
          </div>
        ))}

        {layout.featNodes.map((n) => (
          <div key={n.feature.id}>
            <button
              className={clsx(s.tnode, n.feature.id === selectedFeatureId && s.tnodeSel)}
              style={{ left: n.x, top: n.y, width: TREE_NODE_W, height: TREE_NODE_H }}
              onClick={() => selectSpecFeature(n.feature.id)}
            >
              <span className={s.flowNodeName}>{n.feature.name}</span>
            </button>
            <div className={m.overNode} style={{ left: n.x + TREE_NODE_W - 28, top: n.y + 4 }}>
              <SpecItemMenu workspaceId={workspaceId} design={design} kind="feature" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
