import type { DocLink, ProjectGraph } from "@/lib/types/assembler"
import type { GraphNodeType, GraphSelection } from "@/lib/store/graph"

// ProjectGraph(평면 컬렉션 + id 참조)를 트리/배지로 파생하는 순수 함수 모음.
// 역참조(Used By/Triggered By)는 저장하지 않으므로 여기서 조회 시 계산한다 (object-model.md).

/** 트리 한 행 — 종류·id·라벨 + 고립 여부 + 자식. 화면은 이 구조만 렌더한다. */
export type TreeNode = {
  type: GraphNodeType
  id: string
  label: string
  /** 보조 텍스트(메서드·경로 등). 없으면 미표시. */
  sublabel?: string
  /** 카디널 룰 1 위반(연결 0개) — ⚠ 배지로 표시. */
  isolated: boolean
  children: TreeNode[]
}

/** 요구사항 루트 + 미연결 Feature를 루트로 끌어올린 계층. globals는 별도. */
export type GraphTree = {
  /** 요구사항 → Feature → Page → UI Element 계층 + 부모 없는 Feature(루트). */
  roots: TreeNode[]
  /** 전역 공유 객체 — API. */
  apis: TreeNode[]
  /** 전역 공유 객체 — Database. */
  databases: TreeNode[]
}

// ─── 고립 감지 (object-model.md: 모든 객체는 최소 1개 연결) ───────────────────

const isApiReferenced = (g: ProjectGraph, apiId: string): boolean =>
  g.uiElements.some((e) => e.apiIds.includes(apiId)) ||
  g.pages.some((p) => p.apiIds.includes(apiId)) ||
  g.features.some((f) => f.apiIds.includes(apiId))

const isDatabaseReferenced = (g: ProjectGraph, dbId: string): boolean =>
  g.uiElements.some((e) => e.databaseIds.includes(dbId)) ||
  g.apis.some((a) => a.databaseIds.includes(dbId)) ||
  g.pages.some((p) => p.databaseIds.includes(dbId)) ||
  g.features.some((f) => f.databaseIds.includes(dbId))

const isRequirementIsolated = (g: ProjectGraph, reqId: string): boolean =>
  !g.features.some((f) => f.requirementIds.includes(reqId))

// Feature는 요구사항·Page 어디에도 안 붙으면 고립.
const isFeatureIsolated = (f: ProjectGraph["features"][number]): boolean =>
  f.requirementIds.length === 0 && f.pageIds.length === 0

// Page는 구현하는 Feature가 없으면 고립.
const isPageIsolated = (p: ProjectGraph["pages"][number]): boolean =>
  p.featureIds.length === 0

// UI Element는 Mapping(API·DB·이동 결과)이 전무하면 미연결 (카디널 룰 3).
// 장식 요소는 result:none이 정상이므로, 셋 다 비었을 때만 플래그.
const isElementIsolated = (e: ProjectGraph["uiElements"][number]): boolean =>
  e.apiIds.length === 0 &&
  e.databaseIds.length === 0 &&
  e.result.kind === "none"

// ─── 트리 빌드 ────────────────────────────────────────────────────────────────

const elementChildren = (g: ProjectGraph, wireframeId: string): TreeNode[] => {
  const wireframe = g.wireframes.find((w) => w.id === wireframeId)
  if (!wireframe) return []
  return wireframe.uiElementIds
    .map((eid) => g.uiElements.find((e) => e.id === eid))
    .filter((e): e is ProjectGraph["uiElements"][number] => !!e)
    .map((e) => ({
      type: "uiElement" as const,
      id: e.id,
      label: e.name,
      sublabel: e.type,
      isolated: isElementIsolated(e),
      children: [],
    }))
}

const pageChildren = (g: ProjectGraph, featureId: string): TreeNode[] =>
  g.pages
    .filter((p) => p.featureIds.includes(featureId))
    .map((p) => ({
      type: "page" as const,
      id: p.id,
      label: p.name,
      isolated: isPageIsolated(p),
      children: elementChildren(g, p.wireframeId),
    }))

const featureNode = (
  g: ProjectGraph,
  f: ProjectGraph["features"][number]
): TreeNode => ({
  type: "feature",
  id: f.id,
  label: f.name,
  isolated: isFeatureIsolated(f),
  children: pageChildren(g, f.id),
})

/** ProjectGraph → 화면 렌더용 트리. 부모 없는 Feature는 루트로 끌어올려 숨기지 않는다. */
export function buildGraphTree(g: ProjectGraph): GraphTree {
  const parentedFeatureIds = new Set<string>()

  const requirementRoots: TreeNode[] = g.requirements.map((r) => {
    const features = g.features.filter((f) => f.requirementIds.includes(r.id))
    features.forEach((f) => parentedFeatureIds.add(f.id))
    return {
      type: "requirement" as const,
      id: r.id,
      label: r.title,
      isolated: isRequirementIsolated(g, r.id),
      children: features.map((f) => featureNode(g, f)),
    }
  })

  const orphanFeatureRoots: TreeNode[] = g.features
    .filter((f) => !parentedFeatureIds.has(f.id))
    .map((f) => featureNode(g, f))

  const apis: TreeNode[] = g.apis.map((a) => ({
    type: "api" as const,
    id: a.id,
    label: a.path,
    sublabel: a.method,
    isolated: !isApiReferenced(g, a.id),
    children: [],
  }))

  const databases: TreeNode[] = g.databases.map((d) => ({
    type: "database" as const,
    id: d.id,
    label: d.name,
    isolated: !isDatabaseReferenced(g, d.id),
    children: [],
  }))

  return { roots: [...requirementRoots, ...orphanFeatureRoots], apis, databases }
}

/** 인스펙터용 선택 객체 상세 — 이름·부가라벨·설명·문서 링크. null = 선택 없음 또는 dangling. */
export type NodeDetail = {
  type: GraphNodeType
  label: string
  sublabel?: string
  description: string
  links: DocLink[]
}

export function resolveNodeDetail(g: ProjectGraph, selection: GraphSelection): NodeDetail | null {
  if (!selection) return null
  const { type, id } = selection
  switch (type) {
    case "requirement": {
      const r = g.requirements.find((x) => x.id === id)
      return r ? { type, label: r.title, description: r.description, links: r.links ?? [] } : null
    }
    case "feature": {
      const f = g.features.find((x) => x.id === id)
      return f ? { type, label: f.name, description: f.description, links: f.links ?? [] } : null
    }
    case "page": {
      const p = g.pages.find((x) => x.id === id)
      return p ? { type, label: p.name, description: p.description, links: p.links ?? [] } : null
    }
    case "uiElement": {
      const e = g.uiElements.find((x) => x.id === id)
      return e
        ? { type, label: e.name, sublabel: e.type, description: e.description, links: e.links ?? [] }
        : null
    }
    case "api": {
      const a = g.apis.find((x) => x.id === id)
      return a
        ? { type, label: a.path, sublabel: a.method, description: a.purpose, links: a.links ?? [] }
        : null
    }
    case "database": {
      const d = g.databases.find((x) => x.id === id)
      return d ? { type, label: d.name, description: d.purpose, links: d.links ?? [] } : null
    }
  }
}

/** 전체 그래프의 고립 객체 수 — 우측 패널 "연결 무결성"에서 사용(다음 슬라이스). */
export function countIsolated(tree: GraphTree): number {
  let count = 0
  const walk = (n: TreeNode) => {
    if (n.isolated) count++
    n.children.forEach(walk)
  }
  tree.roots.forEach(walk)
  tree.apis.forEach(walk)
  tree.databases.forEach(walk)
  return count
}
