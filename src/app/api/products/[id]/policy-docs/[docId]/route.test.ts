import { describe, it, expect, vi, beforeEach } from "vitest"
import { DELETE, GET, PATCH } from "./route"

// ASM-068 — 정책 문서 단건 라우트(GET/PATCH/DELETE). 404 가드·입력 검증·삭제 전 메타 확보·활동 로그 단언.

vi.mock("@/lib/supabase/assembler", () => ({ createAssemblerClient: vi.fn(async () => ({}) as unknown) }))

const docRepo = vi.hoisted(() => ({ getPolicyDoc: vi.fn(), updatePolicyDoc: vi.fn(), deletePolicyDoc: vi.fn() }))
vi.mock("@/lib/supabase/policy-doc-repo", () => docRepo)

const safeLogActivity = vi.hoisted(() => vi.fn())
vi.mock("@/lib/supabase/activity-repo", () => ({ safeLogActivity }))

const SESSION = "00000000-0000-4000-8000-000000000001"
const ctx = { params: Promise.resolve({ id: "prod-1", docId: "doc-1" }) }
const PATH = "http://localhost/api/products/prod-1/policy-docs/doc-1"

const DOC = {
  id: "doc-1",
  productId: "prod-1",
  title: "요금 정책",
  body: "본문",
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
  docRepo.getPolicyDoc.mockResolvedValue(DOC)
  docRepo.updatePolicyDoc.mockResolvedValue({ ...DOC, title: "새 제목" })
  docRepo.deletePolicyDoc.mockResolvedValue(true)
})

describe("GET /api/products/[id]/policy-docs/[docId]", () => {
  it("있으면 { doc }", async () => {
    const res = await GET(req("GET"), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ doc: DOC })
  })

  it("없으면 404", async () => {
    docRepo.getPolicyDoc.mockResolvedValue(null)
    expect((await GET(req("GET"), ctx)).status).toBe(404)
  })

  it("세션 없으면 400", async () => {
    expect((await GET(new Request(PATH), ctx)).status).toBe(400)
  })
})

describe("PATCH /api/products/[id]/policy-docs/[docId]", () => {
  it("검증 통과 시 갱신 + { doc } + 활동 로그(policy_doc_updated)", async () => {
    const res = await PATCH(req("PATCH", { title: "새 제목" }), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ doc: { ...DOC, title: "새 제목" } })
    expect(docRepo.updatePolicyDoc).toHaveBeenCalledWith(expect.anything(), "doc-1", { title: "새 제목" })
    expect(safeLogActivity).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: "policy_doc_updated" }))
  })

  it("빈 patch는 400 — 갱신 없음", async () => {
    const res = await PATCH(req("PATCH", {}), ctx)
    expect(res.status).toBe(400)
    expect(docRepo.updatePolicyDoc).not.toHaveBeenCalled()
  })

  it("title 200자 초과는 400", async () => {
    expect((await PATCH(req("PATCH", { title: "가".repeat(201) }), ctx)).status).toBe(400)
  })

  it("대상이 없으면 404", async () => {
    docRepo.updatePolicyDoc.mockResolvedValue(null)
    expect((await PATCH(req("PATCH", { title: "새 제목" }), ctx)).status).toBe(404)
  })
})

describe("DELETE /api/products/[id]/policy-docs/[docId]", () => {
  it("삭제 전 메타를 확보하고 { ok: true } + 활동 로그(policy_doc_deleted)", async () => {
    const res = await DELETE(req("DELETE"), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(docRepo.getPolicyDoc).toHaveBeenCalled()
    expect(docRepo.deletePolicyDoc).toHaveBeenCalledWith(expect.anything(), "doc-1")
    expect(safeLogActivity).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: "policy_doc_deleted", productId: "prod-1" }))
  })

  it("없으면 404 — 삭제·로그 없음", async () => {
    docRepo.getPolicyDoc.mockResolvedValue(null)
    const res = await DELETE(req("DELETE"), ctx)
    expect(res.status).toBe(404)
    expect(docRepo.deletePolicyDoc).not.toHaveBeenCalled()
    expect(safeLogActivity).not.toHaveBeenCalled()
  })

  it("세션 없으면 400", async () => {
    expect((await DELETE(new Request(PATH, { method: "DELETE" }), ctx)).status).toBe(400)
  })
})
