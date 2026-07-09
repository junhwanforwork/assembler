import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET, PATCH, POST } from "./route"

// ASM-064 — API 노트 라우트 계약(db 노트 라우트 1:1 미러) 검증.
// rate limit은 기존 "note" 스코프 재사용(신규 스코프 금지 — RPC 인자 가드 fail-open 함정 회피).
// 유료 호출(runApiLearning)은 POST 성공 경로에서만 발사돼야 한다(자동 발사 경로 0).

vi.mock("@/lib/supabase/assembler", () => ({
  createAssemblerClient: vi.fn(async () => ({}) as unknown),
}))

const repo = vi.hoisted(() => ({
  getWorkspaceContext: vi.fn(),
  listApis: vi.fn(),
  listDbTables: vi.fn(),
}))
vi.mock("@/lib/supabase/assembler-repo", () => repo)

const noteRepo = vi.hoisted(() => ({
  getApiNote: vi.fn(),
  upsertApiNote: vi.fn(),
  setUserEditedApiNote: vi.fn(),
  isApiInWorkspace: vi.fn(),
}))
vi.mock("@/lib/supabase/api-note-repo", () => noteRepo)

const runApiLearning = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api-learning/run", () => ({ runApiLearning }))

const checkRateLimit = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/rate-limit")>()),
  checkRateLimit,
}))

const SESSION = "00000000-0000-4000-8000-000000000001"
const ctx = { params: Promise.resolve({ id: "ws-1", apiId: "api-1" }) }
const PATH = "http://localhost/api/workspaces/ws-1/apis/api-1/note"

const API = { id: "api-1", productId: "prod-1", method: "POST", endpoint: "/signup", summary: "", status: "active", source: "code" }
const NOTE = {
  id: "note-1",
  apiId: "api-1",
  productId: "prod-1",
  explanation: "회원가입에서 계정을 만들어요.",
  grounded: true,
  isUserEdited: false,
  generatedAt: "2026-07-09T00:00:00Z",
}
const DESIGN = { requirements: [], features: [], pages: [], flows: [], wireframes: [], elements: [] }

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
  repo.getWorkspaceContext.mockResolvedValue({ productId: "prod-1", name: "Main", design: DESIGN, codeTruth: { apiIds: new Set(), dbTableIds: new Set() }, updatedAt: "t" })
  repo.listApis.mockResolvedValue([API])
  repo.listDbTables.mockResolvedValue([])
  noteRepo.getApiNote.mockResolvedValue(null)
  noteRepo.isApiInWorkspace.mockResolvedValue(true)
  noteRepo.upsertApiNote.mockResolvedValue(NOTE)
  noteRepo.setUserEditedApiNote.mockResolvedValue({ ...NOTE, isUserEdited: true })
  runApiLearning.mockResolvedValue({ ok: true, note: { explanation: "회원가입에서 계정을 만들어요.", grounded: true } })
})

describe("GET /api/workspaces/[id]/apis/[apiId]/note", () => {
  it("세션 없으면 400", async () => {
    const res = await GET(new Request(PATH), ctx)
    expect(res.status).toBe(400)
  })

  it("workspace↔api 정합이 깨지면 404", async () => {
    noteRepo.isApiInWorkspace.mockResolvedValue(false)
    const res = await GET(req("GET"), ctx)
    expect(res.status).toBe(404)
  })

  it("저장된 노트를 돌려준다(없으면 null)", async () => {
    noteRepo.getApiNote.mockResolvedValue(NOTE)
    const res = await GET(req("GET"), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ note: NOTE })
  })
})

describe("POST /api/workspaces/[id]/apis/[apiId]/note", () => {
  it("note 스코프로 checkRateLimit를 호출한다 — 신규 스코프 금지", async () => {
    const res = await POST(req("POST"), ctx)
    expect(res.status).toBe(200)
    expect(checkRateLimit).toHaveBeenCalledTimes(1)
    expect(checkRateLimit.mock.calls[0][2]).toBe(SESSION)
    expect(checkRateLimit.mock.calls[0][3]).toBe("note")
  })

  it("초과 시 429 + Retry-After, 유료 호출·저장 없음", async () => {
    checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 42 })
    const res = await POST(req("POST"), ctx)
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("42")
    expect(runApiLearning).not.toHaveBeenCalled()
    expect(noteRepo.upsertApiNote).not.toHaveBeenCalled()
  })

  it("세션 없으면 400 — rate limit 카운트 없음", async () => {
    const res = await POST(new Request(PATH, { method: "POST" }), ctx)
    expect(res.status).toBe(400)
    expect(checkRateLimit).not.toHaveBeenCalled()
  })

  it("워크스페이스가 없으면 404", async () => {
    repo.getWorkspaceContext.mockResolvedValue(null)
    const res = await POST(req("POST"), ctx)
    expect(res.status).toBe(404)
    expect(runApiLearning).not.toHaveBeenCalled()
  })

  it("타 소유/미존재 API면 404", async () => {
    repo.listApis.mockResolvedValue([])
    const res = await POST(req("POST"), ctx)
    expect(res.status).toBe(404)
    expect(runApiLearning).not.toHaveBeenCalled()
  })

  it("사용자 편집본이 있으면 유료 호출 없이 그대로 돌려준다", async () => {
    noteRepo.getApiNote.mockResolvedValue({ ...NOTE, isUserEdited: true })
    const res = await POST(req("POST"), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ note: { ...NOTE, isUserEdited: true } })
    expect(runApiLearning).not.toHaveBeenCalled()
    expect(noteRepo.upsertApiNote).not.toHaveBeenCalled()
  })

  it("성공 시 생성 결과를 저장하고 note를 돌려준다", async () => {
    const res = await POST(req("POST"), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ note: NOTE })
    expect(noteRepo.upsertApiNote).toHaveBeenCalledWith(expect.anything(), {
      apiId: "api-1",
      productId: "prod-1",
      explanation: "회원가입에서 계정을 만들어요.",
      grounded: true,
      pros: undefined,
      cons: undefined,
    })
  })

  it("run 실패는 상태코드 그대로 surface한다", async () => {
    runApiLearning.mockResolvedValue({ ok: false, error: "ai_unavailable", status: 503 })
    const res = await POST(req("POST"), ctx)
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: "ai_unavailable" })
    expect(noteRepo.upsertApiNote).not.toHaveBeenCalled()
  })
})

describe("PATCH /api/workspaces/[id]/apis/[apiId]/note", () => {
  it("빈 설명·2000자 초과는 400", async () => {
    expect((await PATCH(req("PATCH", { explanation: "  " }), ctx)).status).toBe(400)
    expect((await PATCH(req("PATCH", { explanation: "a".repeat(2001) }), ctx)).status).toBe(400)
  })

  it("정합이 깨지면 404", async () => {
    noteRepo.isApiInWorkspace.mockResolvedValue(false)
    const res = await PATCH(req("PATCH", { explanation: "직접 고친 설명" }), ctx)
    expect(res.status).toBe(404)
  })

  it("편집을 저장하고 잠긴 노트를 돌려준다", async () => {
    const res = await PATCH(req("PATCH", { explanation: "직접 고친 설명" }), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ note: { ...NOTE, isUserEdited: true } })
    expect(noteRepo.setUserEditedApiNote).toHaveBeenCalledWith(expect.anything(), "api-1", "직접 고친 설명")
  })

  it("노트가 없으면 404", async () => {
    noteRepo.setUserEditedApiNote.mockResolvedValue(null)
    const res = await PATCH(req("PATCH", { explanation: "직접 고친 설명" }), ctx)
    expect(res.status).toBe(404)
  })
})
