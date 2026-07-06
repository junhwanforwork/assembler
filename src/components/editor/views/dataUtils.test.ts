import { describe, it, expect } from "vitest"
import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"
import { createEmptyDesign } from "@/lib/types/design"
import { buildTableDetail } from "./dataUtils"

// DB 테이블 상세 역참조 — ASM-052 승격: 요소 매핑에 더해 feature.dbTableIds도 usedBy로 계산한다.
// (와이어 후퇴 후 새 그래프엔 요소가 없으므로 기능 스캔이 없으면 usedBy가 항상 빈다.)

const TABLE: DbTable = {
  id: "db-walks",
  productId: "p1",
  name: "walks",
  description: "산책 기록",
  columns: [{ name: "id", type: "uuid", nullable: false, isPrimaryKey: true }],
  source: "code",
}

const APIS: Api[] = [
  { id: "api-1", productId: "p1", method: "GET", endpoint: "/walks", summary: "", status: "active", source: "code" },
]

function design(patch: Partial<WorkspaceDesign>): WorkspaceDesign {
  return { ...createEmptyDesign(), ...patch }
}

describe("buildTableDetail — usedBy 역참조", () => {
  it("feature.dbTableIds로 연결된 기능 이름이 usedBy에 들어간다 (ASM-052)", () => {
    const d = design({
      features: [
        { id: "f1", name: "산책 기록", description: "", detailFeatures: [], requirementIds: [], pageIds: [], apiIds: ["api-1"], dbTableIds: ["db-walks"] },
      ],
    })
    const detail = buildTableDetail(TABLE, APIS, d)
    expect(detail.usedBy).toContain("산책 기록")
  })

  it("요소 매핑 usedBy도 유지된다 (휴면 데이터 보존)", () => {
    const d = design({
      elements: [
        { id: "el-1", label: "기록 버튼", type: "button", action: "Click", states: [], result: "저장", apiIds: ["api-1"], dbTableIds: ["db-walks"] },
      ],
    })
    const detail = buildTableDetail(TABLE, APIS, d)
    expect(detail.usedBy).toContain("기록 버튼")
    expect(detail.apis).toContain("GET /walks")
  })

  it("기능·요소가 같은 테이블을 쓰면 중복 없이 합쳐진다", () => {
    const d = design({
      features: [
        { id: "f1", name: "산책 기록", description: "", detailFeatures: [], requirementIds: [], pageIds: [], apiIds: [], dbTableIds: ["db-walks"] },
      ],
      elements: [
        { id: "el-1", label: "산책 기록", type: "button", action: "Click", states: [], result: "저장", apiIds: [], dbTableIds: ["db-walks"] },
      ],
    })
    expect(buildTableDetail(TABLE, APIS, d).usedBy).toEqual(["산책 기록"])
  })

  it("dbTableIds 필드가 없는 레거시 기능이 있어도 던지지 않는다", () => {
    const d = design({
      features: [
        { id: "f1", name: "레거시", description: "", detailFeatures: [], requirementIds: [], pageIds: [], apiIds: [] },
      ],
    })
    expect(() => buildTableDetail(TABLE, APIS, d)).not.toThrow()
  })

  it("기능이 연결한 API도 관련 API에 합류한다 (ASM-052)", () => {
    const d = design({
      features: [
        { id: "f1", name: "산책 기록", description: "", detailFeatures: [], requirementIds: [], pageIds: [], apiIds: ["api-1"], dbTableIds: ["db-walks"] },
      ],
    })
    expect(buildTableDetail(TABLE, APIS, d).apis).toContain("GET /walks")
  })
})
