import type { Activity, ActivityType, Api, ApiStatus, DbColumn, DbTable, HttpMethod, Product, SourceKind, Workspace, WorkspaceDesign } from "@/lib/types/assembler"

// asm_* 테이블 Row 타입 + Row→도메인 매퍼. DB 행(snake_case)과 모델(camelCase)의 단일 변환 지점.
// Row는 반드시 type(객체 리터럴)로 — interface는 postgrest GenericTable 제약에 안 맞아 never로 떨어진다.

export type AsmProductRow = {
  id: string
  session_id: string
  user_id: string | null
  name: string
  description: string
  created_at: string
  updated_at: string
}

export type AsmWorkspaceRow = {
  id: string
  product_id: string
  name: string
  is_main: boolean
  design: WorkspaceDesign
  created_at: string
  updated_at: string
}

export type AsmApiRow = {
  id: string
  product_id: string
  method: HttpMethod
  endpoint: string
  summary: string
  status: ApiStatus
  source: SourceKind
  created_at: string
  updated_at: string
}

export type AsmDbTableRow = {
  id: string
  product_id: string
  name: string
  description: string
  columns: DbColumn[]
  source: SourceKind
  created_at: string
  updated_at: string
}

export function toProduct(row: AsmProductRow): Product {
  return { id: row.id, name: row.name, description: row.description }
}

export function toWorkspace(row: AsmWorkspaceRow): Workspace {
  return { id: row.id, productId: row.product_id, name: row.name, isMain: row.is_main }
}

export function toApi(row: AsmApiRow): Api {
  return {
    id: row.id,
    productId: row.product_id,
    method: row.method,
    endpoint: row.endpoint,
    summary: row.summary,
    status: row.status,
    source: row.source,
  }
}

export function toDbTable(row: AsmDbTableRow): DbTable {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    description: row.description,
    columns: row.columns,
    source: row.source,
  }
}

export type AsmActivityRow = {
  id: string
  product_id: string
  workspace_id: string | null
  type: ActivityType
  metadata: Record<string, unknown>
  created_at: string
}

export function toActivity(row: AsmActivityRow): Activity {
  return {
    id: row.id,
    productId: row.product_id,
    workspaceId: row.workspace_id,
    type: row.type,
    metadata: row.metadata,
    createdAt: row.created_at,
  }
}
