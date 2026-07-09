import { describe, it, expect } from "vitest"
import { upsertApiNote } from "./api-note-repo"
import type { AssemblerClient } from "./assembler"
import type { AsmApiNoteRow } from "./assembler-rows"

// ASM-064 — db-note-repo 미러: update(0행)→insert 동시성 23505 복구 + 봉투 왕복(note-codec 재사용).

const ROW: AsmApiNoteRow = {
  id: "note-1",
  api_id: "api-1",
  product_id: "prod-1",
  explanation: "사용자가 고친 설명",
  grounded: true,
  is_user_edited: true,
  generated_at: "2026-07-09T00:00:00Z",
  updated_at: "2026-07-09T00:00:00Z",
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

const INPUT = { apiId: "api-1", productId: "prod-1", explanation: "AI 설명", grounded: false }

describe("upsertApiNote 동시성 복구", () => {
  it("insert 가 23505(동시 선점)로 실패하면 기존 행을 반환", async () => {
    const c = makeClient({
      update: { data: [], error: null },
      insert: { data: null, error: { code: "23505", message: "duplicate key" } },
      get: { data: ROW, error: null },
    })
    const n = await upsertApiNote(c, INPUT)
    expect(n.id).toBe("note-1")
    expect(n.isUserEdited).toBe(true)
  })

  it("23505 인데 행 재조회도 실패하면 원래 에러를 던짐", async () => {
    const c = makeClient({
      update: { data: [], error: null },
      insert: { data: null, error: { code: "23505", message: "duplicate key" } },
      get: { data: null, error: { code: "PGRST116" } },
    })
    await expect(upsertApiNote(c, INPUT)).rejects.toMatchObject({ code: "23505" })
  })

  it("23505 가 아닌 insert 에러는 그대로 던짐", async () => {
    const c = makeClient({
      update: { data: [], error: null },
      insert: { data: null, error: { code: "23503", message: "fk violation" } },
    })
    await expect(upsertApiNote(c, INPUT)).rejects.toMatchObject({ code: "23503" })
  })
})

describe("upsertApiNote 구조화 노트 저장 경계", () => {
  it("pros/cons가 있으면 봉투로 인코딩해 저장하고, 반환 노트는 디코드되어 나온다", async () => {
    let saved = ""
    const c = {
      from: () => ({
        update: (payload: { explanation: string }) => {
          saved = payload.explanation
          return {
            eq: () => ({
              eq: () => ({
                select: () =>
                  Promise.resolve({ data: [{ ...ROW, is_user_edited: false, explanation: saved }], error: null }),
              }),
            }),
          }
        },
      }),
    } as unknown as AssemblerClient

    const n = await upsertApiNote(c, { ...INPUT, pros: ["연결이 명확해요."], cons: ["에러 응답 정보는 없어요."] })
    expect(JSON.parse(saved)).toEqual({ v: 1, summary: "AI 설명", pros: ["연결이 명확해요."], cons: ["에러 응답 정보는 없어요."] })
    expect(n.explanation).toBe("AI 설명")
    expect(n.pros).toEqual(["연결이 명확해요."])
    expect(n.cons).toEqual(["에러 응답 정보는 없어요."])
  })

  it("pros/cons가 없으면 평문 그대로 저장한다(구형 호환)", async () => {
    let saved = ""
    const c = {
      from: () => ({
        update: (payload: { explanation: string }) => {
          saved = payload.explanation
          return {
            eq: () => ({
              eq: () => ({
                select: () =>
                  Promise.resolve({ data: [{ ...ROW, is_user_edited: false, explanation: saved }], error: null }),
              }),
            }),
          }
        },
      }),
    } as unknown as AssemblerClient

    const n = await upsertApiNote(c, INPUT)
    expect(saved).toBe("AI 설명")
    expect(n.explanation).toBe("AI 설명")
    expect(n.pros).toBeUndefined()
  })

  it("사용자 편집본 행은 평문 그대로 통과한다(재해석 금지) — toApiNote 경계", async () => {
    const edited = { ...ROW, explanation: '{"v":1,"summary":"붙여넣은 JSON"}' }
    const c = makeClient({
      update: { data: [], error: null },
      insert: { data: edited, error: null },
    })
    const n = await upsertApiNote(c, INPUT)
    expect(n.explanation).toBe('{"v":1,"summary":"붙여넣은 JSON"}')
  })
})
