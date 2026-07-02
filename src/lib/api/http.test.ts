import { describe, it, expect } from "vitest"
import { contentLengthExceeds, getSessionId } from "./http"

// 세션 헤더 UUID 강제(ASM-001) + Content-Length 선제 게이트(ASM-004) 계약.

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/test", { headers })
}

describe("getSessionId", () => {
  it("UUID 형식이면 그대로 반환 (crypto.randomUUID 값)", () => {
    const id = "3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b"
    expect(getSessionId(req({ "x-session-id": id }))).toBe(id)
    expect(getSessionId(req({ "x-session-id": id.toUpperCase() }))).toBe(id.toUpperCase())
  })
  it("비UUID 임의 문자열·누락은 null — RLS 비교·rate limit 키 오염 차단", () => {
    expect(getSessionId(req({ "x-session-id": "e2e-session" }))).toBeNull()
    expect(getSessionId(req({ "x-session-id": "x".repeat(200) }))).toBeNull()
    expect(getSessionId(req({}))).toBeNull()
  })
})

describe("contentLengthExceeds", () => {
  it("헤더가 캡을 넘으면 true, 이내·누락(chunked)이면 false", () => {
    expect(contentLengthExceeds(req({ "content-length": "1001" }), 1000)).toBe(true)
    expect(contentLengthExceeds(req({ "content-length": "1000" }), 1000)).toBe(false)
    expect(contentLengthExceeds(req({}), 1000)).toBe(false)
  })
})
