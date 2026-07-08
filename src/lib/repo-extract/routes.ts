import type { ApiSyncInput } from "@/lib/api/validate-sync"
import type { RepoFileInput } from "./types"

// TDD RED 단계 스텁.
export function isRouteFilePath(path: string): boolean {
  void path
  return false
}

export function extractNextRoutes(files: RepoFileInput[]): ApiSyncInput[] {
  void files
  return []
}
