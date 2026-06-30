import { describe, it, expect } from "vitest"
import { buildTableEvidence } from "./evidence"
import type { DbTable, WorkspaceDesign } from "@/lib/types/assembler"

// 증거 조립 — 환각 방어 1층. 연결이 있으면 채워지고, 고립이면 isIsolated=true.

function table(id: string, name: string, columns: DbTable["columns"]): DbTable {
  return { id, productId: "p1", name, description: "", columns, source: "code" }
}

function emptyDesign(): WorkspaceDesign {
  return { requirements: [], features: [], pages: [], flows: [], wireframes: [], elements: [] }
}

const customers = table("t-cust", "customers", [{ name: "id", type: "uuid", nullable: false, isPrimaryKey: true }])
const repairs = table("t-rep", "repairs", [
  { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
  { name: "customer_id", type: "uuid", nullable: false, isPrimaryKey: false, references: "customers.id" },
  { name: "cost", type: "int", nullable: true, isPrimaryKey: false },
])

describe("buildTableEvidence", () => {
  it("나가는 FK(references)를 fkOut으로 뽑는다", () => {
    const ev = buildTableEvidence(repairs, [repairs, customers], emptyDesign())
    expect(ev.fkOut).toEqual([{ column: "customer_id", refTable: "customers" }])
  })

  it("들어오는 FK(다른 테이블이 나를 참조)를 fkIn으로 뽑는다", () => {
    const ev = buildTableEvidence(customers, [repairs, customers], emptyDesign())
    expect(ev.fkIn).toEqual([{ fromTable: "repairs", column: "customer_id" }])
  })

  it("이 테이블을 쓰는 UIElement를 usedBy로 뽑는다", () => {
    const design = emptyDesign()
    design.elements = [
      { id: "el-1", label: "수리 접수 버튼", type: "button", action: "Click", states: [], result: "", apiIds: [], dbTableIds: ["t-rep"] },
      { id: "el-2", label: "무관 요소", type: "text", action: "none", states: [], result: "", apiIds: [], dbTableIds: [] },
    ]
    const ev = buildTableEvidence(repairs, [repairs, customers], design)
    expect(ev.usedBy).toEqual([{ elementLabel: "수리 접수 버튼", action: "Click" }])
  })

  it("연결이 하나라도 있으면 isIsolated=false", () => {
    const ev = buildTableEvidence(repairs, [repairs, customers], emptyDesign())
    expect(ev.isIsolated).toBe(false)
  })

  it("FK·역참조가 전혀 없으면 isIsolated=true (보수적 설명으로 강등)", () => {
    const lonely = table("t-lonely", "audit_log", [{ name: "id", type: "uuid", nullable: false, isPrimaryKey: true }])
    const ev = buildTableEvidence(lonely, [lonely], emptyDesign())
    expect(ev.isIsolated).toBe(true)
    expect(ev.fkOut).toEqual([])
    expect(ev.fkIn).toEqual([])
    expect(ev.usedBy).toEqual([])
  })
})
