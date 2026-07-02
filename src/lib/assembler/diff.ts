import type { Feature, Flow, Page, UIElement, WorkspaceDesign, Wireframe } from "@/lib/types/assembler"

// 변경 델타(north-star-audit P1) — 저장 직전 old/new 디자인 그래프를 구조 비교해
// "무엇이 바뀌었나"를 객체·연결 단위로 남긴다. counts는 규모만 말하고 변경은 못 말한다.
// 순수 함수 — DB·IO 없음. asm_activity.metadata에 그대로 직렬화된다.

export type CollectionKey = keyof WorkspaceDesign

// 컬렉션 하나의 객체 단위 델타. modified = 같은 id인데 내용이 달라진 것(연결 변경 포함).
export type CollectionDelta = {
  added: string[]
  removed: string[]
  modified: string[]
}

// 연결(참조) 한 자리의 변경. from은 DanglingRef와 같은 "kind:id" 표기.
// field가 "edges"면 added/removed는 "fromPageId->toPageId" 페이지쌍 디스크립터 —
// edge id는 페이지 맥락이 없어 타임라인에서 복원이 안 된다.
export type LinkDelta = {
  from: string
  field: string
  added: string[]
  removed: string[]
}

export type DesignDelta = {
  collections: { [K in CollectionKey]: CollectionDelta }
  links: LinkDelta[]
}

// ─────────────── 내부 유틸 ───────────────

// JSON 값 전용 구조 동등성 — 키 순서 무시. JSON.stringify 비교는 DB 저장본과
// 요청 본문의 키 순서가 달라 오탐하므로 쓰지 않는다.
function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, i) => isDeepEqual(item, b[i]))
  }
  if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length !== bKeys.length) return false
    const aRecord = a as Record<string, unknown>
    const bRecord = b as Record<string, unknown>
    return aKeys.every((key) => key in bRecord && isDeepEqual(aRecord[key], bRecord[key]))
  }
  return false
}

// id 집합 비교 — 순서 무시(순서 변경은 modified가 잡는다). 결과는 등장 순서 유지.
function diffIdSets(oldIds: string[], newIds: string[]): { added: string[]; removed: string[] } {
  const oldSet = new Set(oldIds)
  const newSet = new Set(newIds)
  return {
    added: newIds.filter((id) => !oldSet.has(id)),
    removed: oldIds.filter((id) => !newSet.has(id)),
  }
}

// 같은 id로 살아남은 (old, new) 쌍 — 연결 델타는 이 쌍에서만 뽑는다.
// 추가/삭제된 객체의 연결까지 links로 내면 객체 델타와 중복된다.
type SurvivorPair<T> = { oldItem: T; newItem: T }

function diffCollection<T extends { id: string }>(
  oldItems: T[],
  newItems: T[]
): { delta: CollectionDelta; survivors: SurvivorPair<T>[] } {
  const oldById = new Map(oldItems.map((item) => [item.id, item]))
  const newById = new Map(newItems.map((item) => [item.id, item]))

  const added = newItems.filter((item) => !oldById.has(item.id)).map((item) => item.id)
  const removed = oldItems.filter((item) => !newById.has(item.id)).map((item) => item.id)

  const modified: string[] = []
  const survivors: SurvivorPair<T>[] = []
  for (const newItem of newItems) {
    const oldItem = oldById.get(newItem.id)
    if (!oldItem) continue
    survivors.push({ oldItem, newItem })
    if (!isDeepEqual(oldItem, newItem)) modified.push(newItem.id)
  }

  return { delta: { added, removed, modified }, survivors }
}

function pushLinkDelta(links: LinkDelta[], from: string, field: string, oldIds: string[], newIds: string[]): void {
  const { added, removed } = diffIdSets(oldIds, newIds)
  if (added.length > 0 || removed.length > 0) links.push({ from, field, added, removed })
}

function edgeDescriptors(flow: Flow): string[] {
  return flow.edges.map((edge) => `${edge.fromPageId}->${edge.toPageId}`)
}

// ─────────────── 공개 API ───────────────

export function diffDesign(oldDesign: WorkspaceDesign, newDesign: WorkspaceDesign): DesignDelta {
  const requirements = diffCollection(oldDesign.requirements, newDesign.requirements)
  const features = diffCollection(oldDesign.features, newDesign.features)
  const pages = diffCollection(oldDesign.pages, newDesign.pages)
  const flows = diffCollection(oldDesign.flows, newDesign.flows)
  const wireframes = diffCollection(oldDesign.wireframes, newDesign.wireframes)
  const elements = diffCollection(oldDesign.elements, newDesign.elements)

  const links: LinkDelta[] = []

  for (const { oldItem, newItem } of features.survivors as SurvivorPair<Feature>[]) {
    pushLinkDelta(links, `feature:${newItem.id}`, "requirementIds", oldItem.requirementIds, newItem.requirementIds)
    pushLinkDelta(links, `feature:${newItem.id}`, "pageIds", oldItem.pageIds, newItem.pageIds)
    pushLinkDelta(links, `feature:${newItem.id}`, "apiIds", oldItem.apiIds, newItem.apiIds)
  }

  for (const { oldItem, newItem } of pages.survivors as SurvivorPair<Page>[]) {
    // 스칼라 참조는 원소 0~1개짜리 집합으로 — 교체는 removed+added, 해제는 removed만.
    pushLinkDelta(
      links,
      `page:${newItem.id}`,
      "wireframeId",
      oldItem.wireframeId === null ? [] : [oldItem.wireframeId],
      newItem.wireframeId === null ? [] : [newItem.wireframeId]
    )
  }

  for (const { oldItem, newItem } of flows.survivors as SurvivorPair<Flow>[]) {
    pushLinkDelta(links, `flow:${newItem.id}`, "edges", edgeDescriptors(oldItem), edgeDescriptors(newItem))
  }

  for (const { oldItem, newItem } of wireframes.survivors as SurvivorPair<Wireframe>[]) {
    pushLinkDelta(links, `wireframe:${newItem.id}`, "elementIds", oldItem.elementIds, newItem.elementIds)
  }

  for (const { oldItem, newItem } of elements.survivors as SurvivorPair<UIElement>[]) {
    pushLinkDelta(links, `element:${newItem.id}`, "apiIds", oldItem.apiIds, newItem.apiIds)
    pushLinkDelta(links, `element:${newItem.id}`, "dbTableIds", oldItem.dbTableIds, newItem.dbTableIds)
  }

  return {
    collections: {
      requirements: requirements.delta,
      features: features.delta,
      pages: pages.delta,
      flows: flows.delta,
      wireframes: wireframes.delta,
      elements: elements.delta,
    },
    links,
  }
}
