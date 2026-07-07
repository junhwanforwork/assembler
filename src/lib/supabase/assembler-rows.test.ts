import { describe, it, expect } from "vitest"
import { toApi, toDbTable, toDbTableNote, toProduct, toWorkspace } from "./assembler-rows"
import type { AsmApiRow, AsmDbTableNoteRow, AsmDbTableRow, AsmProductRow, AsmWorkspaceRow } from "./assembler-rows"

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

// 통합 정정(2026-07-08): isUserEdited 디코드 가드 — QA 프로브 실증분을 회귀 방어망으로 이식.
describe("toDbTableNote — 봉투 디코드와 사용자 편집 가드", () => {
  const base: AsmDbTableNoteRow = {
    id: "n-1",
    db_table_id: "t-1",
    product_id: "p-1",
    explanation: "",
    grounded: true,
    is_user_edited: false,
    generated_at: "2026-07-08T00:00:00Z",
    updated_at: "2026-07-08T00:00:00Z",
  }

  it("사용자 편집본은 봉투 모양 JSON이라도 평문 그대로 보존한다(재해석 금지)", () => {
    const enveloped = JSON.stringify({ v: 1, summary: "요약", pros: ["좋아요"] })
    const note = toDbTableNote({ ...base, explanation: enveloped, is_user_edited: true })
    expect(note.explanation).toBe(enveloped)
    expect(note.pros).toBeUndefined()
  })

  it("비편집 봉투는 구조화로 디코드한다", () => {
    const enveloped = JSON.stringify({ v: 1, summary: "주문을 담아요.", pros: ["연결이 명확해요"], cons: ["삭제 주의"] })
    const note = toDbTableNote({ ...base, explanation: enveloped })
    expect(note.explanation).toBe("주문을 담아요.")
    expect(note.pros).toEqual(["연결이 명확해요"])
    expect(note.cons).toEqual(["삭제 주의"])
  })

  it("{로 시작하는 평문은 그대로 통과한다(관용 디코드)", () => {
    const note = toDbTableNote({ ...base, explanation: "{메모} 주문 기록이에요." })
    expect(note.explanation).toBe("{메모} 주문 기록이에요.")
    expect(note.pros).toBeUndefined()
  })
})
