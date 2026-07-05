import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { AnthropicApiError } from "./anthropic"
import { streamAnthropicWithRetry } from "./anthropic-retry"

// ASM-044: "wall 280s < maxDuration 300s" 보장은 단일 시도에만 성립했다 — 재시도마다 params 가
// 동일 재사용돼 시도별 독립 280s 를 쓸 수 있었음(늦은 retryable 실패 → 총 300s 초과 → 플랫폼 에러
// + input 과금 누적). wallMs 를 재시도 전체의 총 예산으로 재해석해 남은 예산을 시도마다 주입한다.
// streamAnthropic 을 모킹해 주입된 wallMs 를 직접 검증한다(fetch 모킹으론 관측 불가). AI 실호출 없음.

vi.mock("./anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./anthropic")>()
  return { ...actual, streamAnthropic: vi.fn() }
})
import { streamAnthropic } from "./anthropic"

const streamMock = vi.mocked(streamAnthropic)
const PARAMS = { system: "s", messages: [{ role: "user" as const, content: "hi" }] }

beforeEach(() => {
  streamMock.mockReset()
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

// 모킹 시도 하나 — 가짜 시계를 elapsedMs 만큼 흘리고 retryable 오류를 던진다.
function failAfter(elapsedMs: number, status = 500) {
  streamMock.mockImplementationOnce(async () => {
    vi.advanceTimersByTime(elapsedMs)
    throw new AnthropicApiError(status, "boom")
  })
}

describe("streamAnthropicWithRetry 총 데드라인 (ASM-044)", () => {
  it("wallMs 미지정이면 기존 동작 그대로 — 시도마다 같은 params(wallMs 없음)", async () => {
    failAfter(1000)
    streamMock.mockResolvedValueOnce({ input_tokens: 1, output_tokens: 1 })

    const promise = streamAnthropicWithRetry(PARAMS, () => {}, 2)
    await vi.advanceTimersByTimeAsync(600) // 백오프 500ms 소화
    await promise

    expect(streamMock).toHaveBeenCalledTimes(2)
    expect(streamMock.mock.calls[0][0].wallMs).toBeUndefined()
    expect(streamMock.mock.calls[1][0].wallMs).toBeUndefined()
  })

  it("wallMs 는 총 예산 — 재시도는 경과·백오프를 차감한 남은 예산으로 wallMs 를 갱신 주입한다", async () => {
    failAfter(3000) // 첫 시도가 3s 쓰고 500 실패
    streamMock.mockResolvedValueOnce({ input_tokens: 1, output_tokens: 1 })

    const promise = streamAnthropicWithRetry({ ...PARAMS, wallMs: 10000 }, () => {}, 2)
    await vi.advanceTimersByTimeAsync(600) // 백오프 500ms 소화
    await promise

    expect(streamMock).toHaveBeenCalledTimes(2)
    // 첫 시도 = 전체 예산(기존과 동일 — 단일 시도 동작 불변).
    expect(streamMock.mock.calls[0][0].wallMs).toBe(10000)
    // 재시도 = 10000 - 3000(경과) - 500(백오프) = 6500.
    expect(streamMock.mock.calls[1][0].wallMs).toBe(6500)
  })

  it("예산 소진이면 재시도 대신 즉시 504 — 플랫폼이 함수를 죽이기 전에 ai_timeout 계약 유지", async () => {
    failAfter(350) // 예산 400 중 350 소모 후 retryable 실패
    const promise = streamAnthropicWithRetry({ ...PARAMS, wallMs: 400 }, () => {}, 2).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(600)
    const err = await promise

    expect(err).toBeInstanceOf(AnthropicApiError)
    expect((err as AnthropicApiError).status).toBe(504)
    // 두 번째 fetch(유료 시도)는 일어나지 않는다.
    expect(streamMock).toHaveBeenCalledTimes(1)
  })

  it("백오프 대기도 예산을 넘겨 자지 않는다 — 남은 예산까지만 대기 후 504", async () => {
    failAfter(100) // 예산 300 중 100 소모 — 남은 200 < 백오프 500
    const promise = streamAnthropicWithRetry({ ...PARAMS, wallMs: 300 }, () => {}, 2).catch((e: unknown) => e)
    // 백오프가 500ms 를 다 잤다면 250ms 시점엔 아직 pending — 남은 예산(200ms)만 자고 즉시 504 여야 한다.
    await vi.advanceTimersByTimeAsync(250)
    const err = await promise

    expect(err).toBeInstanceOf(AnthropicApiError)
    expect((err as AnthropicApiError).status).toBe(504)
    expect(streamMock).toHaveBeenCalledTimes(1)
  })
})
