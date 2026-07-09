import { jsonByteLength } from "@/lib/api/validate"
import { MAX_SYNC_APIS, MAX_SYNC_BYTES, MAX_SYNC_TABLES, MAX_TABLE_COLUMNS } from "@/lib/api/validate-sync"
import { isBlockedPath } from "./blocklist"
import { extractMarkdownDocs, isMarkdownDocPath } from "./docs"
import { extractNextRoutes, findMethodlessRoutePaths, isRouteFilePath } from "./routes"
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
    isMarkdownDocPath(path) ||
    // 1순위(database.types.ts)가 있으면 마이그레이션은 소비되지 않는다 → skippedPaths로 정직 보고
    (!hasDatabaseTypes && isMigrationSqlPath(path))
  const skippedPaths = safe.filter((f) => !consumed(f.path)).map((f) => f.path)

  const capNotes: string[] = []

  let apis = extractNextRoutes(safe)
  if (apis.length > MAX_SYNC_APIS) {
    capNotes.push(`API ${apis.length}개를 찾았지만 캡(${MAX_SYNC_APIS}개)까지만 담았어요.`)
    apis = apis.slice(0, MAX_SYNC_APIS)
  }
  // 라우트 파일인데 메서드 0 추출이면 조용한 누락 금지 — 사유로 남긴다 (크로스체크 정정)
  for (const path of findMethodlessRoutePaths(safe)) {
    capNotes.push(`라우트 파일 ${path}에서 HTTP 메서드를 인식하지 못했어요.`)
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

  // 개수 캡을 통과해도 바이트 캡을 넘으면 서버가 싱크 전체를 거부한다(payload_too_large) —
  // 테이블을 끝에서부터 단위로 덜어내고 사유를 남긴다 (크로스체크 정정)
  if (jsonByteLength({ apis, tables }) > MAX_SYNC_BYTES) {
    const beforeCount = tables.length
    while (tables.length > 0 && jsonByteLength({ apis, tables }) > MAX_SYNC_BYTES) {
      tables = tables.slice(0, -1)
    }
    capNotes.push(
      `추출 결과가 바이트 캡(${MAX_SYNC_BYTES}B)을 넘어 테이블 ${beforeCount - tables.length}개를 덜어냈어요.`
    )
  }

  // 기획 md는 코드와 별개로 report에 담는다(payload는 싱크 파서 계약이라 넣지 않는다).
  const { docs, capNotes: docCapNotes } = extractMarkdownDocs(safe)
  capNotes.push(...docCapNotes)

  return {
    payload: { apis, tables },
    report: {
      scannedCount: safe.length,
      blockedPaths,
      skippedPaths,
      ...(capNotes.length > 0 ? { capNotes } : {}),
      ...(docs.length > 0 ? { docs } : {}),
    },
  }
}
