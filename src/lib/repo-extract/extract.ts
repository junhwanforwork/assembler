import { MAX_SYNC_APIS, MAX_SYNC_TABLES, MAX_TABLE_COLUMNS } from "@/lib/api/validate-sync"
import { isBlockedPath } from "./blocklist"
import { extractNextRoutes, isRouteFilePath } from "./routes"
import { extractDbTables, isDatabaseTypesPath, isMigrationSqlPath } from "./schema"
import type { ExtractResult, RepoFileInput } from "./types"

// 브라우저(폴더 선택)·서버(깃 클론) 겸용 순수 추출 엔진 — I/O 없음, 입력은 {path, text}.
// 호출자가 isBlockedPath로 걸렀어도 여기서 재확인한다(이중 방어 — 차단 파일 내용은
// 함수에 들어와도 payload에 닿지 않는다).
export function extractRepo(files: RepoFileInput[]): ExtractResult {
  const blockedPaths: string[] = []
  const safe: RepoFileInput[] = []
  for (const file of files) {
    if (isBlockedPath(file.path)) blockedPaths.push(file.path)
    else safe.push(file)
  }

  const hasDatabaseTypes = safe.some((f) => isDatabaseTypesPath(f.path))
  const consumed = (path: string): boolean =>
    isRouteFilePath(path) ||
    isDatabaseTypesPath(path) ||
    // 1순위(database.types.ts)가 있으면 마이그레이션은 소비되지 않는다 → skippedPaths로 정직 보고
    (!hasDatabaseTypes && isMigrationSqlPath(path))
  const skippedPaths = safe.filter((f) => !consumed(f.path)).map((f) => f.path)

  const capNotes: string[] = []

  let apis = extractNextRoutes(safe)
  if (apis.length > MAX_SYNC_APIS) {
    capNotes.push(`API ${apis.length}개를 찾았지만 캡(${MAX_SYNC_APIS}개)까지만 담았어요.`)
    apis = apis.slice(0, MAX_SYNC_APIS)
  }

  let tables = extractDbTables(safe)
  if (tables.length > MAX_SYNC_TABLES) {
    capNotes.push(`테이블 ${tables.length}개를 찾았지만 캡(${MAX_SYNC_TABLES}개)까지만 담았어요.`)
    tables = tables.slice(0, MAX_SYNC_TABLES)
  }
  tables = tables.map((table) => {
    if (table.columns.length <= MAX_TABLE_COLUMNS) return table
    capNotes.push(
      `${table.name} 테이블 컬럼 ${table.columns.length}개를 찾았지만 캡(${MAX_TABLE_COLUMNS}개)까지만 담았어요.`
    )
    return { ...table, columns: table.columns.slice(0, MAX_TABLE_COLUMNS) }
  })

  return {
    payload: { apis, tables },
    report: {
      scannedCount: safe.length,
      blockedPaths,
      skippedPaths,
      ...(capNotes.length > 0 ? { capNotes } : {}),
    },
  }
}
