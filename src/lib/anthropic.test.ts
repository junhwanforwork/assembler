import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { callAnthropic, AnthropicApiError } from "./anthropic"

// 200 응답인데 content 가 배열이 아닌 변형(필드 누락·비배열) 방어 — TypeError 500 대신
// AnthropicApiError 로 던져 소비처의 ai_error/502 매핑에 태운다(ASM-005).

const PARAMS = { system: "s", messages: [{ role: "user" as const, content: "hi" }] }

function mock200(body: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })),
  )
}

describe("callAnthropic content 가드", () => {
  beforeEach(() => vi.stubEnv("ANTHROPIC_API_KEY", "test-key"))
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("content 필드가 없으면 AnthropicApiError", async () => {
    mock200({ stop_reason: "end_turn" })
    await expect(callAnthropic(PARAMS)).rejects.toBeInstanceOf(AnthropicApiError)
  })

  it("content 가 배열이 아니면 AnthropicApiError", async () => {
    mock200({ stop_reason: "end_turn", content: "not-an-array" })
    await expect(callAnthropic(PARAMS)).rejects.toBeInstanceOf(AnthropicApiError)
  })

  it("정상 text 블록 경로는 그대로 동작", async () => {
    mock200({ stop_reason: "end_turn", content: [{ type: "text", text: "안녕" }], usage: { input_tokens: 1, output_tokens: 2 } })
    const result = await callAnthropic(PARAMS)
    expect(result.text).toBe("안녕")
    expect(result.usage).toEqual({ input_tokens: 1, output_tokens: 2 })
  })
})
