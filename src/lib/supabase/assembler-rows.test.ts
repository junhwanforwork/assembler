import { describe, it, expect } from "vitest"
import { toApi, toDbTable, toProduct, toWorkspace } from "./assembler-rows"
import type { AsmApiRow, AsmDbTableRow, AsmProductRow, AsmWorkspaceRow } from "./assembler-rows"

// Row(snake_case) → 도메인(camelCase) 매핑. DB 행과 모델 타입 사이 단일 변환 지점.

describe("toProduct", () => {
  it("행에서 도메인 필드만 추린다", () => {
    const row: AsmProductRow = {
      id: "p-1",
      session_id: "s-1",
      user_id: null,
      name: "내 앱",
      description: "설명",
      created_at: "t",
      updated_at: "t",
    }
    expect(toProduct(row)).toEqual({ id: "p-1", name: "내 앱", description: "설명" })
  })
})

describe("toWorkspace", () => {
  it("design은 제외하고 메타만 매핑한다", () => {
    const row: AsmWorkspaceRow = {
      id: "w-1",
      product_id: "p-1",
      name: "Main",
      is_main: true,
      design: { requirements: [], features: [], pages: [], flows: [], wireframes: [], elements: [] },
      created_at: "t",
      updated_at: "t",
    }
    expect(toWorkspace(row)).toEqual({ id: "w-1", productId: "p-1", name: "Main", isMain: true })
  })
})

describe("toApi", () => {
  it("union 필드 보존 + product_id → productId", () => {
    const row: AsmApiRow = {
      id: "a-1",
      product_id: "p-1",
      method: "POST",
      endpoint: "/api/login",
      summary: "로그인",
      status: "active",
      source: "code",
      created_at: "t",
      updated_at: "t",
    }
    expect(toApi(row)).toEqual({
      id: "a-1",
      productId: "p-1",
      method: "POST",
      endpoint: "/api/login",
      summary: "로그인",
      status: "active",
      source: "code",
    })
  })
})

describe("toDbTable", () => {
  it("columns(jsonb) 보존 + product_id → productId", () => {
    const row: AsmDbTableRow = {
      id: "t-1",
      product_id: "p-1",
      name: "users",
      description: "사용자",
      columns: [{ name: "id", type: "uuid", nullable: false, isPrimaryKey: true }],
      source: "mcp",
      created_at: "t",
      updated_at: "t",
    }
    expect(toDbTable(row)).toEqual({
      id: "t-1",
      productId: "p-1",
      name: "users",
      description: "사용자",
      columns: [{ name: "id", type: "uuid", nullable: false, isPrimaryKey: true }],
      source: "mcp",
    })
  })
})
