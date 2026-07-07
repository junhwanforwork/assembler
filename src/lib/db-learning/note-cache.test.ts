import { describe, it, expect, beforeEach } from "vitest"
import { getCachedNote, setCachedNote, invalidateCachedNote, clearNoteCache } from "./note-cache"
import type { DbTableNote } from "@/lib/types/assembler"

// ASM-056 ⑦ — 문서 종류 전환마다 노트 GET 전량 재발사를 막는 워크스페이스 단위 메모리 캐시.
// "노트 없음"(null)도 유효한 캐시 값이라 미캐시(undefined)와 구분해야 한다.

function note(tableId: string): DbTableNote {
  return {
    id: `n-${tableId}`,
    dbTableId: tableId,
    productId: "p1",
    explanation: "산책 기록을 담아요.",
    grounded: true,
    isUserEdited: false,
    generatedAt: "2026-07-07T00:00:00Z",
  }
}

beforeEach(() => clearNoteCache())

describe("note-cache", () => {
  it("미캐시는 undefined, 저장 후엔 그 값을 돌려준다", () => {
    expect(getCachedNote("w1", "t1")).toBeUndefined()
    setCachedNote("w1", "t1", note("t1"))
    expect(getCachedNote("w1", "t1")).toEqual(note("t1"))
  })

  it("'노트 없음'(null)도 캐시한다 — 재발사 방지", () => {
    setCachedNote("w1", "t1", null)
    expect(getCachedNote("w1", "t1")).toBeNull()
  })

  it("무효화는 해당 워크스페이스의 해당 테이블만 지운다", () => {
    setCachedNote("w1", "t1", note("t1"))
    setCachedNote("w1", "t2", note("t2"))
    invalidateCachedNote("w1", "t1")
    expect(getCachedNote("w1", "t1")).toBeUndefined()
    expect(getCachedNote("w1", "t2")).toEqual(note("t2"))
  })

  it("워크스페이스끼리 격리된다", () => {
    setCachedNote("w1", "t1", note("t1"))
    expect(getCachedNote("w2", "t1")).toBeUndefined()
    invalidateCachedNote("w2", "t1")
    expect(getCachedNote("w1", "t1")).toEqual(note("t1"))
  })
})
