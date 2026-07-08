import type { ExtractResult, RepoFileInput } from "./types"

// TDD RED 단계 스텁.
export function extractRepo(files: RepoFileInput[]): ExtractResult {
  void files
  return {
    payload: { apis: [], tables: [] },
    report: { scannedCount: 0, blockedPaths: [], skippedPaths: [] },
  }
}
