import type { Feature, Priority, Requirement, RequirementStatus } from "@/lib/types/assembler"

// ── 기능명세서 필터(#27)·검색(#29) — 상태·중요도·역할·검색어 AND 결합. 전부 클라이언트. ──

export type SpecFilters = {
  status: RequirementStatus | "all"
  priority: Priority | "all"
  role: string | "all"
  query: string
}

export const EMPTY_SPEC_FILTERS: SpecFilters = { status: "all", priority: "all", role: "all", query: "" }

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

export function filterRequirements(
  requirements: Requirement[],
  features: Feature[],
  filters: SpecFilters,
): Requirement[] {
  const namesByReq = new Map<string, string[]>()
  for (const f of features) {
    for (const reqId of f.requirementIds) {
      const list = namesByReq.get(reqId) ?? []
      list.push(f.name)
      namesByReq.set(reqId, list)
    }
  }

  return requirements.filter((r) => {
    if (filters.status !== "all" && r.status !== filters.status) return false
    if (filters.priority !== "all" && r.priority !== filters.priority) return false
    if (filters.role !== "all" && r.role.trim() !== filters.role) return false
    return matchesQuery(r, namesByReq.get(r.id) ?? [], filters.query)
  })
}
