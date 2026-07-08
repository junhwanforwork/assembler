import { lstat, readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import type { RepoFileInput } from "@/lib/repo-extract/types"

// ASM-061 — 디스크 워커. 클론 디렉토리에서 추출 대상 후보만 골라 읽는다.
// 전체 텍스트를 다 읽지 않는 게 캡(파일 수·바이트)과 함께 어뷰즈 방어의 핵심.
// 심볼릭 링크는 lstat 판정으로 절대 따라가지 않는다(클론 루트 밖 경로 탈출 방지).

export const MAX_FILE_COUNT = 5_000
export const MAX_FILE_BYTES = 512 * 1024
export const MAX_TOTAL_BYTES = 8 * 1024 * 1024

export type WalkCaps = { maxFileCount?: number; maxFileBytes?: number; maxTotalBytes?: number }
export type WalkResult = { files: RepoFileInput[]; skippedPaths: string[]; blockedPaths: string[] }

// 추출 대상 후보 = 레인 1 추출기의 입력 파일 종류(라우트·Supabase 타입·마이그레이션 SQL)만.
export function isExtractCandidate(path: string): boolean {
  const base = path.split("/").at(-1) ?? ""
  if (base === "route.ts" || base === "route.js" || base === "database.types.ts") return true
  return /(^|\/)migrations\/[^/]+\.sql$/.test(path)
}

export async function collectRepoFiles(
  rootDir: string,
  isBlocked: (path: string) => boolean,
  caps: WalkCaps = {},
): Promise<WalkResult> {
  const maxFileCount = caps.maxFileCount ?? MAX_FILE_COUNT
  const maxFileBytes = caps.maxFileBytes ?? MAX_FILE_BYTES
  const maxTotalBytes = caps.maxTotalBytes ?? MAX_TOTAL_BYTES

  const files: RepoFileInput[] = []
  const skippedPaths: string[] = []
  const blockedPaths: string[] = []
  let visitedCount = 0
  let totalBytes = 0

  // 정렬 순회 — 캡 컷이 어느 파일에 떨어지는지 결정적이어야 테스트·보고가 안정된다.
  const dirQueue: string[] = [""]
  while (dirQueue.length > 0) {
    const relDir = dirQueue.shift() as string
    // 차단 디렉토리(.git·node_modules 등)는 통째로 프루닝 — 내부는 읽지도 세지도 않는다.
    if (relDir !== "" && isBlocked(`${relDir}/`)) continue

    const entries = (await readdir(join(rootDir, relDir), { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
    for (const entry of entries) {
      const relPath = relDir === "" ? entry.name : `${relDir}/${entry.name}`
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        dirQueue.push(relPath)
        continue
      }
      if (!entry.isFile()) continue

      visitedCount += 1
      if (visitedCount > maxFileCount) {
        // 순회 중단 — 어디서 끊었는지 남겨 조용한 누락을 막는다.
        skippedPaths.push(relPath)
        return { files, skippedPaths, blockedPaths }
      }
      if (!isExtractCandidate(relPath)) continue
      if (isBlocked(relPath)) {
        blockedPaths.push(relPath)
        continue
      }

      const stat = await lstat(join(rootDir, relPath))
      if (!stat.isFile()) continue
      if (stat.size > maxFileBytes || totalBytes + stat.size > maxTotalBytes) {
        skippedPaths.push(relPath)
        continue
      }
      totalBytes += stat.size
      files.push({ path: relPath, text: await readFile(join(rootDir, relPath), "utf8") })
    }
  }
  return { files, skippedPaths, blockedPaths }
}
