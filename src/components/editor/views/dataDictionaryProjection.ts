import type { DbColumn, DbTable, DbTableNote, WorkspaceDesign } from "@/lib/types/assembler"
import type { DocTocEntry } from "./docProjection"
import { featureDbTableIds } from "./techSpecProjection"

// 모델 → 데이터 사전(독자=비개발자) 각도의 읽기 투사. 저장하지 않고 렌더 시 계산한다(단일 출처 유지).
// 구조(테이블·컬럼·FK)는 code-truth 사실, AI 해석 노트는 추론 — 두 레이어를 분리해 담는다(환각 차단).

export type DictFkOut = {
  column: string
  targetTable: string
  targetColumn: string
}

export type DictFkIn = {
  table: string
  column: string
}

export type DictEntry = {
  table: { id: string; name: string; description: string }
  columns: DbColumn[]
  // 이 테이블이 가리키는 곳(나가는 FK) — references 문자열은 code-truth 그대로 표기(존재 검증은 하지 않는다).
  fkOut: DictFkOut[]
  // 나를 가리키는 곳(들어오는 FK) — 싱크된 테이블에서만 역참조로 계산.
  fkIn: DictFkIn[]
  // 어느 기능이 쓰나 — feature.dbTableIds 역참조(파생, 저장 안 함).
  usedByFeatures: { id: string; name: string }[]
  // AI 해석(asm_db_table_notes) — 없으면 null, UI가 정직 카피로 표시한다.
  note: DbTableNote | null
}

export type DataDictionaryProjection = {
  entries: DictEntry[]
  toc: DocTocEntry[]
  isEmpty: boolean
}

export function dictAnchorId(tableId: string): string {
  return `dictp-table-${tableId}`
}

// "table.column" → 대상 테이블·컬럼. 점이 없는 비정형 값도 크래시 없이 테이블명으로 취급한다.
function parseReference(reference: string): { targetTable: string; targetColumn: string } {
  const dot = reference.indexOf(".")
  if (dot < 0) return { targetTable: reference, targetColumn: "" }
  return { targetTable: reference.slice(0, dot), targetColumn: reference.slice(dot + 1) }
}

export function projectDataDictionary(
  dbTables: DbTable[],
  notes: DbTableNote[],
  design: WorkspaceDesign,
): DataDictionaryProjection {
  const noteByTableId = new Map(notes.map((n) => [n.dbTableId, n]))

  const entries: DictEntry[] = dbTables.map((table) => {
    const fkOut: DictFkOut[] = table.columns
      .filter((c): c is DbColumn & { references: string } => c.references !== undefined)
      .map((c) => ({ column: c.name, ...parseReference(c.references) }))

    const fkIn: DictFkIn[] = dbTables.flatMap((other) =>
      other === table
        ? []
        : other.columns
            .filter((c) => c.references !== undefined && parseReference(c.references).targetTable === table.name)
            .map((c) => ({ table: other.name, column: c.name })),
    )

    const usedByFeatures = design.features
      .filter((f) => featureDbTableIds(f).includes(table.id))
      .map((f) => ({ id: f.id, name: f.name }))

    return {
      table: { id: table.id, name: table.name, description: table.description },
      columns: table.columns,
      fkOut,
      fkIn,
      usedByFeatures,
      note: noteByTableId.get(table.id) ?? null,
    }
  })

  return {
    entries,
    toc: entries.map((e) => ({ anchorId: dictAnchorId(e.table.id), title: e.table.name })),
    isEmpty: dbTables.length === 0,
  }
}
