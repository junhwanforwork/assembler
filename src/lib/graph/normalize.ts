// ProjectGraph 정규화 (ASS-019) — /api/generate 가 LLM 원본(unknown)을 그래프 store·캔버스가 믿을 수 있는
// ProjectGraph 로 보정한다. 입력은 파싱 직후 unknown — 캐스팅 금지(엔티티 normalizer 가 좁힌다).
// 순서: 엔티티 정규화 → dangling 정리 → navigate↔edge 정합 → orphan 마킹.
// dangling 배열 id 는 제거(존재 안 하면 참조 의미 없음), 단 navigate 대상은 제거 대신 마킹(none 둔갑 금지).

import type { ProjectGraph, UserFlowEdge } from "@/lib/types/assembler"
import { apiUsedBy, databaseUsedBy, requirementFeatures } from "@/lib/graph/selectors"
import {
  asArray,
  asRecord,
  asString,
  NEEDS_REVIEW,
  normApi,
  normDatabase,
  normFeature,
  normPage,
  normPageFlow,
  normRequirement,
  normUIElement,
  normUserFlow,
  normWireframe,
} from "@/lib/graph/normalize-entities"

export function normalizeGraph(input: unknown): ProjectGraph {
  const root = asRecord(input)
  const graph: ProjectGraph = {
    id: asString(root.id, NEEDS_REVIEW),
    name: asString(root.name, NEEDS_REVIEW),
    description: asString(root.description, NEEDS_REVIEW),
    requirements: asArray(root.requirements).map(normRequirement),
    features: asArray(root.features).map(normFeature),
    pages: asArray(root.pages).map(normPage),
    wireframes: asArray(root.wireframes).map(normWireframe),
    uiElements: asArray(root.uiElements).map(normUIElement),
    apis: asArray(root.apis).map(normApi),
    databases: asArray(root.databases).map(normDatabase),
    pageFlows: asArray(root.pageFlows).map(normPageFlow),
    userFlow: normUserFlow(root.userFlow),
  }

  pruneDanglingRefs(graph)
  reconcileNavigateEdges(graph)
  markOrphans(graph)
  return graph
}

function idSet(items: { id: string }[]): Set<string> {
  return new Set(items.map((it) => it.id))
}

// 존재하는 id만 + 중복 제거 — LLM 이 같은 id 를 반복하면 캔버스·카운트가 부풀므로 정규화에서 정리.
function keepKnown(ids: string[], known: Set<string>): string[] {
  return [...new Set(ids)].filter((id) => known.has(id))
}

function mark(text: string): string {
  return text.startsWith(NEEDS_REVIEW) ? text : `${NEEDS_REVIEW} — ${text}`
}

// edge 는 텍스트 필드가 condition 뿐 — 역방향 정합 위반을 여기에 인라인 마킹(삭제·none 둔갑 금지).
function markEdge(edge: UserFlowEdge): void {
  if (edge.condition !== undefined && edge.condition.startsWith(NEEDS_REVIEW)) return
  edge.condition = edge.condition !== undefined ? mark(edge.condition) : NEEDS_REVIEW
}

// 모든 id 참조가 존재 객체를 가리키도록 정리. 배열 참조는 제거, 스칼라는 검증·마킹/드롭.
function pruneDanglingRefs(graph: ProjectGraph): void {
  const reqIds = idSet(graph.requirements)
  const featIds = idSet(graph.features)
  const pageIds = idSet(graph.pages)
  const wfIds = idSet(graph.wireframes)
  const elIds = idSet(graph.uiElements)
  const apiIds = idSet(graph.apis)
  const dbIds = idSet(graph.databases)
  const pfIds = idSet(graph.pageFlows)

  for (const f of graph.features) {
    f.requirementIds = keepKnown(f.requirementIds, reqIds)
    f.pageIds = keepKnown(f.pageIds, pageIds)
    f.apiIds = keepKnown(f.apiIds, apiIds)
    f.databaseIds = keepKnown(f.databaseIds, dbIds)
  }

  for (const p of graph.pages) {
    p.featureIds = keepKnown(p.featureIds, featIds)
    p.apiIds = keepKnown(p.apiIds, apiIds)
    p.databaseIds = keepKnown(p.databaseIds, dbIds)
    if (!wfIds.has(p.wireframeId)) p.description = mark(p.description)
    if (p.pageFlowId !== undefined && !pfIds.has(p.pageFlowId)) delete p.pageFlowId
  }

  for (const w of graph.wireframes) {
    w.uiElementIds = keepKnown(w.uiElementIds, elIds)
  }

  for (const el of graph.uiElements) {
    el.apiIds = keepKnown(el.apiIds, apiIds)
    el.databaseIds = keepKnown(el.databaseIds, dbIds)
    // navigate 대상이 없는 페이지면 none 으로 둔갑시키지 않고 요소를 마킹 — 의도 보존(ASS-015).
    if (el.result.kind === "navigate" && !pageIds.has(el.result.toPageId)) {
      el.description = mark(el.description)
    }
  }

  for (const a of graph.apis) {
    a.databaseIds = keepKnown(a.databaseIds, dbIds)
  }

  for (const pf of graph.pageFlows) {
    const stepIds = new Set(pf.steps.map((s) => s.id))
    for (const s of pf.steps) s.nextStepIds = keepKnown(s.nextStepIds, stepIds)
  }

  // 페이지 양끝이 유효한 edge 만 유지 — 캔버스가 렌더할 수 없는 edge 제거.
  graph.userFlow.edges = graph.userFlow.edges.filter(
    (e) => pageIds.has(e.fromPageId) && pageIds.has(e.toPageId),
  )
  for (const e of graph.userFlow.edges) {
    if (e.triggerElementId !== undefined && !elIds.has(e.triggerElementId)) delete e.triggerElementId
  }
}

