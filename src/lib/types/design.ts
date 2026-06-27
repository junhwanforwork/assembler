import type { WorkspaceDesign } from "./assembler"

// 디자인 그래프 무결성 — 카디널 룰 "모든 것은 연결된다(고립 산출물 금지)"를 코드로 강제한다.

export function createEmptyDesign(): WorkspaceDesign {
  return {
    requirements: [],
    features: [],
    pages: [],
    flows: [],
    wireframes: [],
    elements: [],
  }
}

export type DesignCounts = {
  requirements: number
  features: number
  pages: number
  flows: number
  wireframes: number
  elements: number
}

// 파일(워크스페이스) 카드 메타 — "화면 N · 플로우 N" 등에 쓰는 컬렉션별 개수.
export function designCounts(design: WorkspaceDesign): DesignCounts {
  return {
    requirements: design.requirements.length,
    features: design.features.length,
    pages: design.pages.length,
    flows: design.flows.length,
    wireframes: design.wireframes.length,
    elements: design.elements.length,
  }
}

// 코드-진실(api·db)은 Product 전역이라 디자인 그래프 밖에 산다.
// 그 참조까지 검사하려면 알려진 id 집합을 넘겨준다. 안 넘기면 api/db 참조는 검사 생략.
export type CodeTruthIds = {
  apiIds: Set<string>
  dbTableIds: Set<string>
}

export type DanglingRefKind =
  | "requirement"
  | "page"
  | "wireframe"
  | "element"
  | "api"
  | "dbTable"
  | "flowPage"

// 참조하는데 대상이 없는 끊어진 연결 하나.
export type DanglingRef = {
  from: string
  field: string
  missingId: string
  kind: DanglingRefKind
}

export function findDanglingRefs(design: WorkspaceDesign, codeTruth?: CodeTruthIds): DanglingRef[] {
  const requirementIds = new Set(design.requirements.map((r) => r.id))
  const pageIds = new Set(design.pages.map((p) => p.id))
  const wireframeIds = new Set(design.wireframes.map((w) => w.id))
  const elementIds = new Set(design.elements.map((e) => e.id))

  const refs: DanglingRef[] = []

  for (const feature of design.features) {
    for (const id of feature.requirementIds) {
      if (!requirementIds.has(id)) refs.push({ from: `feature:${feature.id}`, field: "requirementIds", missingId: id, kind: "requirement" })
    }
    for (const id of feature.pageIds) {
      if (!pageIds.has(id)) refs.push({ from: `feature:${feature.id}`, field: "pageIds", missingId: id, kind: "page" })
    }
    if (codeTruth) {
      for (const id of feature.apiIds) {
        if (!codeTruth.apiIds.has(id)) refs.push({ from: `feature:${feature.id}`, field: "apiIds", missingId: id, kind: "api" })
      }
    }
  }

  for (const page of design.pages) {
    if (page.wireframeId !== null && !wireframeIds.has(page.wireframeId)) {
      refs.push({ from: `page:${page.id}`, field: "wireframeId", missingId: page.wireframeId, kind: "wireframe" })
    }
  }

  for (const flow of design.flows) {
    for (const edge of flow.edges) {
      if (!pageIds.has(edge.fromPageId)) refs.push({ from: `flow:${flow.id}/edge:${edge.id}`, field: "fromPageId", missingId: edge.fromPageId, kind: "flowPage" })
      if (!pageIds.has(edge.toPageId)) refs.push({ from: `flow:${flow.id}/edge:${edge.id}`, field: "toPageId", missingId: edge.toPageId, kind: "flowPage" })
    }
  }

  for (const wireframe of design.wireframes) {
    for (const id of wireframe.elementIds) {
      if (!elementIds.has(id)) refs.push({ from: `wireframe:${wireframe.id}`, field: "elementIds", missingId: id, kind: "element" })
    }
  }

  for (const element of design.elements) {
    if (codeTruth) {
      for (const id of element.apiIds) {
        if (!codeTruth.apiIds.has(id)) refs.push({ from: `element:${element.id}`, field: "apiIds", missingId: id, kind: "api" })
      }
      for (const id of element.dbTableIds) {
        if (!codeTruth.dbTableIds.has(id)) refs.push({ from: `element:${element.id}`, field: "dbTableIds", missingId: id, kind: "dbTable" })
      }
    }
  }

  return refs
}
