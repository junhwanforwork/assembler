import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "./route"

// ASM-028 — 싱크-인 POST rate limit 배선 검증.
// files 라우트와 동일 패턴: 검증 통과한 요청만 카운트, 초과 시 429 + Retry-After, DB 쓰기 없음.

vi.mock("@/lib/supabase/assembler", () => ({
  createAssemblerClient: vi.fn(async () => ({}) as unknown),
}))

const repo = vi.hoisted(() => ({
  getProduct: vi.fn(),
  listApis: vi.fn(),
  syncApis: vi.fn(),
}))
vi.mock("@/lib/supabase/assembler-repo", () => repo)

const safeLogActivity = vi.hoisted(() => vi.fn())
vi.mock("@/lib/supabase/activity-repo", () => ({ safeLogActivity }))

const checkRateLimit = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/rate-limit")>()),
  checkRateLimit,
}))

const SESSION = "00000000-0000-4000-8000-000000000001"
const ctx = { params: Promise.resolve({ id: "prod-1" }) }

function post(body: unknown): Request {
  return new Request("http://localhost/api/products/prod-1/apis", {
    method: "POST",
    headers: { "x-session-id": SESSION, "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = { apis: [{ method: "GET", endpoint: "/health", source: "code" }] }

beforeEach(() => {
  vi.clearAllMocks()
  checkRateLimit.mockResolvedValue({ ok: true })
  repo.getProduct.mockResolvedValue({ id: "prod-1" })
  repo.syncApis.mockResolvedValue([])
})

describe("POST /api/products/[id]/apis rate limit", () => {
  it("sync 라우트로 checkRateLimit를 호출한다", async () => {
    const res = await POST(post(VALID_BODY), ctx)
    expect(res.status).toBe(200)
    expect(checkRateLimit).toHaveBeenCalledTimes(1)
    expect(checkRateLimit.mock.calls[0][2]).toBe(SESSION)
    expect(checkRateLimit.mock.calls[0][3]).toBe("sync")
  })

  it("초과 시 429 + Retry-After, DB 쓰기·activity 기록 없음", async () => {
    checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 42 })
    const res = await POST(post(VALID_BODY), ctx)
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("42")
    expect(await res.json()).toEqual({ error: "rate_limited" })
    expect(repo.syncApis).not.toHaveBeenCalled()
    expect(safeLogActivity).not.toHaveBeenCalled()
  })

  it("검증 실패 요청은 카운트하지 않는다 — invalid body는 checkRateLimit 이전에 400", async () => {
    const res = await POST(post({ apis: "nope" }), ctx)
    expect(res.status).toBe(400)
    expect(checkRateLimit).not.toHaveBeenCalled()
  })

  it("세션 없는 요청도 카운트하지 않는다", async () => {
    const req = new Request("http://localhost/api/products/prod-1/apis", {
      method: "POST",
      body: JSON.stringify(VALID_BODY),
    })
    const res = await POST(req, ctx)
    expect(res.status).toBe(400)
    expect(checkRateLimit).not.toHaveBeenCalled()
  })

  it("Content-Length 초과(413)도 카운트하지 않는다", async () => {
    const req = new Request("http://localhost/api/products/prod-1/apis", {
      method: "POST",
      headers: { "x-session-id": SESSION, "content-length": "9999999" },
      body: JSON.stringify(VALID_BODY),
    })
    const res = await POST(req, ctx)
    expect(res.status).toBe(413)
    expect(checkRateLimit).not.toHaveBeenCalled()
  })
})
