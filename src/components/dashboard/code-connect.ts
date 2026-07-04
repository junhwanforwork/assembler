import {
  MAX_SYNC_APIS,
  MAX_SYNC_BYTES,
  MAX_SYNC_TABLES,
  MAX_TABLE_COLUMNS,
  parseApiSync,
  parseDbTableSync,
  type ApiSyncInput,
  type DbTableSyncInput,
} from "@/lib/api/validate-sync"

// 수동 싱크-인(ASM-026) 붙여넣기 검증 — 서버 경계(parseApiSync/parseDbTableSync)를 그대로
// 재사용한다(계약 단일 출처, 경계 중복 구현 금지). 서버가 거부할 입력은 여기서 먼저 걸러
// "어떤 행이 왜"를 해요체로 돌려준다 — 기술 에러 코드 직노출 금지.
// 서버에 없는 추가 검사는 배치 안 중복뿐: upsert가 같은 conflict key 행 2개에서 실패(21000→500)라
// 경계에서 막지 않으면 "잠시 후 다시 시도" 거짓 안내가 된다.

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

const FALLBACK_MESSAGE = "형식을 확인해 주세요."

// 전체 파싱이 행 단위 코드로 실패하면, 행마다 파서를 다시 돌려 위치를 찾는다.
// 파서가 첫 에러에서 멈추므로 행 단위 재실행이 "몇 번째가 왜"를 복원하는 유일한 방법.
// 전체는 실패했는데 행에서 재현이 안 되면 폴백 이슈로 실패를 유지한다 — fail-open 금지.
function locateRowIssues(section: "apis" | "tables", rows: unknown[]): RowIssue[] {
  const issues: RowIssue[] = []
  for (let i = 0; i < rows.length; i++) {
    const parsed =
      section === "apis" ? parseApiSync({ apis: [rows[i]] }) : parseDbTableSync({ tables: [rows[i]] })
    if (!parsed.ok) {
      issues.push({ section, index: i, message: ROW_MESSAGES[parsed.error] ?? FALLBACK_MESSAGE })
    }
  }
  if (issues.length === 0) issues.push({ section, index: 0, message: FALLBACK_MESSAGE })
  return issues
}

// 배치 안 conflict key 중복 — 서버 upsert 키와 1:1(apis=method+endpoint, tables=trim된 name).
function duplicateIssues(section: "apis" | "tables", keys: string[], message: string): RowIssue[] {
  const seen = new Set<string>()
  const issues: RowIssue[] = []
  keys.forEach((key, index) => {
    if (seen.has(key)) issues.push({ section, index, message })
    else seen.add(key)
  })
  return issues
}

const ENCODER = new TextEncoder()

export function parseSyncPaste(text: string): SyncPasteResult {
  // 서버 바이트 캡 초과 붙여넣기는 JSON.parse 전에 컷 — 파일 경로(handleFile)의 사전 컷과 동일한 자해 프리즈 방어.
  if (ENCODER.encode(text).length > MAX_SYNC_BYTES) {
    return { ok: false, message: TOP_MESSAGES.payload_too_large, issues: [] }
  }
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
  // 키가 있는데 배열이 아니면 무음 폐기 대신 거부 — 서버 단독 호출이면 400이 나는 입력이고,
  // 조용히 다른 섹션만 보내면 사용자는 전부 연결됐다고 오해한다.
  if (body.apis !== undefined && !Array.isArray(body.apis)) {
    return { ok: false, message: "apis는 배열로 적어 주세요.", issues: [] }
  }
  if (body.tables !== undefined && !Array.isArray(body.tables)) {
    return { ok: false, message: "tables는 배열로 적어 주세요.", issues: [] }
  }

  const apiRows = Array.isArray(body.apis) ? body.apis : []
  const tableRows = Array.isArray(body.tables) ? body.tables : []
  if (apiRows.length === 0 && tableRows.length === 0) {
    return { ok: false, message: "apis 또는 tables 배열이 필요해요. 안내된 형식으로 붙여넣어 주세요.", issues: [] }
  }

  const issues: RowIssue[] = []
  const payload: SyncPayload = { apis: [], tables: [] }

  if (apiRows.length > 0) {
    const parsed = parseApiSync({ apis: apiRows })
    if (parsed.ok) {
      payload.apis = parsed.value
      issues.push(
        ...duplicateIssues(
          "apis",
          parsed.value.map((a) => `${a.method} ${a.endpoint}`),
          "위에 같은 method·endpoint 항목이 이미 있어요. 하나만 남겨 주세요."
        )
      )
    } else {
      const top = TOP_MESSAGES[parsed.error]
      if (top) return { ok: false, message: top, issues: [] }
      issues.push(...locateRowIssues("apis", apiRows))
    }
  }

  if (tableRows.length > 0) {
    const parsed = parseDbTableSync({ tables: tableRows })
    if (parsed.ok) {
      payload.tables = parsed.value
      issues.push(
        ...duplicateIssues(
          "tables",
          parsed.value.map((t) => t.name),
          "위에 같은 이름의 테이블이 이미 있어요. 하나만 남겨 주세요."
        )
      )
    } else {
      const top = TOP_MESSAGES[parsed.error]
      if (top) return { ok: false, message: top, issues: [] }
      issues.push(...locateRowIssues("tables", tableRows))
    }
  }

  if (issues.length > 0) {
    return { ok: false, message: "아래 항목을 고치고 다시 시도해 주세요.", issues }
  }
  return { ok: true, payload }
}
