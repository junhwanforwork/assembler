import { describe, it, expect, vi, afterEach } from "vitest"
import { checkRateLimit, rateLimitedResponse, RATE_LIMITS } from "./rate-limit"
import type { AssemblerClient } from "@/lib/supabase/assembler"

// Supabase 카운터 RPC 기반 rate limit — 세션 2윈도(m/h) + IP 백스톱 2윈도, RPC 오류는 fail-open.

type RpcResult = { data: number | null; error: { message: string } | null }

function makeClient(results: RpcResult[]): { c: AssemblerClient; rpc: ReturnType<typeof vi.fn> } {
  const rpc = vi.fn()
  for (const r of results) rpc.mockResolvedValueOnce(r)
  return { c: { rpc } as unknown as AssemblerClient, rpc }
}

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/test", { headers })
}

const ALLOW: RpcResult = { data: 0, error: null }

afterEach(() => vi.restoreAllMocks())

describe("checkRateLimit", () => {
  it("IP 헤더 있으면 세션 m/h + IP m/h 총 4윈도 검사", async () => {
    const { c, rpc } = makeClient([ALLOW, ALLOW, ALLOW, ALLOW])
    const result = await checkRateLimit(c, req({ "x-forwarded-for": "1.2.3.4" }), "sess-1", "generate")
    expect(result).toEqual({ ok: true })
    expect(rpc).toHaveBeenCalledTimes(4)
    expect(rpc).toHaveBeenNthCalledWith(1, "check_rate_limit", {
      p_key: "sess-1:generate:m",
      p_limit: RATE_LIMITS.generate.perMinute,
      p_window_seconds: 60,
    })
    expect(rpc).toHaveBeenNthCalledWith(2, "check_rate_limit", {
      p_key: "sess-1:generate:h",
      p_limit: RATE_LIMITS.generate.perHour,
      p_window_seconds: 3600,
    })
    // IP 키는 RPC 인자 가드 규칙(:route:m|h 로 끝)을 그대로 만족한다.
    expect(rpc).toHaveBeenNthCalledWith(3, "check_rate_limit", expect.objectContaining({ p_key: "ip:1.2.3.4:generate:m", p_window_seconds: 60 }))
    expect(rpc).toHaveBeenNthCalledWith(4, "check_rate_limit", expect.objectContaining({ p_key: "ip:1.2.3.4:generate:h", p_window_seconds: 3600 }))
  })

  it("IP 헤더 없으면(로컬/직접 접속) 세션 2윈도만", async () => {
    const { c, rpc } = makeClient([ALLOW, ALLOW])
    const result = await checkRateLimit(c, req(), "sess-1", "generate")
    expect(result).toEqual({ ok: true })
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it("분당 윈도 초과면 즉시 차단 — 나머지 윈도는 호출하지 않음", async () => {
    const { c, rpc } = makeClient([{ data: 42, error: null }])
    const result = await checkRateLimit(c, req({ "x-forwarded-for": "1.2.3.4" }), "sess-1", "files")
    expect(result).toEqual({ ok: false, retryAfterSeconds: 42 })
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it("시간당 윈도 초과면 그 대기시간으로 차단", async () => {
    const { c } = makeClient([ALLOW, { data: 1800, error: null }])
    const result = await checkRateLimit(c, req(), "sess-1", "suggestions")
    expect(result).toEqual({ ok: false, retryAfterSeconds: 1800 })
  })

  it("세션 로테이션 우회 차단 — 세션 윈도 통과해도 IP 윈도가 막는다", async () => {
    const { c } = makeClient([ALLOW, ALLOW, { data: 30, error: null }])
    const result = await checkRateLimit(c, req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }), "fresh-uuid", "generate")
    expect(result).toEqual({ ok: false, retryAfterSeconds: 30 })
  })

  it("RPC 에러는 fail-open — 인프라 장애가 기능을 막지 않는다", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const { c } = makeClient([{ data: null, error: { message: "function does not exist" } }])
    const result = await checkRateLimit(c, req(), "sess-1", "note")
    expect(result).toEqual({ ok: true })
    expect(consoleError).toHaveBeenCalled()
  })

  // ASM-028 — 싱크-인(apis·db-tables POST) 라우트. AI 비용은 없지만 호출당 최대 300행 DB 쓰기.
  it("sync 라우트 — 분당 20/시간 120, 키는 :sync:m|h 로 RPC 가드 규칙을 만족", async () => {
    expect(RATE_LIMITS.sync).toEqual({ perMinute: 20, perHour: 120 })
    const { c, rpc } = makeClient([ALLOW, ALLOW, ALLOW, ALLOW])
    const result = await checkRateLimit(c, req({ "x-forwarded-for": "1.2.3.4" }), "sess-1", "sync")
    expect(result).toEqual({ ok: true })
    expect(rpc).toHaveBeenNthCalledWith(1, "check_rate_limit", { p_key: "sess-1:sync:m", p_limit: 20, p_window_seconds: 60 })
    expect(rpc).toHaveBeenNthCalledWith(2, "check_rate_limit", { p_key: "sess-1:sync:h", p_limit: 120, p_window_seconds: 3600 })
    // IP 백스톱은 세션 한도의 3배 규칙 유지.
    expect(rpc).toHaveBeenNthCalledWith(3, "check_rate_limit", { p_key: "ip:1.2.3.4:sync:m", p_limit: 60, p_window_seconds: 60 })
    expect(rpc).toHaveBeenNthCalledWith(4, "check_rate_limit", { p_key: "ip:1.2.3.4:sync:h", p_limit: 360, p_window_seconds: 3600 })
  })
})

describe("rateLimitedResponse", () => {
  it("429 + Retry-After 헤더 + { error: 'rate_limited' } body", async () => {
    const res = rateLimitedResponse(42)
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("42")
    expect(await res.json()).toEqual({ error: "rate_limited" })
  })
})