// navigate Result ↔ UserFlow edge 양방향 정합.
//  정방향: navigate 요소에 대응 edge 없으면 생성. 역방향: trigger 가진 edge 가 요소 result 와 어긋나면 마킹.
function reconcileNavigateEdges(graph: ProjectGraph): void {
  const pageIds = idSet(graph.pages)
  // element→page 역산. 중복 element id(두 wireframe 참조) 는 first-wins 로 결정.
  const elementToPage = new Map<string, string>()
  for (const w of graph.wireframes) {
    if (!pageIds.has(w.pageId)) continue
    for (const elId of w.uiElementIds) if (!elementToPage.has(elId)) elementToPage.set(elId, w.pageId)
  }
  const elementById = new Map(graph.uiElements.map((el) => [el.id, el]))

  // 생성 edge id 충돌 회피 — 입력 edge 가 우연히 edge-gen-N 을 써도 빈 id 발급.
  const usedEdgeIds = new Set(graph.userFlow.edges.map((e) => e.id))
  let seq = 0
  const freshEdgeId = (): string => {
    let id = `edge-gen-${seq++}`
    while (usedEdgeIds.has(id)) id = `edge-gen-${seq++}`
    usedEdgeIds.add(id)
    return id
  }

  for (const el of graph.uiElements) {
    if (el.result.kind !== "navigate") continue
    const toPageId = el.result.toPageId
    if (!pageIds.has(toPageId)) continue // dangling 은 pruneDanglingRefs 가 이미 마킹
    const fromPageId = elementToPage.get(el.id)
    if (fromPageId === undefined) continue // 어느 페이지에도 안 속한 요소 — orphan
    if (fromPageId === toPageId) {
      el.description = mark(el.description) // 자기 페이지 navigate 는 stateChange 후보 — 마킹, 자기루프 edge 미생성
      continue
    }
    const exists = graph.userFlow.edges.some(
      (e) =>
        e.toPageId === toPageId &&
        e.fromPageId === fromPageId &&
        (e.triggerElementId === el.id || e.triggerElementId === undefined),
    )
    if (exists) continue
    graph.userFlow.edges.push({ id: freshEdgeId(), fromPageId, toPageId, triggerElementId: el.id })
  }

  // 역방향: trigger 요소 result≠navigate / toPageId 불일치 / fromPageId≠소속 Page / 자기루프 → 마킹.
  for (const e of graph.userFlow.edges) {
    if (e.fromPageId === e.toPageId) {
      markEdge(e)
      continue
    }
    if (e.triggerElementId === undefined) continue // 수동 edge 는 정합 대상 아님
    const el = elementById.get(e.triggerElementId)
    const consistent =
      el !== undefined &&
      el.result.kind === "navigate" &&
      el.result.toPageId === e.toPageId &&
      elementToPage.get(el.id) === e.fromPageId
    if (!consistent) markEdge(e)
  }
}

// 연결 0개 전역 공유 객체(Api/Database)·미충족 Requirement 를 마킹(삭제 금지 — 부분 재생성 복구 가능).
// 역참조 셀렉터는 완성 ProjectGraph 전제라 dangling 정리 후에만 호출한다.
function markOrphans(graph: ProjectGraph): void {
  for (const r of graph.requirements) {
    if (requirementFeatures(graph, r.id).length === 0) r.description = mark(r.description)
  }
  for (const a of graph.apis) {
    const used = apiUsedBy(graph, a.id)
    const inFeature = graph.features.some((f) => f.apiIds.includes(a.id))
    if (used.elementIds.length === 0 && used.pageIds.length === 0 && !inFeature) {
      a.purpose = mark(a.purpose)
    }
  }
  for (const d of graph.databases) {
    const used = databaseUsedBy(graph, d.id)
    if (
      used.featureIds.length === 0 &&
      used.apiIds.length === 0 &&
      used.elementIds.length === 0 &&
      used.pageIds.length === 0
    ) {
      d.purpose = mark(d.purpose)
    }
  }
}
