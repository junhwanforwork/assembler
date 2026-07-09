import { describe, it, expect } from "vitest"
import type { Api, DbTable, Feature, WorkspaceDesign } from "@/lib/types/assembler"
import { buildApiEvidence } from "./evidence"

// ASM-064 — API 해석의 증거 셰이핑. 증거는 코드-진실 + 역참조만:
// api 사실 + 이 API를 참조하는 기능 이름 + 그 기능들의 dbTableIds로 닿는 테이블 이름.
// (feature→api 연결 필드 = Feature.apiIds, 테이블 = Feature.dbTableIds — types/assembler.ts 실물 확인)

function api(id: string): Api {
  return { id, productId: "p1", method: "POST", endpoint: "/signup", summary: "", status: "active", source: "code" }
}

function feature(id: string, name: string, apiIds: string[], dbTableIds?: string[]): Feature {
  return { id, name, description: "", detailFeatures: [], requirementIds: [], pageIds: [], apiIds, ...(dbTableIds ? { dbTableIds } : {}) }
}

function dbTable(id: string, name: string): DbTable {
  return { id, productId: "p1", name, description: "", columns: [], source: "code" }
}

function design(features: Feature[]): WorkspaceDesign {
  return { requirements: [], features, pages: [], flows: [], wireframes: [], elements: [] }
}

describe("buildApiEvidence", () => {
  it("이 API를 참조하는 기능 이름과, 그 기능들의 테이블 이름을 모은다", () => {
    const target = api("api-1")
    const tables = [dbTable("t-1", "users"), dbTable("t-2", "sessions"), dbTable("t-3", "logs")]
    const d = design([
      feature("f-1", "회원가입", ["api-1"], ["t-1", "t-2"]),
      feature("f-2", "로그인", ["api-1"], ["t-1"]),
      feature("f-3", "무관 기능", ["api-9"], ["t-3"]),
    ])
    const ev = buildApiEvidence(target, tables, d)
    expect(ev.api).toBe(target)
    expect(ev.usedByFeatures).toEqual(["회원가입", "로그인"])
    expect(ev.relatedTables).toEqual(["users", "sessions"])
    expect(ev.isIsolated).toBe(false)
  })

  it("어느 기능도 참조하지 않으면 고립이다", () => {
    const ev = buildApiEvidence(api("api-1"), [dbTable("t-1", "users")], design([feature("f-1", "다른 기능", ["api-2"], ["t-1"])]))
    expect(ev.usedByFeatures).toEqual([])
    expect(ev.relatedTables).toEqual([])
    expect(ev.isIsolated).toBe(true)
  })

  it("dbTableIds가 없는(승격 전 저장분) 기능도 크래시 없이 기능 이름만 담는다", () => {
    const ev = buildApiEvidence(api("api-1"), [dbTable("t-1", "users")], design([feature("f-1", "회원가입", ["api-1"])]))
    expect(ev.usedByFeatures).toEqual(["회원가입"])
    expect(ev.relatedTables).toEqual([])
    expect(ev.isIsolated).toBe(false)
  })

  it("존재하지 않는 테이블 id는 조용히 건너뛴다 — 이름을 지어내지 않는다", () => {
    const ev = buildApiEvidence(api("api-1"), [dbTable("t-1", "users")], design([feature("f-1", "회원가입", ["api-1"], ["t-1", "t-없음"])]))
    expect(ev.relatedTables).toEqual(["users"])
  })

  it("기능·테이블 이름은 중복 제거된다", () => {
    const tables = [dbTable("t-1", "users")]
    const d = design([feature("f-1", "회원가입", ["api-1"], ["t-1"]), feature("f-2", "회원가입", ["api-1"], ["t-1"])])
    const ev = buildApiEvidence(api("api-1"), tables, d)
    expect(ev.usedByFeatures).toEqual(["회원가입"])
    expect(ev.relatedTables).toEqual(["users"])
  })
})
