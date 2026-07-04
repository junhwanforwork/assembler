import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { CollectionKey } from "./diff"

// 변경 전파 워커(ASM-029) — 변경된 객체 집합에서 역참조를 따라 "이 변경이 닿는" 전이 영향 집합을 낸다.
// 연결 지도는 diff.ts의 links와 동일한 5종을 뒤집은 것:
//   requirement ← feature(requirementIds) · page ← feature(pageIds) · page ← flow(edges)
//   wireframe ← page(wireframeId) · element ← wireframe(elementIds)
// api·db는 WorkspaceDesign 밖(code-truth)이라 노드가 아니다. 순수 함수 — DB·IO 없음.

export type ImpactRef = { collection: CollectionKey; id: string }

// 역참조 인덱스: "collection:id" → 그 객체를 참조하는 객체들.
// design이 같으면 재사용 — op마다 재구축하지 않는다(specFilter의 인덱스 분리와 같은 이유).
export type ImpactIndex = Map<string, ImpactRef[]>

function refKey(ref: ImpactRef): string {
  return `${ref.collection}:${ref.id}`
}

function addDependent(index: ImpactIndex, target: ImpactRef, dependent: ImpactRef): void {
  const key = refKey(target)
  const list = index.get(key) ?? []
  // 같은 참조가 배열에 중복돼 있어도(병렬 edge 등) 의존자는 한 번만 — 결과 dedupe와 별개로 인덱스도 깨끗하게.
  if (list.some((ref) => ref.collection === dependent.collection && ref.id === dependent.id)) return
  list.push(dependent)
  index.set(key, list)
}

export function buildImpactIndex(design: WorkspaceDesign): ImpactIndex {
  const index: ImpactIndex = new Map()

  for (const feature of design.features) {
    const dependent: ImpactRef = { collection: "features", id: feature.id }
    for (const id of feature.requirementIds) addDependent(index, { collection: "requirements", id }, dependent)
    for (const id of feature.pageIds) addDependent(index, { collection: "pages", id }, dependent)
  }

  for (const page of design.pages) {
    if (page.wireframeId === null) continue
    addDependent(index, { collection: "wireframes", id: page.wireframeId }, { collection: "pages", id: page.id })
  }

  for (const flow of design.flows) {
    const dependent: ImpactRef = { collection: "flows", id: flow.id }
    for (const edge of flow.edges) {
      addDependent(index, { collection: "pages", id: edge.fromPageId }, dependent)
      addDependent(index, { collection: "pages", id: edge.toPageId }, dependent)
    }
  }

  for (const wireframe of design.wireframes) {
    const dependent: ImpactRef = { collection: "wireframes", id: wireframe.id }
    for (const id of wireframe.elementIds) addDependent(index, { collection: "elements", id }, dependent)
  }

  return index
}

// BFS — 시드 자신은 제외, visited로 중복·순환(손상 데이터 가정) 차단.
// 결과 순서는 전파 거리순(가까운 영향부터) → UI 칩 나열이 결정적이다.
export function collectImpact(index: ImpactIndex, seeds: ImpactRef[]): ImpactRef[] {
  const visited = new Set(seeds.map(refKey))
  const queue: ImpactRef[] = seeds.slice()
  const result: ImpactRef[] = []

  for (let i = 0; i < queue.length; i += 1) {
    const dependents = index.get(refKey(queue[i])) ?? []
    for (const ref of dependents) {
      const key = refKey(ref)
      if (visited.has(key)) continue
      visited.add(key)
      result.push(ref)
      queue.push(ref)
    }
  }

  return result
}
