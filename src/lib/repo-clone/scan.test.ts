import { describe, it, expect, vi, beforeEach } from "vitest"
import { mkdir, writeFile, stat } from "node:fs/promises"
import { join } from "node:path"
import { scanGitRepo } from "./scan"
import { CloneError } from "./clone"

// ASM-061 — 조립 검증. 핵심은 "임시 디렉토리는 성공·실패 무관하게 무조건 정리"다.
// cloneRepo만 모킹(네트워크 금지) — 워커·추출은 실물 경로로 돈다.

const cloneRepo = vi.hoisted(() => vi.fn())
vi.mock("./clone", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./clone")>()),
  cloneRepo,
}))

let lastCloneDir: string | null = null

beforeEach(() => {
  vi.clearAllMocks()
  lastCloneDir = null
  // 기본 동작: 클론이 미니 레포를 "받아온" 것처럼 파일을 심는다.
  cloneRepo.mockImplementation(async (_url: string, dir: string) => {
    lastCloneDir = dir
    await mkdir(join(dir, "src/app/api/users"), { recursive: true })
    await writeFile(join(dir, "src/app/api/users/route.ts"), "export async function GET() {}")
    await writeFile(join(dir, ".env.local"), "FAKE_KEY=not-a-real-secret")
  })
})

async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  )
}

describe("scanGitRepo", () => {
  it("클론→후보 읽기→추출 결과를 돌려주고 임시 디렉토리를 정리한다", async () => {
    const result = await scanGitRepo("https://github.com/a/b")
    expect(cloneRepo).toHaveBeenCalledWith("https://github.com/a/b", expect.any(String))
    expect(result.report.scannedCount).toBe(1)
    expect(result.payload).toEqual({ apis: [], tables: [] })
    expect(lastCloneDir).toBeTruthy()
    expect(await exists(lastCloneDir as string)).toBe(false)
  })

  it("클론 실패 시에도 임시 디렉토리를 정리하고 CloneError를 그대로 올린다", async () => {
    cloneRepo.mockImplementation(async (_url: string, dir: string) => {
      lastCloneDir = dir
      throw new CloneError("exit 128")
    })
    await expect(scanGitRepo("https://github.com/a/b")).rejects.toBeInstanceOf(CloneError)
    expect(await exists(lastCloneDir as string)).toBe(false)
  })

  it("워커 캡 초과분(skippedPaths)을 리포트에 합쳐 정직 보고한다", async () => {
    cloneRepo.mockImplementation(async (_url: string, dir: string) => {
      lastCloneDir = dir
      await mkdir(join(dir, "a"), { recursive: true })
      await mkdir(join(dir, "b"), { recursive: true })
      await writeFile(join(dir, "a/route.ts"), "x".repeat(600 * 1024))
      await writeFile(join(dir, "b/route.ts"), "export const GET = 1")
    })
    const result = await scanGitRepo("https://github.com/a/b")
    expect(result.report.skippedPaths).toContain("a/route.ts")
    expect(result.report.scannedCount).toBe(1)
  })
})
