import { describe, it, expect } from "vitest"
import { parseSyncPaste } from "./code-connect"

// 수동 싱크-인(ASM-026) — 붙여넣은 JSON을 서버 파서(parseApiSync/parseDbTableSync)와
// 같은 계약으로 검증하고, 실패는 "어떤 행이 왜"를 사용자 언어(해요체)로 돌려준다.

const API_ROW = { method: "GET", endpoint: "/walks", summary: "산책 목록", status: "active", source: "code" }
const TABLE_ROW = {
  name: "walks",
  description: "산책 기록",
  columns: [{ name: "id", type: "uuid", nullable: false, isPrimaryKey: true }],
  source: "code",
}

describe("parseSyncPaste", () => {
  it("apis+tables JSON을 파싱해 페이로드와 개수를 돌려준다", () => {
    const r = parseSyncPaste(JSON.stringify({ apis: [API_ROW], tables: [TABLE_ROW] }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.apis).toHaveLength(1)
      expect(r.payload.tables).toHaveLength(1)
      expect(r.payload.apis[0].endpoint).toBe("/walks")
      expect(r.payload.tables[0].name).toBe("walks")
    }
  })

  it("apis만 있어도 통과한다 (tables는 빈 배열)", () => {
    const r = parseSyncPaste(JSON.stringify({ apis: [API_ROW] }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.apis).toHaveLength(1)
      expect(r.payload.tables).toHaveLength(0)
    }
  })

  it("JSON이 아니면 형식 안내를 돌려준다", () => {
    const r = parseSyncPaste("이건 JSON이 아니에요")
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toContain("JSON")
  })

  it("apis도 tables도 없으면 무엇이 필요한지 안내한다", () => {
    const r = parseSyncPaste(JSON.stringify({ foo: [] }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toContain("apis")
  })

  it("잘못된 행은 몇 번째가 왜 거부됐는지 전부 모아 준다", () => {
    const bad = {
      apis: [API_ROW, { ...API_ROW, method: "FETCH" }, { ...API_ROW, endpoint: "" }],
      tables: [{ ...TABLE_ROW, name: "" }],
    }
    const r = parseSyncPaste(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.issues).toHaveLength(3)
      expect(r.issues[0]).toMatchObject({ section: "apis", index: 1 })
      expect(r.issues[0].message).toContain("GET")
      expect(r.issues[1]).toMatchObject({ section: "apis", index: 2 })
      expect(r.issues[2]).toMatchObject({ section: "tables", index: 0 })
      // 해요체 — 기술 코드(invalid_method 류) 직노출 금지.
      for (const issue of r.issues) {
        expect(issue.message).toMatch(/요[.…]?$/)
        expect(issue.message).not.toMatch(/invalid|error/i)
      }
    }
  })

  it("행과 무관한 상한 초과는 전체 메시지로 돌려준다", () => {
    const r = parseSyncPaste(JSON.stringify({ apis: Array.from({ length: 301 }, () => API_ROW) }))
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.issues).toHaveLength(0)
      expect(r.message).toContain("300")
    }
  })

  it("통과한 페이로드는 서버 계약 그대로 — 기본값(summary·status)이 채워져 있다", () => {
    const r = parseSyncPaste(JSON.stringify({ apis: [{ method: "GET", endpoint: "/x", source: "code" }] }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.payload.apis[0].summary).toBe("")
      expect(r.payload.apis[0].status).toBe("planned")
    }
  })
})
