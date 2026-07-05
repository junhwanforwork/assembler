import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { callAnthropic, streamAnthropic, AnthropicApiError } from "./anthropic"
import { streamAnthropicWithRetry } from "./anthropic-retry"

// 200 응답인데 content 가 배열이 아닌 변형(필드 누락·비배열) 방어 — TypeError 500 대신
// AnthropicApiError 로 던져 소비처의 ai_error/502 매핑에 태운다(ASM-005).
// 타임아웃(abort) 경로는 ASM-042: 어디서 끊기든 raw AbortError 가 아니라 504 로 분류돼야
// 소비처(runGenerate)가 ai_timeout 을 매핑할 수 있다.

const PARAMS = { system: "s", messages: [{ role: "user" as const, content: "hi" }] }

function mock200(body: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })),
  )
}

// undici 동작 모사: signal abort 시 응답 본문 read() 가 AbortError 로 거부된다.
function abortError(): Error {
  return Object.assign(new Error("aborted"), { name: "AbortError" })
}

function sseFrame(json: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(json)}\n`)
}

const TEXT_DELTA = (text: string) => ({ type: "content_block_delta", delta: { type: "text_delta", text } })

// SSE 스트림 응답 모킹 — intervalMs 간격으로 frames 를 흘리고 끝나면 닫는다.
// maxFrames 이후 멈추면(닫지 않음) idle 시나리오가 된다.
function mockSseFetch(opts: { frames: Uint8Array[]; intervalMs: number; closeAtEnd: boolean }) {
  const fetchMock = vi.fn().mockImplementation((_url: unknown, init?: RequestInit) => {
    let timer: ReturnType<typeof setInterval> | undefined
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let sent = 0
        timer = setInterval(() => {
          if (sent < opts.frames.length) {
            controller.enqueue(opts.frames[sent])
            sent += 1
          } else if (opts.closeAtEnd) {
            clearInterval(timer)
            controller.close()
          }
          // closeAtEnd=false 면 프레임 소진 후 무한 idle — abort 대기.
        }, opts.intervalMs)
        init?.signal?.addEventListener("abort", () => {
          clearInterval(timer)
          controller.error(abortError())
        })
      },
      cancel() {
        clearInterval(timer)
      },
    })
    return Promise.resolve(new Response(stream, { status: 200 }))
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
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

  it("timeoutMs 초과(abort)는 raw AbortError 가 아니라 AnthropicApiError 504", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_url: unknown, init?: RequestInit) =>
          new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(abortError()))),
      ),
    )
    const err = await callAnthropic({ ...PARAMS, timeoutMs: 20 }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AnthropicApiError)
    expect((err as AnthropicApiError).status).toBe(504)
  })
})

describe("streamAnthropic 타임아웃 분류 (ASM-042)", () => {
  beforeEach(() => vi.stubEnv("ANTHROPIC_API_KEY", "test-key"))
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("정상 스트림: 델타 누적 + usage 반환", async () => {
    mockSseFetch({
      frames: [
        sseFrame({ type: "message_start", message: { usage: { input_tokens: 5, output_tokens: 0 } } }),
        sseFrame(TEXT_DELTA("안")),
        sseFrame(TEXT_DELTA("녕")),
        sseFrame({ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 2 } }),
      ],
      intervalMs: 5,
      closeAtEnd: true,
    })
    const seen: string[] = []
    const usage = await streamAnthropic(PARAMS, (d) => seen.push(d))
    expect(seen.join("")).toBe("안녕")
    // ASM-045: usage 에 stop_reason 이 실린다 — 기대값 갱신(계약 확장).
    expect(usage).toEqual({ input_tokens: 5, output_tokens: 2, stop_reason: "end_turn" })
  })

  it("스트림 중간에 멈추면(idle 초과) AnthropicApiError 504", async () => {
    // 첫 델타 후 무한 idle — 현재 코드는 read() 의 AbortError 가 그대로 새 나가
    // 소비처에서 server_error 500 으로 오분류된다. 504 로 분류돼야 한다.
    mockSseFetch({ frames: [sseFrame(TEXT_DELTA("부분"))], intervalMs: 5, closeAtEnd: false })
    const seen: string[] = []
    const err = await streamAnthropic({ ...PARAMS, timeoutMs: 40 }, (d) => seen.push(d)).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AnthropicApiError)
    expect((err as AnthropicApiError).status).toBe(504)
    expect(seen).toEqual(["부분"])
  })

  // ASM-045: max_tokens 소진 잘림을 추론(출력토큰 근접도)이 아니라 stop_reason 으로 확정 관측한다.
  it("message_delta 의 stop_reason 을 usage 에 실어 반환한다 — max_tokens 잘림 관측", async () => {
    mockSseFetch({
      frames: [
        sseFrame({ type: "message_start", message: { usage: { input_tokens: 5, output_tokens: 0 } } }),
        sseFrame(TEXT_DELTA("잘린")),
        sseFrame({ type: "message_delta", delta: { stop_reason: "max_tokens" }, usage: { output_tokens: 16000 } }),
      ],
      intervalMs: 5,
      closeAtEnd: true,
    })
    const usage = await streamAnthropic(PARAMS, () => {})
    expect(usage).toEqual({ input_tokens: 5, output_tokens: 16000, stop_reason: "max_tokens" })
  })

  it("정상 종료(end_turn)도 stop_reason 을 남긴다 — 잘림 아님을 구분 가능", async () => {
    mockSseFetch({
      frames: [
        sseFrame({ type: "message_start", message: { usage: { input_tokens: 5, output_tokens: 0 } } }),
        sseFrame(TEXT_DELTA("완결")),
        sseFrame({ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 2 } }),
      ],
      intervalMs: 5,
      closeAtEnd: true,
    })
    const usage = await streamAnthropic(PARAMS, () => {})
    expect(usage?.stop_reason).toBe("end_turn")
  })

  it("청크가 계속 와도 wallMs(총 상한)를 넘기면 504 로 끊는다", async () => {
    // 핑/델타만 계속 오는 stall 방어 — idle 캡은 리셋되므로 wall 백스톱이 필요하다.
    mockSseFetch({
      frames: Array.from({ length: 60 }, () => sseFrame(TEXT_DELTA("x"))),
      intervalMs: 10,
      closeAtEnd: true,
    })
    const err = await streamAnthropic({ ...PARAMS, timeoutMs: 1000, wallMs: 80 }, () => {}).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AnthropicApiError)
    expect((err as AnthropicApiError).status).toBe(504)
  })
})

describe("streamAnthropicWithRetry 이중 과금 방어 (ASM-042 정책 고정)", () => {
  beforeEach(() => vi.stubEnv("ANTHROPIC_API_KEY", "test-key"))
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("첫 토큰 전 일시 오류(500)는 재시도 후 성공한다", async () => {
    const success = (_url: unknown, init?: RequestInit) => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(sseFrame(TEXT_DELTA("ok")))
          controller.close()
          init?.signal?.addEventListener("abort", () => {})
        },
      })
      return Promise.resolve(new Response(stream, { status: 200 }))
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("overloaded", { status: 500 }))
      .mockImplementation(success)
    vi.stubGlobal("fetch", fetchMock)

    const seen: string[] = []
    await streamAnthropicWithRetry({ ...PARAMS, timeoutMs: 500 }, (d) => seen.push(d), 1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(seen).toEqual(["ok"])
  })

  it("504(타임아웃)는 첫 토큰 전이어도 재시도하지 않는다 — 유료 이중 호출 차단", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("timeout", { status: 504 }))
    vi.stubGlobal("fetch", fetchMock)
    const err = await streamAnthropicWithRetry(PARAMS, () => {}, 2).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AnthropicApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("첫 토큰 이후 오류는 재시도하지 않는다 — 이중 방출 방지", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: unknown, init?: RequestInit) => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(sseFrame(TEXT_DELTA("절반")))
          controller.enqueue(sseFrame({ type: "error", error: { message: "server exploded" } }))
          controller.close()
          init?.signal?.addEventListener("abort", () => {})
        },
      })
      return Promise.resolve(new Response(stream, { status: 200 }))
    })
    vi.stubGlobal("fetch", fetchMock)
    const err = await streamAnthropicWithRetry({ ...PARAMS, timeoutMs: 500 }, () => {}, 2).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AnthropicApiError)
    expect((err as AnthropicApiError).status).toBe(500)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
