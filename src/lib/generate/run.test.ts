import { describe, it, expect, vi, beforeEach } from "vitest"
import { runGenerate } from "./run"
import { AnthropicApiError, AnthropicKeyMissingError, AnthropicRefusalError, type AnthropicUsage } from "@/lib/anthropic"
import type { WorkspaceDesign } from "@/lib/types/assembler"

// ASM-042: 생성은 스트리밍 경로(streamAnthropicWithRetry)로 — 하드 wall-clock 캡을
// idle 캡으로 전환해 "내용이 충실할수록 실패"를 없앤다. AI 실호출 없음(모듈 모킹).

vi.mock("@/lib/anthropic-retry", () => ({
  streamAnthropicWithRetry: vi.fn(),
}))
import { streamAnthropicWithRetry } from "@/lib/anthropic-retry"

const streamMock = vi.mocked(streamAnthropicWithRetry)

function coherent(): WorkspaceDesign {
  return {
    requirements: [{ id: "req-1", title: "로그인", description: "", status: "approved", priority: "high", role: "user", acceptanceCriteria: [] }],
    features: [{ id: "feat-1", name: "인증", description: "", detailFeatures: [], requirementIds: ["req-1"], pageIds: ["page-1"], apiIds: [] }],
    pages: [{ id: "page-1", name: "로그인", description: "", wireframeId: "wf-1" }],
    flows: [],
    wireframes: [{ id: "wf-1", elementIds: ["el-1"] }],
    elements: [{ id: "el-1", label: "로그인 버튼", type: "button", action: "검증", states: [], result: "홈 이동", apiIds: [], dbTableIds: [] }],
  }
}

// 스트림 성공 모킹 — 텍스트를 조각내 onText 로 흘리고 usage 를 반환한다.
function mockStreamSuccess(text: string, usage?: AnthropicUsage) {
  streamMock.mockImplementation(async (_params, onText) => {
    const mid = Math.floor(text.length / 2)
    onText(text.slice(0, mid))
    onText(text.slice(mid))
    return usage
  })
}

