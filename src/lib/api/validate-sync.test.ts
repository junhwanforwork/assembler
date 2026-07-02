import { describe, it, expect } from "vitest"
import { parseApiSync, parseDbTableSync, MAX_SYNC_APIS, MAX_SYNC_TABLES, MAX_TABLE_COLUMNS, MAX_SYNC_BYTES } from "./validate-sync"

// 코드-진실 싱크-인(코드/MCP 전용) 페이로드 검증. 사용자 저작 아님 — 외부 입력이라 엄격히.

describe("parseApiSync", () => {
  it("기본값 채움: summary '', status 'planned'", () => {
    const r = parseApiSync({ apis: [{ method: "GET", endpoint: "/api/users", source: "code" }] })
    expect(r).toEqual({ ok: true, value: [{ method: "GET", endpoint: "/api/users", summary: "", status: "planned", source: "code" }] })
  })
  it("모든 필드 보존", () => {
    const r = parseApiSync({ apis: [{ method: "POST", endpoint: "/api/login", summary: "로그인", status: "active", source: "mcp" }] })
    expect(r).toEqual({ ok: true, value: [{ method: "POST", endpoint: "/api/login", summary: "로그인", status: "active", source: "mcp" }] })
  })
  it("빈 배열 허용(전량 삭제 동기화 신호)", () => {
    expect(parseApiSync({ apis: [] })).toEqual({ ok: true, value: [] })
  })
  it("잘못된 method/status/source/endpoint 거부", () => {
    expect(parseApiSync(null)).toEqual({ ok: false, error: "invalid_body" })
    expect(parseApiSync({})).toEqual({ ok: false, error: "invalid_apis" })
    expect(parseApiSync({ apis: [{ method: "FETCH", endpoint: "/x", source: "code" }] })).toEqual({ ok: false, error: "invalid_method" })
    expect(parseApiSync({ apis: [{ method: "GET", endpoint: "", source: "code" }] })).toEqual({ ok: false, error: "invalid_endpoint" })
    expect(parseApiSync({ apis: [{ method: "GET", endpoint: "/x", source: "user" }] })).toEqual({ ok: false, error: "invalid_source" })
    expect(parseApiSync({ apis: [{ method: "GET", endpoint: "/x", status: "live", source: "code" }] })).toEqual({ ok: false, error: "invalid_status" })
  })

  // ASM-004 — 개수·바이트 캡.
  it("apis 캡 이내 통과, 초과 시 too_many_apis", () => {
    const make = (n: number) => Array.from({ length: n }, (_, i) => ({ method: "GET", endpoint: `/api/x${i}`, source: "code" }))
    expect(parseApiSync({ apis: make(MAX_SYNC_APIS) }).ok).toBe(true)
    expect(parseApiSync({ apis: make(MAX_SYNC_APIS + 1) })).toEqual({ ok: false, error: "too_many_apis" })
  })
  it("직렬화 크기 초과 시 payload_too_large", () => {
    const huge = { apis: [{ method: "GET", endpoint: "/x", summary: "y".repeat(MAX_SYNC_BYTES), source: "code" }] }
    expect(parseApiSync(huge)).toEqual({ ok: false, error: "payload_too_large" })
  })
})

describe("parseDbTableSync", () => {
  it("기본값: description '', columns []", () => {
    const r = parseDbTableSync({ tables: [{ name: "users", source: "code" }] })
    expect(r).toEqual({ ok: true, value: [{ name: "users", description: "", columns: [], source: "code" }] })
  })
  it("컬럼 보존 + 검증", () => {
    const r = parseDbTableSync({
      tables: [{ name: "users", description: "사용자", columns: [{ name: "id", type: "uuid", nullable: false, isPrimaryKey: true, references: "x.y" }], source: "mcp" }],
    })
    expect(r).toEqual({
      ok: true,
      value: [{ name: "users", description: "사용자", columns: [{ name: "id", type: "uuid", nullable: false, isPrimaryKey: true, references: "x.y" }], source: "mcp" }],
    })
  })
  it("잘못된 name/source/column 거부", () => {
    expect(parseDbTableSync({})).toEqual({ ok: false, error: "invalid_tables" })
    expect(parseDbTableSync({ tables: [{ name: "", source: "code" }] })).toEqual({ ok: false, error: "invalid_table_name" })
    expect(parseDbTableSync({ tables: [{ name: "t", source: "nope" }] })).toEqual({ ok: false, error: "invalid_source" })
    expect(parseDbTableSync({ tables: [{ name: "t", columns: [{ name: "c" }], source: "code" }] })).toEqual({ ok: false, error: "invalid_column" })
  })

  // ASM-004 — 개수·바이트 캡.
  it("tables 캡 이내 통과, 초과 시 too_many_tables", () => {
    const make = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `t${i}`, source: "code" }))
    expect(parseDbTableSync({ tables: make(MAX_SYNC_TABLES) }).ok).toBe(true)
    expect(parseDbTableSync({ tables: make(MAX_SYNC_TABLES + 1) })).toEqual({ ok: false, error: "too_many_tables" })
  })
  it("테이블당 columns 캡 초과 시 too_many_columns", () => {
    const col = (i: number) => ({ name: `c${i}`, type: "text", nullable: false, isPrimaryKey: false })
    const atCap = Array.from({ length: MAX_TABLE_COLUMNS }, (_, i) => col(i))
    expect(parseDbTableSync({ tables: [{ name: "t", columns: atCap, source: "code" }] }).ok).toBe(true)
    expect(parseDbTableSync({ tables: [{ name: "t", columns: [...atCap, col(999)], source: "code" }] })).toEqual({ ok: false, error: "too_many_columns" })
  })
  it("직렬화 크기 초과 시 payload_too_large", () => {
    const huge = { tables: [{ name: "t", description: "y".repeat(MAX_SYNC_BYTES), source: "code" }] }
    expect(parseDbTableSync(huge)).toEqual({ ok: false, error: "payload_too_large" })
  })
})
