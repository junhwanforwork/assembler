import type { ProjectGraph } from "@/lib/types/assembler"

// 생성 직후 대시보드 → /project/[id] 이동에서, 방금 만든 그래프를 메모리로 건네 재페치+재정규화를 건너뛴다.
// 생성 응답 그래프는 서버에서 이미 normalizeGraph 를 거쳐 영속되므로, 직접 적재해도 fetch+normalize 와 동일하다.
//
// SPA 내비게이션에서만 유효한 모듈 싱글턴 — 새로고침/딥링크면 비어 있어 GraphProjectClient 가 fetch 로 폴백한다.
// 단일 소비(consume): 한 번 받아가면 비운다. id 가 다르면 건너뛴다(폴백).
let pending: { id: string; graph: ProjectGraph } | null = null

export function stashPendingGraph(id: string, graph: ProjectGraph): void {
  pending = { id, graph }
}

export function consumePendingGraph(id: string): ProjectGraph | null {
  if (pending && pending.id === id) {
    const { graph } = pending
    pending = null
    return graph
  }
  return null
}
