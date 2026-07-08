import { describe, it, expect, vi, beforeEach } from "vitest"
import { cloneRepo, CloneError, CLONE_TIMEOUT_MS } from "./clone"

// ASM-061 — 클론 실행기. 실 네트워크 금지 — execFile을 모킹해 인자 배열·환경·타임아웃
// "배선"을 검증한다(셸 미경유·인증 프롬프트 차단이 보안 요구). 실 클론은 통합 스모크 몫.

const execFile = vi.hoisted(() =>
  vi.fn((_cmd: string, _args: string[], _opts: unknown, cb: (err: Error | null) => void) => cb(null)),
)
vi.mock("node:child_process", () => ({ execFile }))

beforeEach(() => {
  vi.clearAllMocks()
  execFile.mockImplementation((_cmd, _args, _opts, cb) => cb(null))
})

describe("cloneRepo", () => {
  it("git을 셸 미경유 인자 배열로 실행한다 (--depth 1 --single-branch + blob 1MB 캡)", async () => {
    await cloneRepo("https://github.com/a/b", "/tmp/x")
    expect(execFile).toHaveBeenCalledTimes(1)
    const [cmd, args] = execFile.mock.calls[0]
    expect(cmd).toBe("git")
    expect(args).toEqual([
      "clone",
      "--depth",
      "1",
      "--single-branch",
      "--filter=blob:limit=1m",
      "https://github.com/a/b",
      "/tmp/x",
    ])
  })

  it("인증 프롬프트를 차단하고(GIT_TERMINAL_PROMPT=0) 60초 타임아웃을 건다", async () => {
    await cloneRepo("https://github.com/a/b", "/tmp/x")
    const opts = execFile.mock.calls[0][2] as { timeout: number; env: Record<string, string> }
    expect(opts.timeout).toBe(CLONE_TIMEOUT_MS)
    expect(CLONE_TIMEOUT_MS).toBe(60_000)
    expect(opts.env.GIT_TERMINAL_PROMPT).toBe("0")
  })

  it("자식 프로세스 env는 최소 권한 — PATH·HOME·GIT_TERMINAL_PROMPT만 전달한다", async () => {
    await cloneRepo("https://github.com/a/b", "/tmp/x")
    const opts = execFile.mock.calls[0][2] as { env: Record<string, string | undefined> }
    expect(Object.keys(opts.env).sort()).toEqual(["GIT_TERMINAL_PROMPT", "HOME", "PATH"])
    expect(opts.env.PATH).toBe(process.env.PATH)
  })

  it("실패 시 CloneError를 던지고 메시지에 stderr 원문을 싣지 않는다", async () => {
    const raw = Object.assign(new Error("fatal: repository not found\nremote: secret hint"), {
      code: 128,
      stderr: "fatal: repository not found\nremote: secret hint",
    })
    execFile.mockImplementation((_cmd, _args, _opts, cb) => cb(raw))

    const err = await cloneRepo("https://github.com/a/b", "/tmp/x").catch((e: unknown) => e)
    expect(err).toBeInstanceOf(CloneError)
    expect((err as CloneError).message).not.toContain("secret hint")
  })

  it("타임아웃 종료(killed)도 CloneError로 감싼다", async () => {
    const raw = Object.assign(new Error("timeout"), { killed: true, signal: "SIGTERM" })
    execFile.mockImplementation((_cmd, _args, _opts, cb) => cb(raw))
    await expect(cloneRepo("https://github.com/a/b", "/tmp/x")).rejects.toBeInstanceOf(CloneError)
  })
})
