import type { Activity, ActivityType, Api, ApiNote, ApiStatus, DbColumn, DbTable, DbTableNote, HttpMethod, PolicyDoc, Product, SourceKind, Workspace, WorkspaceDesign } from "@/lib/types/assembler"
import { decodeNoteExplanation } from "@/lib/db-learning/note-codec"

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

export type AsmDbTableNoteRow = {
  id: string
  db_table_id: string
  product_id: string
  explanation: string
  grounded: boolean
  is_user_edited: boolean
  generated_at: string
  updated_at: string
}

export function toDbTableNote(row: AsmDbTableNoteRow): DbTableNote {
  // explanation 컬럼은 text 하나 — 구조화 노트(ASM-057)는 JSON 봉투로 실려 온다(note-codec).
  // 사용자 편집본은 사람이 친 평문이라 재해석하지 않는다(JSON을 붙여넣어도 그대로 보여준다).
  const structured = row.is_user_edited ? { explanation: row.explanation } : decodeNoteExplanation(row.explanation)
  return {
    id: row.id,
    dbTableId: row.db_table_id,
    productId: row.product_id,
    explanation: structured.explanation,
    ...(structured.pros ? { pros: structured.pros } : {}),
    ...(structured.cons ? { cons: structured.cons } : {}),
    grounded: row.grounded,
    isUserEdited: row.is_user_edited,
    generatedAt: row.generated_at,
  }
}

export type AsmApiNoteRow = {
  id: string
  api_id: string
  product_id: string
  explanation: string
  grounded: boolean
  is_user_edited: boolean
  generated_at: string
  updated_at: string
}

export function toApiNote(row: AsmApiNoteRow): ApiNote {
  // explanation 컬럼은 text 하나 — 구조화 노트는 JSON 봉투로 실려 온다(note-codec 재사용, toDbTableNote 미러).
  // 사용자 편집본은 사람이 친 평문이라 재해석하지 않는다(JSON을 붙여넣어도 그대로 보여준다).
  const structured = row.is_user_edited ? { explanation: row.explanation } : decodeNoteExplanation(row.explanation)
  return {
    id: row.id,
    apiId: row.api_id,
    productId: row.product_id,
    explanation: structured.explanation,
    ...(structured.pros ? { pros: structured.pros } : {}),
    ...(structured.cons ? { cons: structured.cons } : {}),
    grounded: row.grounded,
    isUserEdited: row.is_user_edited,
    generatedAt: row.generated_at,
  }
}

// 정책 문서(ASM-068) — 부모당 N행. Row 는 반드시 type(:5 주석 — interface면 .from()이 never).
export type AsmPolicyDocRow = {
  id: string
  product_id: string
  title: string
  body: string
  api_ids: string[]
  db_table_ids: string[]
  created_at: string
  updated_at: string
}

export function toPolicyDoc(row: AsmPolicyDocRow): PolicyDoc {
  return {
    id: row.id,
    productId: row.product_id,
    title: row.title,
    body: row.body,
    apiIds: row.api_ids,
    dbTableIds: row.db_table_ids,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
