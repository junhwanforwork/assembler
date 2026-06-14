import type { ProjectGraph, UIElement, Page } from "@/lib/types/assembler"

// ProjectGraph 파생 셀렉터 — 순수 함수. 역참조(Used By)는 저장 안 하고 여기서 계산(object-model.md).
// 스토어(graph.ts)와 뷰가 공유한다. 매핑 완성 판정은 사이드바 뱃지·캔버스 ⚠가 같은 함수를 쓰도록 여기 단일화.

/** UI Element 매핑 완성 여부 — states≥1 + action 있음 + result.kind 존재.
 *  result.kind === "none"(장식)도 완성으로 본다(API/DB 불요). ⚠는 필수 필드 누락만 (builder-layout.md §3.3.1). */
export function isMappingComplete(el: UIElement): boolean {
  if (el.states.length === 0) return false
  if (el.action.trim().length === 0) return false
  return Boolean(el.result?.kind)
}

/** id → 객체 맵 (반복 조회용). */
function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((it) => [it.id, it]))
}

/** Page의 Wireframe에 속한 UI Element들을 순서대로. 페이지/와이어프레임/요소 누락 시 빈 배열. */
export function elementsOfPage(graph: ProjectGraph, pageId: string): UIElement[] {
  const page = graph.pages.find((p) => p.id === pageId)
  if (!page) return []
  const wireframe = graph.wireframes.find((w) => w.id === page.wireframeId)
  if (!wireframe) return []
  const byId = indexById(graph.uiElements)
  return wireframe.uiElementIds
    .map((id) => byId.get(id))
    .filter((el): el is UIElement => Boolean(el))
}

/** Page의 매핑 미완성 요소 수 — Tab 뱃지·프레임 헤더 ⚠N에 사용. */
export function incompleteCount(graph: ProjectGraph, pageId: string): number {
  return elementsOfPage(graph, pageId).filter((el) => !isMappingComplete(el)).length
}

/** Feature 그룹별 Page 목록 (Structure 섹션 IA 그룹핑). 어느 Feature에도 안 속한 페이지는 "" 키로. */
export function pagesByFeature(graph: ProjectGraph): Map<string, Page[]> {
  const result = new Map<string, Page[]>()
  for (const page of graph.pages) {
    const keys = page.featureIds.length > 0 ? page.featureIds : [""]
    for (const key of keys) {
      const list = result.get(key) ?? []
      list.push(page)
      result.set(key, list)
    }
  }
  return result
}

/** Api 역참조 — 이 Api를 호출하는 UIElement·Page id. */
export function apiUsedBy(graph: ProjectGraph, apiId: string): { elementIds: string[]; pageIds: string[] } {
  return {
    elementIds: graph.uiElements.filter((el) => el.apiIds.includes(apiId)).map((el) => el.id),
    pageIds: graph.pages.filter((p) => p.apiIds.includes(apiId)).map((p) => p.id),
  }
}

/** Database 역참조 — 이 Database를 참조하는 Feature·Api·UIElement·Page id. */
export function databaseUsedBy(
  graph: ProjectGraph,
  databaseId: string
): { featureIds: string[]; apiIds: string[]; elementIds: string[]; pageIds: string[] } {
  return {
    featureIds: graph.features.filter((f) => f.databaseIds.includes(databaseId)).map((f) => f.id),
    apiIds: graph.apis.filter((a) => a.databaseIds.includes(databaseId)).map((a) => a.id),
    elementIds: graph.uiElements.filter((el) => el.databaseIds.includes(databaseId)).map((el) => el.id),
    pageIds: graph.pages.filter((p) => p.databaseIds.includes(databaseId)).map((p) => p.id),
  }
}

/** Requirement 역참조 — 이 Requirement를 충족하는 Feature id (Requirement는 relatedFeatureIds 저장 안 함). */
export function requirementFeatures(graph: ProjectGraph, requirementId: string): string[] {
  return graph.features.filter((f) => f.requirementIds.includes(requirementId)).map((f) => f.id)
}
