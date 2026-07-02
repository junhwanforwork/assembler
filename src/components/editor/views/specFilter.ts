import type { Feature, Requirement } from "@/lib/types/assembler"
import type { SpecFilters } from "@/lib/stores/useEditorStore"

// ── 기능명세서 필터(#27)·검색(#29) — 상태·중요도·역할·검색어 AND 결합. 전부 클라이언트. ──
// 필터 상태 자체는 store 소유(인스펙터 점프 가드 #39와 공유) — 여기는 순수 필터 로직만.

export type { SpecFilters } from "@/lib/stores/useEditorStore"
export { EMPTY_SPEC_FILTERS } from "@/lib/stores/useEditorStore"

export function hasActiveSpecFilters(filters: SpecFilters): boolean {
  return (
    filters.status !== "all" || filters.priority !== "all" || filters.role !== "all" || filters.query.trim() !== ""
  )
}

// 역할 옵션은 하드코딩하지 않는다 — design에 실재하는 role 고유값을 동적으로 모은다.
export function collectRoles(requirements: Requirement[]): string[] {
  const roles = new Set<string>()
  for (const r of requirements) {
    const role = r.role.trim()
    if (role) roles.add(role)
  }
  return Array.from(roles).sort((a, b) => a.localeCompare(b, "ko"))
}

// 검색은 요구사항 제목·설명 + 연결된 기능 이름까지 본다(기능으로 찾아 들어오는 경로).
function matchesQuery(requirement: Requirement, featureNames: string[], query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (requirement.title.toLowerCase().includes(q)) return true
  if (requirement.description.toLowerCase().includes(q)) return true
  return featureNames.some((name) => name.toLowerCase().includes(q))
}

// 검색 인덱스 — features가 바뀔 때만 다시 만들면 되므로 필터 호출과 분리(키 입력마다 재구축 방지).
export function buildFeatureNamesByReq(features: Feature[]): Map<string, string[]> {
  const namesByReq = new Map<string, string[]>()
  for (const f of features) {
    for (const reqId of f.requirementIds) {
      const list = namesByReq.get(reqId) ?? []
      list.push(f.name)
      namesByReq.set(reqId, list)
    }
  }
  return namesByReq
}

export function filterRequirements(
  requirements: Requirement[],
  featureNamesByReq: Map<string, string[]>,
  filters: SpecFilters,
): Requirement[] {
  return requirements.filter((r) => {
    if (filters.status !== "all" && r.status !== filters.status) return false
    if (filters.priority !== "all" && r.priority !== filters.priority) return false
    if (filters.role !== "all" && r.role.trim() !== filters.role) return false
    return matchesQuery(r, featureNamesByReq.get(r.id) ?? [], filters.query)
  })
}
