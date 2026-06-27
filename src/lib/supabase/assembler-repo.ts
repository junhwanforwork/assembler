import type { Api, DbTable, Product, Workspace, WorkspaceDesign } from "@/lib/types/assembler"
import type { CodeTruthIds, DesignCounts } from "@/lib/types/design"
import { designCounts } from "@/lib/types/design"
import type { ApiSyncInput, DbTableSyncInput } from "@/lib/api/validate-sync"
import type { AssemblerClient } from "./assembler"
import { toApi, toDbTable, toProduct, toWorkspace } from "./assembler-rows"

// 파일 카드용 — 워크스페이스 + 그 안 설계 그래프의 컬렉션별 개수.
export type WorkspaceSummary = Workspace & { counts: DesignCounts }

// asm_* 리포지토리 — 라우트가 호출하는 DB 접근 단일 지점. 소유권은 RLS가 강제한다.
// SELECT * 금지(api.md) — 컬럼 명시.
const PRODUCT_COLS = "id, session_id, user_id, name, description, created_at, updated_at"
const WORKSPACE_COLS = "id, product_id, name, is_main, design, created_at, updated_at"
const API_COLS = "id, product_id, method, endpoint, summary, status, source, created_at, updated_at"
const DB_TABLE_COLS = "id, product_id, name, description, columns, source, created_at, updated_at"

// PGRST116 = .single()이 행을 못 찾음. 소유권 밖이면 RLS로 안 보여 동일하게 not-found 처리.
function isNotFound(error: { code?: string } | null): boolean {
  return error?.code === "PGRST116"
}

// ───────────────────────── Products ─────────────────────────

