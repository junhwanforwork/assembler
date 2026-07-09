import { describe, it, expect, vi, beforeEach } from "vitest"
import { AnthropicApiError, AnthropicKeyMissingError, AnthropicRefusalError } from "@/lib/anthropic"
import type { ApiEvidence } from "./evidence"
import { runApiLearning } from "./run"

// ASM-064 — run의 검증·클램프·폴백 경로 고정(db-learning run 미러). AI 호출은 모킹(네트워크 차단).
const callMock = vi.fn()
vi.mock("@/lib/anthropic-retry", () => ({
  callAnthropicWithRetry: (...args: unknown[]) => callMock(...args),
}))

function isolatedEvidence(): ApiEvidence {
  return {
    api: { id: "api-1", productId: "p1", method: "GET", endpoint: "/health", summary: "", status: "active", source: "code" },
    usedByFeatures: [],
    relatedTables: [],
    isIsolated: true,
  }
}

function connectedEvidence(): ApiEvidence {
  return {
    api: { id: "api-2", productId: "p1", method: "POST", endpoint: "/signup", summary: "", status: "active", source: "code" },
    usedByFeatures: ["회원가입"],
    relatedTables: ["users"],
    isIsolated: false,
  }
}

function aiReturns(obj: unknown) {
  return { text: JSON.stringify(obj), usage: undefined }
}

beforeEach(() => callMock.mockReset())

describe("runApiLearning", () => {
  it("고립 API는 AI가 grounded=true를 줘도 false로 클램프한다", async () => {
    callMock.mockResolvedValue(aiReturns({ explanation: "상태 확인 API 같아요.", grounded: true, mentionedNames: [] }))
    const r = await runApiLearning(isolatedEvidence())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.note.grounded).toBe(false)
  })

  it("연결된 API는 grounded=true를 통과시킨다", async () => {
    callMock.mockResolvedValue(aiReturns({ explanation: "회원가입에서 계정을 만들어요.", grounded: true, mentionedNames: ["회원가입", "users"] }))
    const r = await runApiLearning(connectedEvidence())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.note).toEqual({ explanation: "회원가입에서 계정을 만들어요.", grounded: true })
  })

  it("증거 밖 이름을 언급하면(환각) 거부 → 재시도 후 정상이면 그 결과를 쓴다", async () => {
    callMock
      .mockResolvedValueOnce(aiReturns({ explanation: "결제에서 써요.", grounded: true, mentionedNames: ["결제"] }))
      .mockResolvedValueOnce(aiReturns({ explanation: "회원가입에서 써요.", grounded: true, mentionedNames: ["회원가입"] }))
    const r = await runApiLearning(connectedEvidence())
    expect(callMock).toHaveBeenCalledTimes(2)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.note.explanation).toBe("회원가입에서 써요.")
  })

  it("두 번 다 실패하면 method·endpoint 사실만 담은 보수 폴백으로 강등한다", async () => {
    callMock.mockResolvedValue({ text: "이건 JSON이 아니에요", usage: undefined })
    const r = await runApiLearning(connectedEvidence())
    expect(callMock).toHaveBeenCalledTimes(2)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.note.grounded).toBe(false)
      expect(r.note.explanation).toContain("POST")
      expect(r.note.explanation).toContain("/signup")
      expect(r.note.pros).toBeUndefined()
      expect(r.note.cons).toBeUndefined()
    }
  })

  it("성공 경로에서 pros/cons가 그대로 통과한다", async () => {
    callMock.mockResolvedValue(
      aiReturns({
        explanation: "회원가입에서 계정을 만들어요.",
        grounded: true,
        mentionedNames: ["회원가입"],
        pros: ["가입 흐름과 연결이 명확해요."],
        cons: ["실패 응답 정보는 따로 없어요."],
      }),
    )
    const r = await runApiLearning(connectedEvidence())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.note.pros).toEqual(["가입 흐름과 연결이 명확해요."])
      expect(r.note.cons).toEqual(["실패 응답 정보는 따로 없어요."])
    }
  })

  it("고립 API는 AI가 pros/cons를 줘도 드롭한다 — 보수 안내와 '좋은 점'이 공존하지 않게", async () => {
    callMock.mockResolvedValue(
      aiReturns({ explanation: "상태 확인 API 같아요.", grounded: false, mentionedNames: [], pros: ["빠른 확인"], cons: ["연결 없음"] }),
    )
    const r = await runApiLearning(isolatedEvidence())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.note.grounded).toBe(false)
      expect(r.note.pros).toBeUndefined()
      expect(r.note.cons).toBeUndefined()
    }
  })

  it("키 없음은 폴백하지 않고 503 ai_unavailable로 surface한다", async () => {
    callMock.mockRejectedValueOnce(new AnthropicKeyMissingError())
    const r = await runApiLearning(connectedEvidence())
    expect(r).toEqual({ ok: false, error: "ai_unavailable", status: 503 })
  })

  it("refusal은 422, 그 외 API 오류는 502로 매핑한다", async () => {
    callMock.mockRejectedValueOnce(new AnthropicRefusalError())
    expect(await runApiLearning(connectedEvidence())).toEqual({ ok: false, error: "ai_refused", status: 422 })
    callMock.mockRejectedValueOnce(new AnthropicApiError(500, "boom"))
    expect(await runApiLearning(connectedEvidence())).toEqual({ ok: false, error: "ai_error", status: 502 })
  })
})
