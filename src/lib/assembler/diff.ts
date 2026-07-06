import type { Flow, WorkspaceDesign } from "@/lib/types/assembler"

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
  // 배열 vs 인덱스 키 객체가 객체 분기로 떨어져 동등 판정되는 것 차단 —
  // 파서가 미지 필드를 스프레드로 통과시켜 passthrough 필드에서 도달 가능.
  if (Array.isArray(a) !== Array.isArray(b)) return false
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

// id 멀티셋 비교 — 순서 무시(순서 변경은 modified가 잡는다), 다중도 반영.
// 같은 페이지쌍의 병렬 edge("두 버튼이 같은 페이지로 이동")가 정상 데이터라 Set이면 소실된다.
// 결과는 등장 순서 유지, 개수 변화분만큼 방출.
function diffIdMultisets(oldIds: string[], newIds: string[]): { added: string[]; removed: string[] } {
  const countDelta = new Map<string, number>()
  for (const id of newIds) countDelta.set(id, (countDelta.get(id) ?? 0) + 1)
  for (const id of oldIds) countDelta.set(id, (countDelta.get(id) ?? 0) - 1)

  const remaining = new Map(countDelta)
  const added: string[] = []
  for (const id of newIds) {
    const n = remaining.get(id) ?? 0
    if (n > 0) {
      added.push(id)
      remaining.set(id, n - 1)
    }
  }
  const removed: string[] = []
  for (const id of oldIds) {
    const n = remaining.get(id) ?? 0
    if (n < 0) {
      removed.push(id)
      remaining.set(id, n + 1)
    }
  }
  return { added, removed }
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
  const { added, removed } = diffIdMultisets(oldIds, newIds)
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

  for (const { oldItem, newItem } of features.survivors) {
    pushLinkDelta(links, `feature:${newItem.id}`, "requirementIds", oldItem.requirementIds, newItem.requirementIds)
    pushLinkDelta(links, `feature:${newItem.id}`, "pageIds", oldItem.pageIds, newItem.pageIds)
    pushLinkDelta(links, `feature:${newItem.id}`, "apiIds", oldItem.apiIds, newItem.apiIds)
    // ASM-052 승격 — 필드 부재(레거시 저장본)는 빈 연결로 비교한다.
    pushLinkDelta(links, `feature:${newItem.id}`, "dbTableIds", oldItem.dbTableIds ?? [], newItem.dbTableIds ?? [])
  }

  for (const { oldItem, newItem } of pages.survivors) {
    // 스칼라 참조는 원소 0~1개짜리 집합으로 — 교체는 removed+added, 해제는 removed만.
    pushLinkDelta(
      links,
      `page:${newItem.id}`,
      "wireframeId",
      oldItem.wireframeId === null ? [] : [oldItem.wireframeId],
      newItem.wireframeId === null ? [] : [newItem.wireframeId]
    )
  }

  for (const { oldItem, newItem } of flows.survivors) {
    pushLinkDelta(links, `flow:${newItem.id}`, "edges", edgeDescriptors(oldItem), edgeDescriptors(newItem))
  }

  for (const { oldItem, newItem } of wireframes.survivors) {
    pushLinkDelta(links, `wireframe:${newItem.id}`, "elementIds", oldItem.elementIds, newItem.elementIds)
  }

  for (const { oldItem, newItem } of elements.survivors) {
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

// ─────────────── 활동 metadata 캡 ───────────────

// 전량 교체급 저장(컬렉션 캡 300 기준 id 수천 개)은 델타 직렬화가 수백 KB까지 자라
// asm_activity 행과 타임라인 목록 응답을 폭증시킨다 — counts(정수 6개) 시절엔 없던 상한 문제.
export const MAX_ACTIVITY_DELTA_BYTES = 16 * 1024

// 캡 초과 시의 개수 요약 — id 목록은 버리되 규모는 남긴다. truncated가 판별자.
export type DeltaCounts = {
  truncated: true
  collections: { [K in CollectionKey]: { added: number; removed: number; modified: number } }
  links: number
}

export type ActivityDelta = DesignDelta | DeltaCounts

function countCollection(delta: CollectionDelta): { added: number; removed: number; modified: number } {
  return { added: delta.added.length, removed: delta.removed.length, modified: delta.modified.length }
}

export function toActivityDelta(delta: DesignDelta): ActivityDelta {
  if (new TextEncoder().encode(JSON.stringify(delta)).length <= MAX_ACTIVITY_DELTA_BYTES) return delta
  return {
    truncated: true,
    collections: {
      requirements: countCollection(delta.collections.requirements),
      features: countCollection(delta.collections.features),
      pages: countCollection(delta.collections.pages),
      flows: countCollection(delta.collections.flows),
      wireframes: countCollection(delta.collections.wireframes),
      elements: countCollection(delta.collections.elements),
    },
    links: delta.links.length,
  }
}