export async function listProducts(c: AssemblerClient): Promise<Product[]> {
  const { data, error } = await c.from("asm_products").select(PRODUCT_COLS).order("updated_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map(toProduct)
}

export async function createProduct(
  c: AssemblerClient,
  sessionId: string,
  userId: string | null,
  input: { name: string; description: string }
): Promise<Product> {
  const { data, error } = await c
    .from("asm_products")
    .insert({ session_id: sessionId, user_id: userId, name: input.name, description: input.description })
    .select(PRODUCT_COLS)
    .single()
  if (error) throw error
  return toProduct(data)
}

export async function getProduct(c: AssemblerClient, id: string): Promise<Product | null> {
  const { data, error } = await c.from("asm_products").select(PRODUCT_COLS).eq("id", id).single()
  if (error) return isNotFound(error) ? null : Promise.reject(error)
  return toProduct(data)
}

export async function updateProduct(c: AssemblerClient, id: string, patch: { name?: string; description?: string }): Promise<Product | null> {
  const { data, error } = await c.from("asm_products").update(patch).eq("id", id).select(PRODUCT_COLS).single()
  if (error) return isNotFound(error) ? null : Promise.reject(error)
  return toProduct(data)
}

export async function deleteProduct(c: AssemblerClient, id: string): Promise<boolean> {
  const { data, error } = await c.from("asm_products").delete().eq("id", id).select("id")
  if (error) throw error
  return (data?.length ?? 0) > 0
}

// ───────────────────────── Workspaces ─────────────────────────

// 파일 목록 — 카드 메타(요소 수)를 위해 design도 함께 읽어 counts를 동봉한다.
export async function listWorkspaces(c: AssemblerClient, productId: string): Promise<WorkspaceSummary[]> {
  const { data, error } = await c
    .from("asm_workspaces")
    .select(WORKSPACE_COLS)
    .eq("product_id", productId)
    .order("is_main", { ascending: false })
    .order("updated_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => ({ ...toWorkspace(row), counts: designCounts(row.design) }))
}

export async function createWorkspace(c: AssemblerClient, input: { productId: string; name: string; isMain?: boolean }): Promise<Workspace> {
  const { data, error } = await c
    .from("asm_workspaces")
    .insert({ product_id: input.productId, name: input.name, is_main: input.isMain ?? false })
    .select(WORKSPACE_COLS)
    .single()
  if (error) throw error
  return toWorkspace(data)
}

export async function getWorkspace(c: AssemblerClient, id: string): Promise<Workspace | null> {
  const { data, error } = await c.from("asm_workspaces").select(WORKSPACE_COLS).eq("id", id).single()
  if (error) return isNotFound(error) ? null : Promise.reject(error)
  return toWorkspace(data)
}

export async function updateWorkspace(c: AssemblerClient, id: string, patch: { name: string }): Promise<Workspace | null> {
  const { data, error } = await c.from("asm_workspaces").update(patch).eq("id", id).select(WORKSPACE_COLS).single()
  if (error) return isNotFound(error) ? null : Promise.reject(error)
  return toWorkspace(data)
}

export async function deleteWorkspace(c: AssemblerClient, id: string): Promise<boolean> {
  const { data, error } = await c.from("asm_workspaces").delete().eq("id", id).select("id")
  if (error) throw error
  return (data?.length ?? 0) > 0
}

// ───────────────────────── Design (워크스페이스 그래프) ─────────────────────────

// 디자인 무결성 검사에 쓸 코드-진실 id 집합 + 부모 productId. 워크스페이스가 없으면 null.
export async function getWorkspaceContext(
  c: AssemblerClient,
  workspaceId: string
): Promise<{ productId: string; design: WorkspaceDesign; codeTruth: CodeTruthIds } | null> {
  const { data: ws, error } = await c.from("asm_workspaces").select("product_id, design").eq("id", workspaceId).single()
  if (error) return isNotFound(error) ? null : Promise.reject(error)

  const productId = ws.product_id
  const [apis, dbTables] = await Promise.all([
    c.from("asm_apis").select("id").eq("product_id", productId),
    c.from("asm_db_tables").select("id").eq("product_id", productId),
  ])
  if (apis.error) throw apis.error
  if (dbTables.error) throw dbTables.error

  return {
    productId,
    design: ws.design,
    codeTruth: {
      apiIds: new Set((apis.data ?? []).map((r) => r.id)),
      dbTableIds: new Set((dbTables.data ?? []).map((r) => r.id)),
    },
  }
}

export async function updateDesign(c: AssemblerClient, workspaceId: string, design: WorkspaceDesign): Promise<boolean> {
  const { data, error } = await c.from("asm_workspaces").update({ design }).eq("id", workspaceId).select("id")
  if (error) throw error
  return (data?.length ?? 0) > 0
}

// ───────────────────────── Code-truth 읽기 (싱크는 4단계) ─────────────────────────

export async function listApis(c: AssemblerClient, productId: string): Promise<Api[]> {
  const { data, error } = await c.from("asm_apis").select(API_COLS).eq("product_id", productId).order("endpoint")
  if (error) throw error
  return (data ?? []).map(toApi)
}

export async function listDbTables(c: AssemblerClient, productId: string): Promise<DbTable[]> {
  const { data, error } = await c.from("asm_db_tables").select(DB_TABLE_COLS).eq("product_id", productId).order("name")
  if (error) throw error
  return (data ?? []).map(toDbTable)
}

// 싱크-인: (product, method, endpoint) 멱등 upsert. 추가/갱신만 — 삭제 동기화는 하지 않는다.
// 싱크 후 전체 현재 상태를 돌려줘 호출자가 결과를 본다.
export async function syncApis(c: AssemblerClient, productId: string, apis: ApiSyncInput[]): Promise<Api[]> {
  if (apis.length > 0) {
    const rows = apis.map((a) => ({ product_id: productId, ...a }))
    const { error } = await c.from("asm_apis").upsert(rows, { onConflict: "product_id,method,endpoint" })
    if (error) throw error
  }
  return listApis(c, productId)
}

export async function syncDbTables(c: AssemblerClient, productId: string, tables: DbTableSyncInput[]): Promise<DbTable[]> {
  if (tables.length > 0) {
    const rows = tables.map((t) => ({ product_id: productId, ...t }))
    const { error } = await c.from("asm_db_tables").upsert(rows, { onConflict: "product_id,name" })
    if (error) throw error
  }
  return listDbTables(c, productId)
}
