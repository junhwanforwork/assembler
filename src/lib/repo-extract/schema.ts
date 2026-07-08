import type { DbTableSyncInput } from "@/lib/api/validate-sync"
import type { RepoFileInput } from "./types"

// TDD RED 단계 스텁.
export function isDatabaseTypesPath(path: string): boolean {
  void path
  return false
}

export function isMigrationSqlPath(path: string): boolean {
  void path
  return false
}

export function extractDbTables(files: RepoFileInput[]): DbTableSyncInput[] {
  void files
  return []
}
