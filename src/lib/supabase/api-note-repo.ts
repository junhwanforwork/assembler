import type { ApiNote } from "@/lib/types/assembler"
import { encodeNoteExplanation } from "@/lib/db-learning/note-codec"
import type { AssemblerClient } from "./assembler"
import { toApiNote } from "./assembler-rows"

// asm_api_notes 리포지토리(ASM-064) — API 해석(AI 추론) 저장/조회. db-note-repo 미러.
// code-truth(asm_apis)와 분리된 레이어: asm_apis.summary는 syncApis 멱등 upsert가 재싱크 때 덮는다.
// 소유권은 부모 asm_products RLS가 강제한다. SELECT * 금지(api.md) — 컬럼 명시.
const NOTE_COLS = "id, api_id, product_id, explanation, grounded, is_user_edited, generated_at, updated_at"

// PGRST116 = .single()이 행을 못 찾음(노트 미생성). 노트 없음은 정상 상태 → null.
function isNotFound(error: { code?: string } | null): boolean {
  return error?.code === "PGRST116"
}

export async function getApiNote(c: AssemblerClient, apiId: string): Promise<ApiNote | null> {
  const { data, error } = await c.from("asm_api_notes").select(NOTE_COLS).eq("api_id", apiId).single()
  if (error) return isNotFound(error) ? null : Promise.reject(error)
  return toApiNote(data)
}

// 워크스페이스↔API 소유 정합만 확인 — note GET/PATCH 용(호버 핫패스).
// isTableInWorkspace(assembler-repo)의 API판: design jsonb 전송 없는 인덱스 포인트 조회 2회.
export async function isApiInWorkspace(c: AssemblerClient, workspaceId: string, apiId: string): Promise<boolean> {
  const ws = await c.from("asm_workspaces").select("product_id").eq("id", workspaceId).single()
  if (ws.error) return isNotFound(ws.error) ? false : Promise.reject(ws.error)
  const api = await c.from("asm_apis").select("id").eq("id", apiId).eq("product_id", ws.data.product_id).single()
  if (api.error) return isNotFound(api.error) ? false : Promise.reject(api.error)
  return true
}

export type UpsertApiNoteInput = {
  apiId: string
  productId: string
  explanation: string
  grounded: boolean
  pros?: string[]
  cons?: string[]
}

// AI 생성 결과 저장 — API당 1개(api_id 멱등). pros/cons는 explanation text 컬럼 하나에 JSON 봉투(note-codec 재사용).
// ⚠️ 사용자 편집본 보호: blind upsert 면 is_user_edited 를 false 로 되돌려 사용자 편집을 덮는 race 가 생긴다.
//   그래서 (1) is_user_edited=false 인 기존 AI 행만 갱신, (2) 행이 없으면 insert 로 나눈다.
//   사용자 편집(is_user_edited=true) 행이 있으면 (1)이 0행 → (2) insert 가 unique 충돌로 throw → 편집 보존.
export async function upsertApiNote(c: AssemblerClient, input: UpsertApiNoteInput): Promise<ApiNote> {
  const generatedAt = new Date().toISOString()
  const explanation = encodeNoteExplanation({ explanation: input.explanation, pros: input.pros, cons: input.cons })

  const updated = await c
    .from("asm_api_notes")
    .update({ explanation, grounded: input.grounded, generated_at: generatedAt })
    .eq("api_id", input.apiId)
    .eq("is_user_edited", false)
    .select(NOTE_COLS)
  if (updated.error) throw updated.error
  if (updated.data.length > 0) return toApiNote(updated.data[0])

  const inserted = await c
    .from("asm_api_notes")
    .insert({
      api_id: input.apiId,
      product_id: input.productId,
      explanation,
      grounded: input.grounded,
      is_user_edited: false,
      generated_at: generatedAt,
    })
    .select(NOTE_COLS)
    .single()
  if (inserted.error) {
    // 23505 = update(0행)→insert 사이에 동시 요청이 먼저 씀. 그 행을 돌려주면 500 대신 정상 수렴한다.
    // 재조회 실패는 삼켜서 원래 23505 를 던진다(근본 원인이 로그에 남게).
    if (inserted.error.code === "23505") {
      const existing = await getApiNote(c, input.apiId).catch(() => null)
      if (existing) return existing
    }
    throw inserted.error
  }
  return toApiNote(inserted.data)
}

// 사용자 편집 — 설명을 사람이 고친 값으로 바꾸고 is_user_edited=true 로 잠가 AI 재생성이 덮지 않게 한다.
export async function setUserEditedApiNote(c: AssemblerClient, apiId: string, explanation: string): Promise<ApiNote | null> {
  const { data, error } = await c
    .from("asm_api_notes")
    .update({ explanation, is_user_edited: true })
    .eq("api_id", apiId)
    .select(NOTE_COLS)
    .single()
  if (error) return isNotFound(error) ? null : Promise.reject(error)
  return toApiNote(data)
}
