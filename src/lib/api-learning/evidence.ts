import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"

// API 해석(ASM-064) 환각 방어 1층 — 입력 셰이핑(db-learning evidence 미러).
// 증거 = 코드-진실(api 사실) + 역참조(이 API를 참조하는 Feature 이름 + 그 기능들의 dbTableIds로 닿는
// 테이블 이름)만. ASM-052 이후 기능이 API·DB 연결의 1급 주인이라 역참조 경로는 Feature 하나다.

export type ApiEvidence = {
  api: Api
  // 이 API를 apiIds에 가진 기능 이름들(중복 제거).
  usedByFeatures: string[]
  // 그 기능들의 dbTableIds가 가리키는 실재 테이블 이름들(중복 제거, 미존재 id는 드롭).
  relatedTables: string[]
  // 둘 다 비면 고립 → 설명을 method·endpoint 사실로만 보수적으로 강등한다.
  isIsolated: boolean
}

export function buildApiEvidence(target: Api, dbTables: DbTable[], design: WorkspaceDesign): ApiEvidence {
  const features = design.features.filter((f) => f.apiIds.includes(target.id))

  const usedByFeatures = [...new Set(features.map((f) => f.name))]

  const tableNameById = new Map(dbTables.map((t) => [t.id, t.name]))
  const relatedTables: string[] = []
  for (const f of features) {
    for (const tableId of f.dbTableIds ?? []) {
      const name = tableNameById.get(tableId)
      if (name !== undefined && !relatedTables.includes(name)) relatedTables.push(name)
    }
  }

  const isIsolated = usedByFeatures.length === 0 && relatedTables.length === 0
  return { api: target, usedByFeatures, relatedTables, isIsolated }
}
