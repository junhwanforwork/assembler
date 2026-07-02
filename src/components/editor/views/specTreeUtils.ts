import type { Feature, Requirement } from "@/lib/types/assembler"

// ── 기능명세서 트리뷰 레이아웃(flow-view-pattern) — PRD 루트 → 요구사항 → 선택 요구사항의 기능. ──

export const TREE_ROOT_W = 96
export const TREE_NODE_W = 192
export const TREE_NODE_H = 36
export const TREE_V_GAP = 14
export const TREE_COL_GAP = 88
export const TREE_X0 = 32
export const TREE_Y0 = 24

export type SpecTreeReqNode = { req: Requirement; x: number; y: number }
export type SpecTreeFeatNode = { feature: Feature; x: number; y: number }
export type SpecTreeEdge = { id: string; x1: number; y1: number; x2: number; y2: number; brand: boolean }

export type SpecTreeLayout = {
  root: { x: number; y: number }
  reqNodes: SpecTreeReqNode[]
  featNodes: SpecTreeFeatNode[]
  edges: SpecTreeEdge[]
  width: number
  height: number
}

export function layoutSpecTree(
  requirements: Requirement[],
  features: Feature[],
  selectedReqId: string | null,
): SpecTreeLayout {
  const xReq = TREE_X0 + TREE_ROOT_W + TREE_COL_GAP
  const xFeat = xReq + TREE_NODE_W + TREE_COL_GAP

  const reqNodes: SpecTreeReqNode[] = requirements.map((req, i) => ({
    req,
    x: xReq,
    y: TREE_Y0 + i * (TREE_NODE_H + TREE_V_GAP),
  }))

  // 루트는 요구사항 컬럼 세로 중앙.
  const reqColH =
    reqNodes.length === 0 ? 0 : reqNodes.length * TREE_NODE_H + (reqNodes.length - 1) * TREE_V_GAP
  const root = { x: TREE_X0, y: TREE_Y0 + Math.max(0, reqColH / 2 - TREE_NODE_H / 2) }

  // 기능 컬럼은 선택한 요구사항 노드 주변으로 정렬하되 캔버스 위(Y0)로는 안 나간다.
  const selNode = selectedReqId ? reqNodes.find((n) => n.req.id === selectedReqId) : undefined
  const selFeatures = selNode ? features.filter((f) => f.requirementIds.includes(selNode.req.id)) : []
  const featColH =
    selFeatures.length === 0 ? 0 : selFeatures.length * TREE_NODE_H + (selFeatures.length - 1) * TREE_V_GAP
  const featYStart = selNode ? Math.max(TREE_Y0, selNode.y + TREE_NODE_H / 2 - featColH / 2) : TREE_Y0
  const featNodes: SpecTreeFeatNode[] = selFeatures.map((feature, i) => ({
    feature,
    x: xFeat,
    y: featYStart + i * (TREE_NODE_H + TREE_V_GAP),
  }))

  const edges: SpecTreeEdge[] = []
  for (const n of reqNodes) {
    edges.push({
      id: `root-${n.req.id}`,
      x1: root.x + TREE_ROOT_W,
      y1: root.y + TREE_NODE_H / 2,
      x2: n.x,
      y2: n.y + TREE_NODE_H / 2,
      brand: false,
    })
  }
  if (selNode) {
    for (const n of featNodes) {
      edges.push({
        id: `${selNode.req.id}-${n.feature.id}`,
        x1: selNode.x + TREE_NODE_W,
        y1: selNode.y + TREE_NODE_H / 2,
        x2: n.x,
        y2: n.y + TREE_NODE_H / 2,
        brand: true,
      })
    }
  }

  const ys = [root.y, ...reqNodes.map((n) => n.y), ...featNodes.map((n) => n.y)]
  const maxBottom = requirements.length === 0 ? 0 : Math.max(...ys) + TREE_NODE_H
  return {
    root,
    reqNodes,
    featNodes,
    edges,
    width: xFeat + TREE_NODE_W + TREE_X0,
    height: maxBottom + TREE_Y0,
  }
}
