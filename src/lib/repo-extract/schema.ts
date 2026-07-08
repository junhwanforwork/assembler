import type { DbTableSyncInput } from "@/lib/api/validate-sync"
import type { DbColumn } from "@/lib/types/assembler"
import type { RepoFileInput } from "./types"

// Supabase 스키마 추출 — 1순위 database.types.ts(gen types 산출물), 부재 시 2순위
// supabase/migrations/*.sql의 CREATE TABLE. 둘 다 정규식+중괄호/괄호 스캔 수준(AST 금지).
// description·불확정 references는 지어내지 않는다(빈 문자열·생략).

export function isDatabaseTypesPath(path: string): boolean {
  const segments = path.replace(/\\/g, "/").split("/").filter(Boolean)
  return segments[segments.length - 1] === "database.types.ts"
}

export function isMigrationSqlPath(path: string): boolean {
  return /(^|\/)supabase\/migrations\/[^/]+\.sql$/i.test(path.replace(/\\/g, "/"))
}

export function extractDbTables(files: RepoFileInput[]): DbTableSyncInput[] {
  const typeFiles = files.filter((f) => isDatabaseTypesPath(f.path))
  if (typeFiles.length > 0) {
    return dedupeByName(typeFiles.flatMap((f) => parseDatabaseTypes(f.text)))
  }
  const migrationFiles = files
    .filter((f) => isMigrationSqlPath(f.path))
    // 마이그레이션은 시간순 적용이라 같은 테이블 재정의는 나중 파일이 진실
    .sort((a, b) => a.path.localeCompare(b.path))
  return lastWinsByName(migrationFiles.flatMap((f) => parseMigrationsSql(f.text)))
}

function dedupeByName(tables: DbTableSyncInput[]): DbTableSyncInput[] {
  const byName = new Map<string, DbTableSyncInput>()
  for (const t of tables) if (!byName.has(t.name)) byName.set(t.name, t)
  return [...byName.values()]
}

function lastWinsByName(tables: DbTableSyncInput[]): DbTableSyncInput[] {
  const byName = new Map<string, DbTableSyncInput>()
  for (const t of tables) byName.set(t.name, t)
  return [...byName.values()]
}

// ── 1순위: database.types.ts ────────────────────────────────────────────────

// TS→PG 표기 매핑(패킷 §③). 매핑 밖 타입(enum 참조 등)은 원문 유지 — 지어내지 않음.
const TS_TO_PG: Record<string, string> = {
  string: "text",
  number: "int",
  boolean: "boolean",
  Json: "jsonb",
}

// openIndex는 "{" 위치. 중괄호 짝을 세어 블록 내부 텍스트를 돌려준다.
// gen types 산출물엔 중괄호를 품은 문자열 리터럴이 없어 문자 스캔으로 충분하다.
function braceBlock(text: string, openIndex: number): { body: string; end: number } {
  let depth = 0
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === "{") depth++
    else if (text[i] === "}") {
      depth--
      if (depth === 0) return { body: text.slice(openIndex + 1, i), end: i }
    }
  }
  return { body: text.slice(openIndex + 1), end: text.length }
}

