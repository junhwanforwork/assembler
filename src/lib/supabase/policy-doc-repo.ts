import type { PolicyDoc } from "@/lib/types/assembler"
import type { AssemblerClient } from "./assembler"
import { toPolicyDoc } from "./assembler-rows"

// asm_policy_docs 리포지토리(ASM-068) — 사용자 저작 정책 문서 CRUD. 부모당 N행.
// 소유권은 부모 asm_products RLS가 강제한다. SELECT * 금지(api.md) — 컬럼 명시.
const DOC_COLS = "id, product_id, title, body, api_ids, db_table_ids, created_at, updated_at"

// PGRST116 = .single()이 행을 못 찾음(문서 없음/타소유 RLS 불가시). 정상 → null.
function isNotFound(error: { code?: string } | null): boolean {
  return error?.code === "PGRST116"
}

export async function listPolicyDocs(c: AssemblerClient, productId: string): Promise<PolicyDoc[]> {
  const { data, error } = await c
    .from("asm_policy_docs")
    .select(DOC_COLS)
    .eq("product_id", productId)
    .order("updated_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map(toPolicyDoc)
}

export async function getPolicyDoc(c: AssemblerClient, docId: string): Promise<PolicyDoc | null> {
  const { data, error } = await c.from("asm_policy_docs").select(DOC_COLS).eq("id", docId).single()
  if (error) return isNotFound(error) ? null : Promise.reject(error)
  return toPolicyDoc(data)
}

export type CreatePolicyDocInput = { productId: string; title: string; body: string; apiIds: string[]; dbTableIds: string[] }

export async function createPolicyDoc(c: AssemblerClient, input: CreatePolicyDocInput): Promise<PolicyDoc> {
  const { data, error } = await c
    .from("asm_policy_docs")
    .insert({ product_id: input.productId, title: input.title, body: input.body, api_ids: input.apiIds, db_table_ids: input.dbTableIds })
    .select(DOC_COLS)
    .single()
  if (error) throw error
  return toPolicyDoc(data)
}

export type UpdatePolicyDocPatch = { title?: string; body?: string; apiIds?: string[]; dbTableIds?: string[] }

export async function updatePolicyDoc(c: AssemblerClient, docId: string, patch: UpdatePolicyDocPatch): Promise<PolicyDoc | null> {
  // 주어진 필드만 snake_case로 — 미지정 필드는 건드리지 않는다(부분 갱신).
  const row: { title?: string; body?: string; api_ids?: string[]; db_table_ids?: string[] } = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.body !== undefined) row.body = patch.body
  if (patch.apiIds !== undefined) row.api_ids = patch.apiIds
  if (patch.dbTableIds !== undefined) row.db_table_ids = patch.dbTableIds

  const { data, error } = await c.from("asm_policy_docs").update(row).eq("id", docId).select(DOC_COLS).single()
  if (error) return isNotFound(error) ? null : Promise.reject(error)
  return toPolicyDoc(data)
}

export async function deletePolicyDoc(c: AssemblerClient, docId: string): Promise<boolean> {
  const { data, error } = await c.from("asm_policy_docs").delete().eq("id", docId).select("id")
  if (error) throw error
  return (data?.length ?? 0) > 0
}
