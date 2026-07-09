import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET, POST } from "./route"

// ASM-068 — 정책 문서 컬렉션 라우트(GET 목록 / POST 생성). rate limit "sync" 재사용·제품 존재 가드·활동 로그 단언.

vi.mock("@/lib/supabase/assembler", () => ({ createAssemblerClient: vi.fn(async () => ({}) as unknown) }))

const repo = vi.hoisted(() => ({ getProduct: vi.fn() }))
vi.mock("@/lib/supabase/assembler-repo", () => repo)

const docRepo = vi.hoisted(() => ({ listPolicyDocs: vi.fn(), createPolicyDoc: vi.fn() }))
vi.mock("@/lib/supabase/policy-doc-repo", () => docRepo)

const safeLogActivity = vi.hoisted(() => vi.fn())
vi.mock("@/lib/supabase/activity-repo", () => ({ safeLogActivity }))

const checkRateLimit = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/rate-limit")>()),
  checkRateLimit,
}))

const SESSION = "00000000-0000-4000-8000-000000000001"
const ctx = { params: Promise.resolve({ id: "prod-1" }) }
const PATH = "http://localhost/api/products/prod-1/policy-docs"

const DOC = {
  id: "doc-1",
  productId: "prod-1",
  title: "요금 정책",
  body: "",
  apiIds: [],
  dbTableIds: [],
  createdAt: "2026-07-09T00:00:00Z",
  updatedAt: "2026-07-09T00:00:00Z",
}

function req(method: string, body?: unknown): Request {
  return new Request(PATH, {
    method,
    headers: { "x-session-id": SESSION, "content-type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  checkRateLimit.mockResolvedValue({ ok: true })
  repo.getProduct.mockResolvedValue({ id: "prod-1" })
  docRepo.listPolicyDocs.mockResolvedValue([DOC])
  docRepo.createPolicyDoc.mockResolvedValue(DOC)
})

describe("GET /api/products/[id]/policy-docs", () => {
  it("세션 없으면 400", async () => {
    expect((await GET(new Request(PATH), ctx)).status).toBe(400)
  })

  it("목록을 { docs } 로 돌려준다", async () => {
    const res = await GET(req("GET"), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ docs: [DOC] })
  })
})

describe("POST /api/products/[id]/policy-docs", () => {
  it("sync 스코프로 rate limit을 호출한다 — 신규 스코프 금지", async () => {
    const res = await POST(req("POST", { title: "요금 정책" }), ctx)
    expect(res.status).toBe(201)
    expect(checkRateLimit.mock.calls[0][3]).toBe("sync")
  })

  it("생성 성공 시 { doc } 201 + 활동 로그(policy_doc_created)", async () => {
    const res = await POST(req("POST", { title: "요금 정책" }), ctx)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ doc: DOC })
    expect(docRepo.createPolicyDoc).toHaveBeenCalledWith(expect.anything(), {
      productId: "prod-1",
      title: "요금 정책",
      body: "",
      apiIds: [],
      dbTableIds: [],
    })
    expect(safeLogActivity).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ productId: "prod-1", type: "policy_doc_created" }))
  })

  it("title 없으면 400 — rate limit·생성 없음", async () => {
    const res = await POST(req("POST", { body: "x" }), ctx)
    expect(res.status).toBe(400)
    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(docRepo.createPolicyDoc).not.toHaveBeenCalled()
  })

  it("rate limit 초과 시 429 — 생성 없음", async () => {
    checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 30 })
    const res = await POST(req("POST", { title: "t" }), ctx)
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("30")
    expect(docRepo.createPolicyDoc).not.toHaveBeenCalled()
  })

  it("제품이 없으면 404 — 생성·로그 없음", async () => {
    repo.getProduct.mockResolvedValue(null)
    const res = await POST(req("POST", { title: "t" }), ctx)
    expect(res.status).toBe(404)
    expect(docRepo.createPolicyDoc).not.toHaveBeenCalled()
    expect(safeLogActivity).not.toHaveBeenCalled()
  })

  it("세션 없으면 400 — rate limit 없음", async () => {
    const res = await POST(new Request(PATH, { method: "POST", body: JSON.stringify({ title: "t" }) }), ctx)
    expect(res.status).toBe(400)
    expect(checkRateLimit).not.toHaveBeenCalled()
  })
})
