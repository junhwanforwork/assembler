import type { DbTableNote } from "@/lib/types/assembler"
import type { AssemblerClient } from "./assembler"
import { toDbTableNote } from "./assembler-rows"

// asm_db_table_notes 리포지토리 — DB Learning 호버 설명(AI 추론) 저장/조회.
// code-truth(asm_db_tables)와 분리된 레이어. 소유권은 부모 asm_products RLS가 강제한다.
// SELECT * 금지(api.md) — 컬럼 명시.
const NOTE_COLS = "id, db_table_id, product_id, explanation, grounded, is_user_edited, generated_at, updated_at"

// PGRST116 = .single()이 행을 못 찾음(노트 미생성). 노트 없음은 정상 상태 → null.
function isNotFound(error: { code?: string } | null): boolean {
  return error?.code === "PGRST116"
}

export async function getDbTableNote(c: AssemblerClient, dbTableId: string): Promise<DbTableNote | null> {
  const { data, error } = await c.from("asm_db_table_notes").select(NOTE_COLS).eq("db_table_id", dbTableId).single()
  if (error) return isNotFound(error) ? null : Promise.reject(error)
  return toDbTableNote(data)
}

export type UpsertDbTableNoteInput = {
  dbTableId: string
  productId: string
  explanation: string
  grounded: boolean
}

// AI 생성 결과 저장 — 테이블당 1개(db_table_id 멱등).
// ⚠️ 사용자 편집본 보호: blind upsert 면 is_user_edited 를 false 로 되돌려 사용자 편집을 덮는 race 가 생긴다.
//   그래서 (1) is_user_edited=false 인 기존 AI 행만 갱신, (2) 행이 없으면 insert 로 나눈다.
//   사용자 편집(is_user_edited=true) 행이 있으면 (1)이 0행 → (2) insert 가 unique 충돌로 throw → 편집 보존(덮어쓰기 차단).
export async function upsertDbTableNote(c: AssemblerClient, input: UpsertDbTableNoteInput): Promise<DbTableNote> {
  const generatedAt = new Date().toISOString()

  const updated = await c
    .from("asm_db_table_notes")
    .update({ explanation: input.explanation, grounded: input.grounded, generated_at: generatedAt })
    .eq("db_table_id", input.dbTableId)
    .eq("is_user_edited", false)
    .select(NOTE_COLS)
  if (updated.error) throw updated.error
  if (updated.data.length > 0) return toDbTableNote(updated.data[0])

  const inserted = await c
    .from("asm_db_table_notes")
    .insert({
      db_table_id: input.dbTableId,
      product_id: input.productId,
      explanation: input.explanation,
      grounded: input.grounded,
      is_user_edited: false,
      generated_at: generatedAt,
    })
    .select(NOTE_COLS)
    .single()
  if (inserted.error) {
    // 23505 = update(0행)→insert 사이에 동시 요청이 먼저 씀. 그 행(유저 편집본 or 타 AI 노트)을 돌려주면
    // 응답이 500 대신 정상 수렴한다 — 편집 보존 규약(위 주석)은 그대로 유지된다.
    // 재조회 실패는 삼켜서 원래 23505 를 던진다(근본 원인이 로그에 남게).
    if (inserted.error.code === "23505") {
      const existing = await getDbTableNote(c, input.dbTableId).catch(() => null)
      if (existing) return existing
    }
    throw inserted.error
  }
  return toDbTableNote(inserted.data)
}

// 사용자 편집 — 설명을 사람이 고친 값으로 바꾸고 is_user_edited=true 로 잠가 AI 재생성이 덮지 않게 한다.
export async function setUserEditedNote(c: AssemblerClient, dbTableId: string, explanation: string): Promise<DbTableNote | null> {
  const { data, error } = await c
    .from("asm_db_table_notes")
    .update({ explanation, is_user_edited: true })
    .eq("db_table_id", dbTableId)
    .select(NOTE_COLS)
    .single()
  if (error) return isNotFound(error) ? null : Promise.reject(error)
  return toDbTableNote(data)
}
