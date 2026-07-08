import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { cloneRepo } from "./clone"
import { collectRepoFiles } from "./walk"
import { extractRepo } from "@/lib/repo-extract/extract"
import { isBlockedPath } from "@/lib/repo-extract/blocklist"
import type { ExtractResult } from "@/lib/repo-extract/types"

// ASM-061 — 깃 주소 → 추출 결과 조립. 저장하지 않는다(미리보기 원칙).
// 임시 디렉토리는 성공·실패·타임아웃 전부에서 finally로 정리한다 — 디스크 잔존 = 유출 통로.

export async function scanGitRepo(url: string): Promise<ExtractResult> {
  const dir = await mkdtemp(join(tmpdir(), "repo-scan-"))
  try {
    await cloneRepo(url, dir)
    const walked = await collectRepoFiles(dir, isBlockedPath)
    const result = extractRepo(walked.files)
    // 워커 단계에서 걸러진 것도 리포트에 합친다 — 조용한 누락 금지.
    return {
      payload: result.payload,
      report: {
        scannedCount: result.report.scannedCount,
        blockedPaths: [...walked.blockedPaths, ...result.report.blockedPaths],
        skippedPaths: [...walked.skippedPaths, ...result.report.skippedPaths],
      },
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
