import type { DbTable, WorkspaceDesign } from "@/lib/types/assembler"

// DB Learning 환각 방어 1층 — 입력 셰이핑.
// AI에 "근거로 쓸 연결"만 모아 넘긴다. 연결이 있으면 풍부하게, 고립이면 보수적으로 설명하도록.
// 증거 = code-truth(FK) + 저작(UIElement 역참조). AI가 지어낸 게 아니라 그래프에서 추출한 사실만.

// 이 테이블이 참조하는 다른 테이블(나가는 FK). references="table.column" 에서 table 추출.
export type FkOut = { column: string; refTable: string }
// 이 테이블을 참조하는 다른 테이블(들어오는 FK).
export type FkIn = { fromTable: string; column: string }
// 이 테이블 id를 dbTableIds 에 가진 UIElement(이 테이블을 쓰는 화면 요소).
export type UsedBy = { elementLabel: string; action: string }

export type TableEvidence = {
  table: DbTable
  fkOut: FkOut[]
  fkIn: FkIn[]
  usedBy: UsedBy[]
  // 셋 다 비면 고립 → 설명을 컬럼 사실로만 보수적으로 강등한다.
  isIsolated: boolean
}

// "table.column" → "table". 형식이 어긋나면(점 없음) 통째로 테이블명으로 본다.
function refTableOf(reference: string): string {
  const dot = reference.indexOf(".")
  return dot >= 0 ? reference.slice(0, dot) : reference
}

export function buildTableEvidence(target: DbTable, allTables: DbTable[], design: WorkspaceDesign): TableEvidence {
  const fkOut: FkOut[] = target.columns
    .filter((col) => typeof col.references === "string" && col.references.length > 0)
    .map((col) => ({ column: col.name, refTable: refTableOf(col.references as string) }))

  const fkIn: FkIn[] = []
  for (const other of allTables) {
    if (other.id === target.id) continue
    for (const col of other.columns) {
      if (typeof col.references === "string" && refTableOf(col.references) === target.name) {
        fkIn.push({ fromTable: other.name, column: col.name })
      }
    }
  }

  const usedBy: UsedBy[] = design.elements
    .filter((el) => el.dbTableIds.includes(target.id))
    .map((el) => ({ elementLabel: el.label, action: el.action }))

  const isIsolated = fkOut.length === 0 && fkIn.length === 0 && usedBy.length === 0
  return { table: target, fkOut, fkIn, usedBy, isIsolated }
}
