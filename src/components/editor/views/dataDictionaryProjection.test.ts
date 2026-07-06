import { describe, expect, it } from "vitest"
import type { DbColumn, DbTable, DbTableNote, Feature, WorkspaceDesign } from "@/lib/types/assembler"
import { dictAnchorId, projectDataDictionary } from "./dataDictionaryProjection"

function col(name: string, over: Partial<DbColumn> = {}): DbColumn {
  return { name, type: "text", nullable: false, isPrimaryKey: false, ...over }
}

function table(id: string, name: string, columns: DbColumn[] = [], over: Partial<DbTable> = {}): DbTable {
  return { id, productId: "p1", name, description: `테이블 ${id}`, columns, source: "code", ...over }
}

function note(dbTableId: string, over: Partial<DbTableNote> = {}): DbTableNote {
  return {
    id: `n-${dbTableId}`,
    dbTableId,
    productId: "p1",
    explanation: `해석 ${dbTableId}`,
    grounded: true,
    isUserEdited: false,
    generatedAt: "2026-07-01T00:00:00Z",
    ...over,
  }
}

function feat(id: string, over: Partial<Feature> = {}): Feature {
  return {
    id,
    name: `기능 ${id}`,
    description: "",
    detailFeatures: [],
    requirementIds: [],
    pageIds: [],
    apiIds: [],
    ...over,
  }
}

// dbTableIds는 레인 1이 병행 신설 중 — 타입에 아직 없어도 옵셔널로 읽는다(머지 후 자동 활성).
function featWithTables(id: string, dbTableIds: string[]): Feature {
  return { ...feat(id), dbTableIds } as Feature
}

function design(features: Feature[] = []): WorkspaceDesign {
  return { requirements: [], features, pages: [], flows: [], wireframes: [], elements: [] }
}

describe("projectDataDictionary", () => {
  it("엔트리는 테이블 순서를 그대로 따르고 이름·설명(code-truth)을 담는다", () => {
    const { entries } = projectDataDictionary([table("t2", "walks"), table("t1", "users")], [], design())
    expect(entries.map((e) => e.table.id)).toEqual(["t2", "t1"])
    expect(entries[0].table.name).toBe("walks")
    expect(entries[0].table.description).toBe("테이블 t2")
  })

  it("컬럼 요약은 이름·타입·PK·nullable을 그대로 담는다", () => {
    const t = table("t1", "users", [col("id", { type: "uuid", isPrimaryKey: true }), col("email", { nullable: true })])
    const { entries } = projectDataDictionary([t], [], design())
    expect(entries[0].columns).toEqual([
      { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
      { name: "email", type: "text", nullable: true, isPrimaryKey: false },
    ])
  })

  it("나가는 FK — references('table.column')를 대상 테이블·컬럼으로 푼다", () => {
    const t = table("t1", "walks", [col("user_id", { references: "users.id" })])
    const { entries } = projectDataDictionary([t], [], design())
    expect(entries[0].fkOut).toEqual([{ column: "user_id", targetTable: "users", targetColumn: "id" }])
  })

  it("들어오는 FK — 나를 참조하는 다른 테이블·컬럼을 역참조로 모은다", () => {
    const users = table("t1", "users")
    const walks = table("t2", "walks", [col("user_id", { references: "users.id" })])
    const { entries } = projectDataDictionary([users, walks], [], design())
    expect(entries[0].fkIn).toEqual([{ table: "walks", column: "user_id" }])
    expect(entries[1].fkIn).toEqual([])
  })

  it("존재하지 않는 테이블을 가리키는 references도 code-truth 그대로 표기한다 (크래시 방어)", () => {
    const t = table("t1", "walks", [col("owner_id", { references: "ghosts.id" })])
    const { entries } = projectDataDictionary([t], [], design())
    expect(entries[0].fkOut).toEqual([{ column: "owner_id", targetTable: "ghosts", targetColumn: "id" }])
  })

  it("쓰임새 — feature.dbTableIds 역참조로 이 테이블을 쓰는 기능을 모은다", () => {
    const d = design([featWithTables("f1", ["t1"]), featWithTables("f2", ["t2"]), featWithTables("f3", ["t1"])])
    const { entries } = projectDataDictionary([table("t1", "users")], [], d)
    expect(entries[0].usedByFeatures).toEqual([
      { id: "f1", name: "기능 f1" },
      { id: "f3", name: "기능 f3" },
    ])
  })

  it("dbTableIds가 없는 기능(필드 부재)은 쓰임새에서 조용히 생략된다 (크래시 없음)", () => {
    const d = design([feat("f1"), featWithTables("f2", ["t1"])])
    const { entries } = projectDataDictionary([table("t1", "users")], [], d)
    expect(entries[0].usedByFeatures.map((f) => f.id)).toEqual(["f2"])
  })

  it("AI 해석 노트가 있으면 해당 테이블 엔트리에 인라인으로 붙는다", () => {
    const n = note("t1", { explanation: "사용자 계정을 담아요", grounded: false })
    const { entries } = projectDataDictionary([table("t1", "users"), table("t2", "walks")], [n], design())
    expect(entries[0].note?.explanation).toBe("사용자 계정을 담아요")
    expect(entries[0].note?.grounded).toBe(false)
    expect(entries[1].note).toBeNull()
  })

  it("존재하지 않는 테이블을 가리키는 노트는 무시된다 (dangling 방어)", () => {
    const { entries } = projectDataDictionary([table("t1", "users")], [note("t-없음")], design())
    expect(entries[0].note).toBeNull()
  })

  it("TOC는 테이블당 1엔트리 — 제목은 테이블 이름", () => {
    const { toc } = projectDataDictionary([table("t1", "users"), table("t2", "walks")], [], design())
    expect(toc).toEqual([
      { anchorId: dictAnchorId("t1"), title: "users" },
      { anchorId: dictAnchorId("t2"), title: "walks" },
    ])
  })

  it("isEmpty는 테이블이 하나도 없을 때만 참이다 (빈 모델 방어)", () => {
    expect(projectDataDictionary([], [], design()).isEmpty).toBe(true)
    expect(projectDataDictionary([table("t1", "users")], [], design()).isEmpty).toBe(false)
  })

  it("anchorId는 테이블 id로 결정적으로 만들어진다", () => {
    expect(dictAnchorId("t1")).toBe(dictAnchorId("t1"))
    expect(dictAnchorId("t1")).not.toBe(dictAnchorId("t2"))
  })
})
