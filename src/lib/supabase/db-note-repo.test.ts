import { describe, it, expect } from "vitest"
import { upsertDbTableNote } from "./db-note-repo"
import type { AssemblerClient } from "./assembler"
import type { AsmDbTableNoteRow } from "./assembler-rows"

// upsertDbTableNote 동시성 — update(0행)→insert 사이에 다른 요청이 먼저 쓰면
// unique(db_table_id) 23505 로 터진다. 500 대신 그 행을 읽어 돌려줘야 한다(ASM-005).

const ROW: AsmDbTableNoteRow = {
  id: "note-1",
  db_table_id: "table-1",
  product_id: "prod-1",
  explanation: "사용자가 고친 설명",
  grounded: true,
  is_user_edited: true,
  generated_at: "2026-07-02T00:00:00Z",
  updated_at: "2026-07-02T00:00:00Z",
}

type Result = { data: unknown; error: { code?: string; message?: string } | null }

// 호출 체인별 스크립트 스텁 — update 는 select() 를 await, insert/조회는 single() 을 await 한다.
function makeClient(script: { update: Result; insert: Result; get?: Result }): AssemblerClient {
  return {
    from: () => ({
      update: () => ({ eq: () => ({ eq: () => ({ select: () => Promise.resolve(script.update) }) }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve(script.insert) }) }),
      select: () => ({ eq: () => ({ single: () => Promise.resolve(script.get ?? { data: null, error: { code: "PGRST116" } }) }) }),
    }),
  } as unknown as AssemblerClient
}

const INPUT = { dbTableId: "table-1", productId: "prod-1", explanation: "AI 설명", grounded: false }

describe("upsertDbTableNote 동시성 복구", () => {
  it("insert 가 23505(동시 선점)로 실패하면 기존 행을 반환", async () => {
    const c = makeClient({
      update: { data: [], error: null },
      insert: { data: null, error: { code: "23505", message: "duplicate key" } },
      get: { data: ROW, error: null },
    })
    const note = await upsertDbTableNote(c, INPUT)
    expect(note.id).toBe("note-1")
    expect(note.isUserEdited).toBe(true)
  })

  it("23505 인데 행 재조회도 실패하면 원래 에러를 던짐", async () => {
    const c = makeClient({
      update: { data: [], error: null },
      insert: { data: null, error: { code: "23505", message: "duplicate key" } },
      get: { data: null, error: { code: "PGRST116" } },
    })
    await expect(upsertDbTableNote(c, INPUT)).rejects.toMatchObject({ code: "23505" })
  })

  it("23505 재조회가 다른 에러로 실패해도 원래 23505 를 던짐 (원인 마스킹 방지)", async () => {
    const c = makeClient({
      update: { data: [], error: null },
      insert: { data: null, error: { code: "23505", message: "duplicate key" } },
      get: { data: null, error: { code: "57014", message: "timeout" } },
    })
    await expect(upsertDbTableNote(c, INPUT)).rejects.toMatchObject({ code: "23505" })
  })

  it("23505 가 아닌 insert 에러는 그대로 던짐", async () => {
    const c = makeClient({
      update: { data: [], error: null },
      insert: { data: null, error: { code: "23503", message: "fk violation" } },
    })
    await expect(upsertDbTableNote(c, INPUT)).rejects.toMatchObject({ code: "23503" })
  })
})