const ENTRY_KEY = /(?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*\{/g
const ROW_KEY = /\bRow\s*:\s*\{/
const FIELD_LINE = /^(?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*(.+?)[;,]?\s*$/

function parseDatabaseTypes(text: string): DbTableSyncInput[] {
  const tables: DbTableSyncInput[] = []
  const tablesKey = /\bTables\s*:\s*\{/g
  // 스키마(public 등)마다 Tables 블록이 있을 수 있어 전부 수집한다
  while (tablesKey.exec(text) !== null) {
    const tablesBlock = braceBlock(text, tablesKey.lastIndex - 1)
    tablesKey.lastIndex = tablesBlock.end + 1

    let cursor = 0
    while (cursor < tablesBlock.body.length) {
      ENTRY_KEY.lastIndex = cursor
      const entry = ENTRY_KEY.exec(tablesBlock.body)
      if (!entry) break
      const tableName = entry[1] ?? entry[2]
      // 테이블 블록 전체(Row·Insert·Relationships 포함)를 통째로 건너뛰며 스캔 —
      // 중첩 키가 테이블명으로 오인되지 않는다
      const tableBlock = braceBlock(tablesBlock.body, ENTRY_KEY.lastIndex - 1)
      cursor = tableBlock.end + 1

      const rowMatch = ROW_KEY.exec(tableBlock.body)
      if (!rowMatch) continue
      const rowBlock = braceBlock(tableBlock.body, rowMatch.index + rowMatch[0].length - 1)
      tables.push({
        name: tableName,
        description: "",
        columns: parseRowFields(rowBlock.body),
        source: "code",
      })
    }
  }
  return tables
}

function parseRowFields(rowBody: string): DbColumn[] {
  const columns: DbColumn[] = []
  for (const raw of rowBody.split("\n")) {
    const match = FIELD_LINE.exec(raw.trim())
    if (!match) continue
    const name = match[1] ?? match[2]
    const { type, nullable } = mapTsType(match[3])
    columns.push({
      name,
      type,
      nullable,
      // PK는 gen types에서 확정 불가 → 관례(id 필드)만 표기 (패킷 §③)
      isPrimaryKey: name === "id",
    })
  }
  return columns
}

function mapTsType(tsType: string): { type: string; nullable: boolean } {
  const parts = tsType.split("|").map((p) => p.trim())
  const nullable = parts.includes("null")
  const core = parts.filter((p) => p !== "null").join(" | ")
  if (TS_TO_PG[core]) return { type: TS_TO_PG[core], nullable }
  if (core.endsWith("[]") && TS_TO_PG[core.slice(0, -2)]) {
    return { type: `${TS_TO_PG[core.slice(0, -2)]}[]`, nullable }
  }
  return { type: core, nullable }
}

// ── 2순위: supabase/migrations/*.sql ────────────────────────────────────────

const CREATE_TABLE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?[\w]+"?\.)?"?([\w]+)"?\s*\(/gi
const COLUMN_CONSTRAINT_STOP = new Set([
  "not",
  "null",
  "primary",
  "default",
  "references",
  "unique",
  "check",
  "constraint",
  "generated",
  "collate",
])
const COLUMN_REFERENCES = /\breferences\s+(?:"?[\w]+"?\.)?"?([\w]+)"?(?:\s*\(\s*"?([\w]+)"?\s*\))?/i
const TABLE_LEVEL_PK = /^(?:constraint\s+[\w"]+\s+)?primary\s+key\s*\(([^)]+)\)/i
const TABLE_LEVEL_FK = /^(?:constraint\s+[\w"]+\s+)?foreign\s+key\s*\(\s*"?([\w]+)"?\s*\)\s*(references\s+.+)$/i

function parseMigrationsSql(sql: string): DbTableSyncInput[] {
  const text = stripSqlComments(sql)
  const tables: DbTableSyncInput[] = []
  let match: RegExpExecArray | null
  while ((match = CREATE_TABLE.exec(text)) !== null) {
    const body = parenBlock(text, CREATE_TABLE.lastIndex - 1)
    CREATE_TABLE.lastIndex = body.end + 1
    tables.push({
      name: match[1],
      description: "",
      columns: parseCreateTableBody(body.body),
      source: "code",
    })
  }
  return tables
}

function stripSqlComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
}

function parenBlock(text: string, openIndex: number): { body: string; end: number } {
  let depth = 0
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === "(") depth++
    else if (text[i] === ")") {
      depth--
      if (depth === 0) return { body: text.slice(openIndex + 1, i), end: i }
    }
  }
  return { body: text.slice(openIndex + 1), end: text.length }
}

function parseCreateTableBody(body: string): DbColumn[] {
  const columns: DbColumn[] = []
  for (const entry of splitTopLevelCommas(body)) {
    const line = entry.trim()
    if (line.length === 0) continue

    const pkMatch = TABLE_LEVEL_PK.exec(line)
    if (pkMatch) {
      const pkNames = new Set(pkMatch[1].split(",").map((s) => s.trim().replace(/"/g, "").toLowerCase()))
      for (const col of columns) {
        if (pkNames.has(col.name.toLowerCase())) {
          col.isPrimaryKey = true
          // PG에서 PK는 NOT NULL을 함의한다
          col.nullable = false
        }
      }
      continue
    }

    const fkMatch = TABLE_LEVEL_FK.exec(line)
    if (fkMatch) {
      const target = columns.find((c) => c.name.toLowerCase() === fkMatch[1].toLowerCase())
      if (target) applyReferences(target, fkMatch[2])
      continue
    }

    // 그 외 테이블 수준 제약은 컬럼이 아니다
    if (/^(unique|check|exclude|like|constraint)\b/i.test(line)) continue

    const column = parseColumnEntry(line)
    if (column) columns.push(column)
  }
  return columns
}

function splitTopLevelCommas(body: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < body.length; i++) {
    if (body[i] === "(") depth++
    else if (body[i] === ")") depth--
    else if (body[i] === "," && depth === 0) {
      parts.push(body.slice(start, i))
      start = i + 1
    }
  }
  parts.push(body.slice(start))
  return parts
}

function parseColumnEntry(entry: string): DbColumn | null {
  const nameMatch = /^"?([\w]+)"?\s+([\s\S]+)$/.exec(entry)
  if (!nameMatch) return null
  const name = nameMatch[1]
  const rest = nameMatch[2].trim()

  // 타입 = 제약 키워드가 나오기 전까지의 토큰 나열 ("timestamp with time zone" 같은 다단어 유지)
  const tokens = rest.split(/\s+/)
  const typeTokens: string[] = []
  for (const token of tokens) {
    if (COLUMN_CONSTRAINT_STOP.has(token.toLowerCase())) break
    typeTokens.push(token)
  }
  if (typeTokens.length === 0) return null

  const lowered = rest.toLowerCase()
  const isPrimaryKey = /\bprimary\s+key\b/.test(lowered)
  const column: DbColumn = {
    name,
    type: typeTokens.join(" "),
    nullable: !isPrimaryKey && !/\bnot\s+null\b/.test(lowered),
    isPrimaryKey,
  }
  const refMatch = COLUMN_REFERENCES.exec(rest)
  if (refMatch) applyReferences(column, refMatch[0])
  return column
}

// references 표기는 앱 관례("table.column")를 따르되, SQL에 컬럼이 없으면
// 테이블명만 남긴다 — PK 컬럼명을 지어내지 않는다.
function applyReferences(column: DbColumn, referencesClause: string): void {
  const match = COLUMN_REFERENCES.exec(referencesClause)
  if (!match) return
  column.references = match[2] ? `${match[1]}.${match[2]}` : match[1]
}
