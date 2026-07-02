import {
  MAX_SYNC_APIS,
  MAX_SYNC_TABLES,
  MAX_TABLE_COLUMNS,
  parseApiSync,
  parseDbTableSync,
  type ApiSyncInput,
  type DbTableSyncInput,
} from "@/lib/api/validate-sync"

// 수동 싱크-인(ASM-026) 붙여넣기 검증 — 서버 경계(parseApiSync/parseDbTableSync)를 그대로
// 재사용한다(계약 단일 출처, 경계 중복 구현 금지). 여기를 통과한 페이로드는 라우트 파서를
// 반드시 통과한다. 실패는 "어떤 행이 왜"를 해요체로 — 기술 에러 코드 직노출 금지.

export type SyncPayload = { apis: ApiSyncInput[]; tables: DbTableSyncInput[] }
export type RowIssue = { section: "apis" | "tables"; index: number; message: string }
export type SyncPasteResult =
  | { ok: true; payload: SyncPayload }
  | { ok: false; message: string; issues: RowIssue[] }

// 서버 에러 코드 → 사용자 언어. 행 단위 코드만 여기 온다(전체 단위는 TOP_MESSAGES).
const ROW_MESSAGES: Record<string, string> = {
  invalid_apis: "항목 형식을 확인해 주세요. 객체 형태로 적어 주세요.",
  invalid_method: "method는 GET·POST·PUT·PATCH·DELETE 중 하나로 적어 주세요.",
  invalid_endpoint: "endpoint를 적어 주세요.",
  invalid_source: "source는 code 또는 mcp로 적어 주세요.",
  invalid_summary: "summary는 문자열로 적어 주세요.",
  invalid_status: "status는 planned·active·deprecated 중 하나로 적어 주세요.",
  invalid_tables: "항목 형식을 확인해 주세요. 객체 형태로 적어 주세요.",
  invalid_table_name: "테이블 name을 적어 주세요.",
  invalid_description: "description은 문자열로 적어 주세요.",
  invalid_columns: "columns는 배열로 적어 주세요.",
  invalid_column: "columns 항목에 name·type·nullable·isPrimaryKey를 채워 주세요.",
  too_many_columns: `컬럼은 테이블당 ${MAX_TABLE_COLUMNS}개까지 보낼 수 있어요.`,
}

const TOP_MESSAGES: Record<string, string> = {
  payload_too_large: "붙여넣은 내용이 너무 커요. 나눠서 보내 주세요.",
  too_many_apis: `API는 한 번에 ${MAX_SYNC_APIS}개까지 보낼 수 있어요. 나눠서 보내 주세요.`,
  too_many_tables: `테이블은 한 번에 ${MAX_SYNC_TABLES}개까지 보낼 수 있어요. 나눠서 보내 주세요.`,
}

function fallbackRowMessage(): string {
  return "형식을 확인해 주세요."
}

// 전체 파싱이 행 단위 코드로 실패하면, 행마다 파서를 다시 돌려 위치를 찾는다.
// 파서가 첫 에러에서 멈추므로 행 단위 재실행이 "몇 번째가 왜"를 복원하는 유일한 방법.
function locateRowIssues(section: "apis" | "tables", rows: unknown[]): RowIssue[] {
  const issues: RowIssue[] = []
  for (let i = 0; i < rows.length; i++) {
    const parsed =
      section === "apis" ? parseApiSync({ apis: [rows[i]] }) : parseDbTableSync({ tables: [rows[i]] })
    if (!parsed.ok) {
      issues.push({ section, index: i, message: ROW_MESSAGES[parsed.error] ?? fallbackRowMessage() })
    }
  }
  return issues
}

export function parseSyncPaste(text: string): SyncPasteResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, message: "JSON을 읽지 못했어요. 형식을 확인해 주세요.", issues: [] }
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, message: "JSON을 읽지 못했어요. 형식을 확인해 주세요.", issues: [] }
  }

  const body = raw as Record<string, unknown>
  const hasApis = Array.isArray(body.apis) && body.apis.length > 0
  const hasTables = Array.isArray(body.tables) && body.tables.length > 0
  if (!hasApis && !hasTables) {
    return { ok: false, message: "apis 또는 tables 배열이 필요해요. 안내된 형식으로 붙여넣어 주세요.", issues: [] }
  }

  const issues: RowIssue[] = []
  const payload: SyncPayload = { apis: [], tables: [] }

  const sections = [
    { section: "apis" as const, present: hasApis, rows: body.apis as unknown[], parse: () => parseApiSync({ apis: body.apis }) },
    { section: "tables" as const, present: hasTables, rows: body.tables as unknown[], parse: () => parseDbTableSync({ tables: body.tables }) },
  ]
  for (const { section, present, rows, parse } of sections) {
    if (!present) continue
    const parsed = parse()
    if (parsed.ok) {
      if (section === "apis") payload.apis = parsed.value as ApiSyncInput[]
      else payload.tables = parsed.value as DbTableSyncInput[]
      continue
    }
    // 행과 무관한 상한 초과는 전체 메시지로 즉시 종료 — 행 탐색이 무의미하다.
    const top = TOP_MESSAGES[parsed.error]
    if (top) return { ok: false, message: top, issues: [] }
    issues.push(...locateRowIssues(section, rows))
  }

  if (issues.length > 0) {
    return { ok: false, message: "아래 항목을 고치고 다시 시도해 주세요.", issues }
  }
  return { ok: true, payload }
}
