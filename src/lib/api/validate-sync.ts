import type { ApiStatus, DbColumn, HttpMethod, SourceKind } from "@/lib/types/assembler"
import { jsonByteLength, type Parsed } from "./validate"

// 코드-진실 싱크-인 검증 — 코드/MCP가 보내는 외부 페이로드. 사용자 저작 경로와 분리.

export type ApiSyncInput = { method: HttpMethod; endpoint: string; summary: string; status: ApiStatus; source: SourceKind }
export type DbTableSyncInput = { name: string; description: string; columns: DbColumn[]; source: SourceKind }

const METHODS: readonly HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"]
const STATUSES: readonly ApiStatus[] = ["planned", "active", "deprecated"]
const SOURCES: readonly SourceKind[] = ["code", "mcp"]

// ASM-004 — 싱크-인 페이로드 캡. 개수는 실사용 상한의 수 배, 바이트 캡은 문자열 폭주 방어.
export const MAX_SYNC_APIS = 300
export const MAX_SYNC_TABLES = 200
export const MAX_TABLE_COLUMNS = 100
export const MAX_SYNC_BYTES = 512_000

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0
}

function parseColumn(v: unknown): DbColumn | null {
  if (!isRecord(v)) return null
  if (typeof v.name !== "string" || typeof v.type !== "string") return null
  if (typeof v.nullable !== "boolean" || typeof v.isPrimaryKey !== "boolean") return null
  if (v.references !== undefined && typeof v.references !== "string") return null
  const col: DbColumn = { name: v.name, type: v.type, nullable: v.nullable, isPrimaryKey: v.isPrimaryKey }
  if (typeof v.references === "string") col.references = v.references
  return col
}

export function parseApiSync(body: unknown): Parsed<ApiSyncInput[]> {
  if (!isRecord(body)) return { ok: false, error: "invalid_body" }
  if (jsonByteLength(body) > MAX_SYNC_BYTES) return { ok: false, error: "payload_too_large" }
  if (!Array.isArray(body.apis)) return { ok: false, error: "invalid_apis" }
  if (body.apis.length > MAX_SYNC_APIS) return { ok: false, error: "too_many_apis" }

  const out: ApiSyncInput[] = []
  for (const item of body.apis) {
    if (!isRecord(item)) return { ok: false, error: "invalid_apis" }
    if (!METHODS.includes(item.method as HttpMethod)) return { ok: false, error: "invalid_method" }
    if (!isNonEmptyString(item.endpoint)) return { ok: false, error: "invalid_endpoint" }
    if (!SOURCES.includes(item.source as SourceKind)) return { ok: false, error: "invalid_source" }
    if (item.summary !== undefined && typeof item.summary !== "string") return { ok: false, error: "invalid_summary" }
    if (item.status !== undefined && !STATUSES.includes(item.status as ApiStatus)) return { ok: false, error: "invalid_status" }
    out.push({
      method: item.method as HttpMethod,
      endpoint: item.endpoint,
      summary: typeof item.summary === "string" ? item.summary : "",
      status: (item.status as ApiStatus) ?? "planned",
      source: item.source as SourceKind,
    })
  }
  return { ok: true, value: out }
}

export function parseDbTableSync(body: unknown): Parsed<DbTableSyncInput[]> {
  if (!isRecord(body)) return { ok: false, error: "invalid_body" }
  if (jsonByteLength(body) > MAX_SYNC_BYTES) return { ok: false, error: "payload_too_large" }
  if (!Array.isArray(body.tables)) return { ok: false, error: "invalid_tables" }
  if (body.tables.length > MAX_SYNC_TABLES) return { ok: false, error: "too_many_tables" }

  const out: DbTableSyncInput[] = []
  for (const item of body.tables) {
    if (!isRecord(item)) return { ok: false, error: "invalid_tables" }
    if (!isNonEmptyString(item.name)) return { ok: false, error: "invalid_table_name" }
    if (!SOURCES.includes(item.source as SourceKind)) return { ok: false, error: "invalid_source" }
    if (item.description !== undefined && typeof item.description !== "string") return { ok: false, error: "invalid_description" }

    const columns: DbColumn[] = []
    if (item.columns !== undefined) {
      if (!Array.isArray(item.columns)) return { ok: false, error: "invalid_columns" }
      if (item.columns.length > MAX_TABLE_COLUMNS) return { ok: false, error: "too_many_columns" }
      for (const c of item.columns) {
        const col = parseColumn(c)
        if (!col) return { ok: false, error: "invalid_column" }
        columns.push(col)
      }
    }
    out.push({
      name: item.name.trim(),
      description: typeof item.description === "string" ? item.description : "",
      columns,
      source: item.source as SourceKind,
    })
  }
  return { ok: true, value: out }
}
