import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "./route"
import { CloneError } from "@/lib/repo-clone/clone"

// ASM-061 — 라우트 배선 검증: 세션·body·URL 화이트리스트·rate limit(sync 재사용)·
// clone_failed 502(원문 비노출)·성공 200 { result }. 클론·FS는 scanGitRepo 모킹으로 격리.

vi.mock("@/lib/supabase/assembler", () => ({
  createAssemblerClient: vi.fn(async () => ({}) as unknown),
}))

const checkRateLimit = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/rate-limit")>()),
  checkRateLimit,
}))

const scanGitRepo = vi.hoisted(() => vi.fn())
vi.mock("@/lib/repo-clone/scan", () => ({ scanGitRepo }))

const SESSION = "00000000-0000-4000-8000-000000000001"
const EMPTY_RESULT = {
  payload: { apis: [], tables: [] },
  report: { scannedCount: 0, blockedPaths: [], skippedPaths: [] },
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/repo-scan", {
    method: "POST",
    headers: { "x-session-id": SESSION, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  checkRateLimit.mockResolvedValue({ ok: true })
  scanGitRepo.mockResolvedValue(EMPTY_RESULT)
})

describe("POST /api/repo-scan", () => {
  it("정상 요청이면 추출 결과를 저장 없이 돌려준다", async () => {
    const res = await POST(post({ gitUrl: "https://github.com/vercel/next.js" }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ result: EMPTY_RESULT })
    expect(scanGitRepo).toHaveBeenCalledWith("https://github.com/vercel/next.js")
  })

  it("세션 헤더가 없으면 400 — 클론은 시작도 안 한다", async () => {
    const req = new Request("http://localhost/api/repo-scan", {
      method: "POST",
      body: JSON.stringify({ gitUrl: "https://github.com/a/b" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "missing_session" })
    expect(scanGitRepo).not.toHaveBeenCalled()
  })

  it("JSON이 아닌 body는 400 invalid_body", async () => {
    const req = new Request("http://localhost/api/repo-scan", {
      method: "POST",
      headers: { "x-session-id": SESSION },
      body: "not json",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "invalid_body" })
  })

  it.each([
    ["gitUrl 누락", {}],
    ["gitUrl 비문자열", { gitUrl: 42 }],
    ["화이트리스트 밖", { gitUrl: "https://evil.com/a/b" }],
    ["http 스킴", { gitUrl: "http://github.com/a/b" }],
    ["인자 위장", { gitUrl: "--upload-pack=/bin/sh" }],
  ])("잘못된 깃 주소(%s)는 400 invalid_repo_url — rate limit 카운트 없음", async (_label, body) => {
    const res = await POST(post(body))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "invalid_repo_url" })
    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(scanGitRepo).not.toHaveBeenCalled()
  })

  it("rate limit은 기존 sync scope를 재사용하고 초과 시 429 + Retry-After", async () => {
    checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 42 })
    const res = await POST(post({ gitUrl: "https://github.com/a/b" }))
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("42")
    expect(checkRateLimit.mock.calls[0][2]).toBe(SESSION)
    expect(checkRateLimit.mock.calls[0][3]).toBe("sync")
    expect(scanGitRepo).not.toHaveBeenCalled()
  })

  it("클론 실패는 502 clone_failed — 에러 원문을 응답에 싣지 않는다", async () => {
    scanGitRepo.mockRejectedValue(new CloneError("exit 128"))
    const res = await POST(post({ gitUrl: "https://github.com/a/b" }))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: "clone_failed" })
  })

  it("그 외 예외는 500 server_error", async () => {
    scanGitRepo.mockRejectedValue(new Error("disk full"))
    const res = await POST(post({ gitUrl: "https://github.com/a/b" }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "server_error" })
  })

  it("Content-Length 초과 body는 413 — 파싱 전에 컷", async () => {
    const res = await POST(post({ gitUrl: "https://github.com/a/b" }, { "content-length": "99999" }))
    expect(res.status).toBe(413)
    expect(checkRateLimit).not.toHaveBeenCalled()
  })
})
