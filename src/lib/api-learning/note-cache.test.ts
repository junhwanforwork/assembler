import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { getCachedApiNote, setCachedApiNote, invalidateCachedApiNote, clearApiNoteCache } from "./note-cache"
import type { ApiNote } from "@/lib/types/assembler"

// ASM-064 — API 노트 워크스페이스 캐시(db-learning note-cache 미러) + ASM-059 ① 교훈 선반영:
// 서버(window 없음)에서는 읽기=미캐시·쓰기=no-op — 요청 간 세션 교차 상태가 생기지 않는다.
// node 환경이라 브라우저 동작은 window 스텁으로 검증한다.

function note(apiId: string): ApiNote {
  return {
    id: `n-${apiId}`,
    apiId,
    productId: "p1",
    explanation: "회원가입에서 계정을 만들어요.",
    grounded: true,
    isUserEdited: false,
    generatedAt: "2026-07-09T00:00:00Z",
  }
}

describe("api note-cache (브라우저)", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {})
    clearApiNoteCache()
  })
  afterEach(() => vi.unstubAllGlobals())

  it("미캐시는 undefined, 저장 후엔 그 값을 돌려준다", () => {
    expect(getCachedApiNote("w1", "a1")).toBeUndefined()
    setCachedApiNote("w1", "a1", note("a1"))
    expect(getCachedApiNote("w1", "a1")).toEqual(note("a1"))
  })

  it("'노트 없음'(null)도 캐시한다 — 재발사 방지", () => {
    setCachedApiNote("w1", "a1", null)
    expect(getCachedApiNote("w1", "a1")).toBeNull()
  })

  it("무효화는 해당 워크스페이스의 해당 API만 지운다", () => {
    setCachedApiNote("w1", "a1", note("a1"))
    setCachedApiNote("w1", "a2", note("a2"))
    invalidateCachedApiNote("w1", "a1")
    expect(getCachedApiNote("w1", "a1")).toBeUndefined()
    expect(getCachedApiNote("w1", "a2")).toEqual(note("a2"))
  })

  it("워크스페이스끼리 격리된다", () => {
    setCachedApiNote("w1", "a1", note("a1"))
    expect(getCachedApiNote("w2", "a1")).toBeUndefined()
  })
})

describe("api note-cache (서버 가드 — ASM-059 ①)", () => {
  it("window가 없으면 쓰기는 no-op, 읽기는 항상 미캐시다", () => {
    setCachedApiNote("w1", "a1", note("a1"))
    expect(getCachedApiNote("w1", "a1")).toBeUndefined()
  })
})