describe("runGenerate 스트리밍 배선 (ASM-042)", () => {
  // 블록 바디 필수 — mockClear() 는 mock 자신을 반환하고, beforeEach 가 함수를 반환하면
  // vitest 가 테스트 후 cleanup 으로 "호출"한다(= 우리 mock 이 엉뚱한 인자로 실행됨).
  beforeEach(() => {
    streamMock.mockClear()
  })

  it("조각난 델타를 누적해 파싱하고 usage 를 그대로 넘긴다", async () => {
    const usage = { input_tokens: 100, output_tokens: 4000 }
    mockStreamSuccess(JSON.stringify(coherent()), usage)
    const r = await runGenerate("산책 앱", [], [])
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.design.features[0].id).toBe("feat-1")
      expect(r.usage).toEqual(usage)
    }
  })

  it("idle 캡(60s)·wall 백스톱(300s)으로 호출한다 — 정상 103s 케이스가 죽지 않는 설정", async () => {
    mockStreamSuccess(JSON.stringify(coherent()))
    await runGenerate("산책 앱", [], [])
    expect(streamMock).toHaveBeenCalledTimes(1)
    expect(streamMock.mock.calls[0][0]).toMatchObject({
      model: "opus",
      // ASM-045: 실측 12,663톤 = 옛 상한 16000의 79% — 잘림 여유 확보로 24000(모델 상한 128K 내).
      maxTokens: 24000,
      cacheSystem: true,
      thinking: "adaptive",
      timeoutMs: 60000,
      wallMs: 280000,
    })
  })

  it("504(타임아웃)는 ai_error 가 아니라 ai_timeout/504 로 분리한다", async () => {
    streamMock.mockRejectedValue(new AnthropicApiError(504, "Anthropic 응답 시간이 초과됐어요"))
    expect(await runGenerate("산책 앱", [], [])).toEqual({ ok: false, error: "ai_timeout", status: 504 })
  })

  it("그 외 API 오류는 기존대로 ai_error/502", async () => {
    streamMock.mockRejectedValue(new AnthropicApiError(500, "boom"))
    expect(await runGenerate("산책 앱", [], [])).toEqual({ ok: false, error: "ai_error", status: 502 })
  })

  it("키 없음 → ai_unavailable/503 · refusal → ai_refused/422 유지", async () => {
    streamMock.mockRejectedValue(new AnthropicKeyMissingError())
    expect(await runGenerate("산책 앱", [], [])).toEqual({ ok: false, error: "ai_unavailable", status: 503 })
    streamMock.mockRejectedValue(new AnthropicRefusalError())
    expect(await runGenerate("산책 앱", [], [])).toEqual({ ok: false, error: "ai_refused", status: 422 })
  })

  it("분류 밖 오류는 server_error/500", async () => {
    streamMock.mockRejectedValue(new Error("unexpected"))
    expect(await runGenerate("산책 앱", [], [])).toEqual({ ok: false, error: "server_error", status: 500 })
  })

  it("스트림이 끝나도 JSON 이 아니면 invalid_json/422 — 부분 그래프로 통과 금지", async () => {
    mockStreamSuccess("미안하지만 못 만들겠어요")
    expect(await runGenerate("산책 앱", [], [])).toEqual({ ok: false, error: "invalid_json", status: 422 })
  })

  // ASM-045: G-1 스모크 422 invalid_json(2회 중 1회)이 서버 로그 부재로 원인 미확정이었다 —
  // 파싱 실패·스트림 예외에 [api:generate] 관측 로그를 강제한다(본문 전문 금지, 꼬리 ≤300자만).
  describe("관측 로그 (ASM-045)", () => {
    it("파싱 실패는 textLen·usage·stop_reason·꼬리를 로그로 남긴다 — 본문 전문 미노출", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const longText = "가".repeat(1000) + "…잘린 꼬리"
      mockStreamSuccess(longText, { input_tokens: 100, output_tokens: 24000, stop_reason: "max_tokens" })

      expect(await runGenerate("산책 앱", [], [])).toEqual({ ok: false, error: "invalid_json", status: 422 })

      expect(errSpy).toHaveBeenCalledTimes(1)
      const [prefix, payload] = errSpy.mock.calls[0] as [string, Record<string, unknown>]
      expect(prefix).toBe("[api:generate]")
      expect(payload).toMatchObject({
        stage: "parse",
        error: "invalid_json",
        textLen: longText.length,
        outputTokens: 24000,
        stopReason: "max_tokens",
      })
      expect((payload.tail as string).length).toBeLessThanOrEqual(300)
      // 아이디어·본문 전문이 로그로 새지 않는다 — 꼬리만.
      expect(JSON.stringify(errSpy.mock.calls[0])).not.toContain("가".repeat(400))
      errSpy.mockRestore()
    })

    it("스트림 예외도 상태·메시지를 로그로 남긴다 — 502 원인 관측(ASM-043 ⑧)", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      streamMock.mockRejectedValue(new AnthropicApiError(500, "overloaded upstream"))

      expect(await runGenerate("산책 앱", [], [])).toEqual({ ok: false, error: "ai_error", status: 502 })

      expect(errSpy).toHaveBeenCalledTimes(1)
      const [prefix, payload] = errSpy.mock.calls[0] as [string, Record<string, unknown>]
      expect(prefix).toBe("[api:generate]")
      expect(payload).toMatchObject({ stage: "stream", name: "AnthropicApiError", status: 500 })
      expect(payload.message).toContain("overloaded")
      errSpy.mockRestore()
    })

    it("성공 경로는 로그를 남기지 않는다", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      mockStreamSuccess(JSON.stringify(coherent()))
      const r = await runGenerate("산책 앱", [], [])
      expect(r.ok).toBe(true)
      expect(errSpy).not.toHaveBeenCalled()
      errSpy.mockRestore()
    })
  })

  it("코드-진실 환각 참조는 스트리밍 경로에서도 살균된다", async () => {
    const d = coherent()
    d.elements[0].apiIds = ["api-real", "api-hallucinated"]
    mockStreamSuccess(JSON.stringify(d))
    const r = await runGenerate(
      "산책 앱",
      [{ id: "api-real", productId: "p1", method: "GET", endpoint: "/walks", summary: "", status: "active", source: "code" }],
      []
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.design.elements[0].apiIds).toEqual(["api-real"])
  })
})
