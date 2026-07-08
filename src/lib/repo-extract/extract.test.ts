import { describe, expect, it } from "vitest"
import {
  MAX_SYNC_APIS,
  MAX_SYNC_TABLES,
  MAX_TABLE_COLUMNS,
  parseApiSync,
  parseDbTableSync,
} from "@/lib/api/validate-sync"
import { extractRepo } from "./extract"
import { loadFixtureRepo } from "./fixtures/load"
import type { RepoFileInput } from "./types"

describe("extractRepo — 픽스처 레포 통합", () => {
  const result = extractRepo(loadFixtureRepo())

  it("차단 파일은 호출자가 안 걸렀어도 내부에서 재확인해 blockedPaths로 보고한다 (이중 방어)", () => {
    expect(result.report.blockedPaths.sort()).toEqual(
      [
        ".env.local",
        "certs/server.pem",
        "config/secrets.ts",
        "node_modules/leftpad/index.js",
        "package-lock.json",
        "assets/logo.png",
      ].sort()
    )
  })

  it("payload에 차단 파일 흔적이 0이다", () => {
    const serialized = JSON.stringify(result.payload)
    expect(serialized).not.toContain("FAKE_KEY")
    expect(serialized).not.toContain("not-a-real-secret")
    expect(serialized).not.toContain(".env")
    expect(serialized).not.toContain("FAKE-PEM")
  })

  it("라우트 6개·테이블 2개를 추출한다", () => {
    expect(result.payload.apis).toHaveLength(6)
    expect(result.payload.tables.map((t) => t.name).sort()).toEqual(["project_members", "projects"])
  })

  it("scannedCount = 차단 제외 검토 파일 수, skippedPaths = 소비 안 된 파일", () => {
    expect(result.report.scannedCount).toBe(7)
    expect(result.report.skippedPaths.sort()).toEqual(["README.md", "supabase/migrations/0001_init.sql"].sort())
  })

  it("캡 미달이면 capNotes가 없다", () => {
    expect(result.report.capNotes).toBeUndefined()
  })

  it("추출 payload는 서버 싱크-인 파서를 그대로 통과한다 (소비자 경계 계약)", () => {
    expect(parseApiSync({ apis: result.payload.apis }).ok).toBe(true)
    expect(parseDbTableSync({ tables: result.payload.tables }).ok).toBe(true)
  })
})

describe("extractRepo — 빈 입력", () => {
  it("빈 payload와 0 카운트 리포트를 돌려준다", () => {
    expect(extractRepo([])).toEqual({
      payload: { apis: [], tables: [] },
      report: { scannedCount: 0, blockedPaths: [], skippedPaths: [] },
    })
  })
})

describe("extractRepo — 캡 초과는 컷하되 조용히 누락하지 않는다", () => {
  it(`API가 ${MAX_SYNC_APIS}개를 넘으면 컷 + capNotes 사유`, () => {
    const files: RepoFileInput[] = Array.from({ length: MAX_SYNC_APIS + 1 }, (_, i) => ({
      path: `app/api/r${i}/route.ts`,
      text: "export function GET() {}\n",
    }))
    const { payload, report } = extractRepo(files)
    expect(payload.apis).toHaveLength(MAX_SYNC_APIS)
    expect(report.capNotes?.some((n) => n.includes(String(MAX_SYNC_APIS)))).toBe(true)
  })

  it(`테이블이 ${MAX_SYNC_TABLES}개를 넘으면 컷 + capNotes 사유`, () => {
    const names = Array.from({ length: MAX_SYNC_TABLES + 1 }, (_, i) => `t${i}`)
    const body = names
      .map((n) => `      ${n}: {\n        Row: {\n          id: string\n        }\n        Relationships: []\n      }`)
      .join("\n")
    const text = `export type Database = {\n  public: {\n    Tables: {\n${body}\n    }\n  }\n}\n`
    const { payload, report } = extractRepo([{ path: "database.types.ts", text }])
    expect(payload.tables).toHaveLength(MAX_SYNC_TABLES)
    expect(report.capNotes?.some((n) => n.includes(String(MAX_SYNC_TABLES)))).toBe(true)
  })

  it(`컬럼이 ${MAX_TABLE_COLUMNS}개를 넘으면 그 테이블만 컷 + capNotes 사유`, () => {
    const fields = Array.from({ length: MAX_TABLE_COLUMNS + 1 }, (_, i) => `          c${i}: string`).join("\n")
    const text = `export type Database = {\n  public: {\n    Tables: {\n      wide: {\n        Row: {\n${fields}\n        }\n        Relationships: []\n      }\n    }\n  }\n}\n`
    const { payload, report } = extractRepo([{ path: "database.types.ts", text }])
    expect(payload.tables[0]?.columns).toHaveLength(MAX_TABLE_COLUMNS)
    expect(report.capNotes?.some((n) => n.includes("wide"))).toBe(true)
  })
})
