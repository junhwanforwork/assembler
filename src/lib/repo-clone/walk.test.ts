import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { collectRepoFiles, isExtractCandidate } from "./walk"

// ASM-061 — 디스크 워커. 클론된 레포에서 "추출 대상 후보만" 읽고,
// 차단 경로·심볼릭 링크·캡 초과를 정직하게 보고해야 한다.
// 실 FS(임시 디렉토리)를 쓴다 — 네트워크는 없다.

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "walk-test-"))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function put(relPath: string, text: string) {
  const abs = join(root, relPath)
  await mkdir(join(abs, ".."), { recursive: true })
  await writeFile(abs, text)
}

// 테스트용 차단 규칙 — 실물은 레인 1 isBlockedPath. 워커는 주입받은 판정만 신뢰한다.
const isBlocked = (path: string) =>
  path.split("/").some((seg) => seg === "node_modules" || seg === ".git") ||
  /\.env|secret/i.test(path)

describe("isExtractCandidate", () => {
  it("route.ts·route.js·database.types.ts·migrations/*.sql만 후보다", () => {
    expect(isExtractCandidate("src/app/api/x/route.ts")).toBe(true)
    expect(isExtractCandidate("app/route.js")).toBe(true)
    expect(isExtractCandidate("route.ts")).toBe(true)
    expect(isExtractCandidate("src/lib/database.types.ts")).toBe(true)
    expect(isExtractCandidate("supabase/migrations/001_init.sql")).toBe(true)
    expect(isExtractCandidate("src/lib/utils.ts")).toBe(false)
    expect(isExtractCandidate("README.md")).toBe(false)
    expect(isExtractCandidate("schema.sql")).toBe(false)
    expect(isExtractCandidate("src/app/page.tsx")).toBe(false)
    expect(isExtractCandidate("myroute.ts")).toBe(false)
  })
})

describe("collectRepoFiles", () => {
  it("후보 파일만 읽어 상대경로(/)와 내용을 돌려준다", async () => {
    await put("src/app/api/users/route.ts", "export async function GET() {}")
    await put("supabase/migrations/001.sql", "CREATE TABLE a (id uuid);")
    await put("src/lib/utils.ts", "export const x = 1")
    await put("README.md", "# hi")

    const result = await collectRepoFiles(root, isBlocked)
    const paths = result.files.map((f) => f.path).sort()
    expect(paths).toEqual(["src/app/api/users/route.ts", "supabase/migrations/001.sql"])
    expect(result.files.find((f) => f.path.endsWith("route.ts"))?.text).toContain("GET")
    expect(result.skippedPaths).toEqual([])
  })

  it("경로가 차단 패턴에 걸리는 후보는 읽지 않고 blockedPaths로 보고한다", async () => {
    await put("supabase/migrations/001_secret_tokens.sql", "CREATE TABLE t (id uuid);")
    await put("src/app/api/ok/route.ts", "export const GET = 1")

    const result = await collectRepoFiles(root, isBlocked)
    expect(result.files.map((f) => f.path)).toEqual(["src/app/api/ok/route.ts"])
    expect(result.blockedPaths).toEqual(["supabase/migrations/001_secret_tokens.sql"])
  })

  it("차단 디렉토리(.git·node_modules)는 통째로 프루닝 — 내부 후보가 files에 없다", async () => {
    await put(".git/objects/route.ts", "not code")
    await put("node_modules/pkg/route.ts", "export const GET = 1")
    const result = await collectRepoFiles(root, isBlocked)
    expect(result.files).toEqual([])
  })

  it("심볼릭 링크는 따라가지 않는다 (경로 탈출 방지)", async () => {
    await put("outside-secret.txt", "TOP SECRET")
    await mkdir(join(root, "repo"))
    await put("repo/src/app/api/a/route.ts", "export const GET = 1")
    await symlink(join(root, "outside-secret.txt"), join(root, "repo", "route.ts"))
    await symlink(join(root, "repo", "src"), join(root, "repo", "loop-dir"))

    const result = await collectRepoFiles(join(root, "repo"), isBlocked)
    expect(result.files.map((f) => f.path)).toEqual(["src/app/api/a/route.ts"])
    expect(result.files.some((f) => f.text.includes("TOP SECRET"))).toBe(false)
  })

  it("파일당 바이트 캡 초과 후보는 읽지 않고 skippedPaths로 보고한다", async () => {
    await put("big/route.ts", "x".repeat(200))
    await put("small/route.ts", "ok")

    const result = await collectRepoFiles(root, isBlocked, { maxFileBytes: 100 })
    expect(result.files.map((f) => f.path)).toEqual(["small/route.ts"])
    expect(result.skippedPaths).toEqual(["big/route.ts"])
  })

  it("총 읽기 바이트 캡을 넘기면 남은 후보를 skippedPaths로 보고한다", async () => {
    await put("a/route.ts", "x".repeat(60))
    await put("b/route.ts", "y".repeat(60))
    await put("c/route.ts", "z".repeat(60))

    const result = await collectRepoFiles(root, isBlocked, { maxTotalBytes: 130 })
    expect(result.files.length).toBe(2)
    expect(result.skippedPaths.length).toBe(1)
    expect(result.files.length + result.skippedPaths.length).toBe(3)
  })

  it("파일 수 캡에 도달하면 순회를 멈추고 중단 사실을 skippedPaths에 남긴다", async () => {
    for (let i = 0; i < 6; i++) await put(`f${i}/route.ts`, "export const GET = 1")

    const result = await collectRepoFiles(root, isBlocked, { maxFileCount: 3 })
    expect(result.files.length).toBeLessThanOrEqual(3)
    expect(result.skippedPaths.length).toBeGreaterThanOrEqual(1)
  })

  it("빈 디렉토리는 빈 결과를 돌려준다", async () => {
    const result = await collectRepoFiles(root, isBlocked)
    expect(result).toEqual({ files: [], skippedPaths: [], blockedPaths: [] })
  })
})
