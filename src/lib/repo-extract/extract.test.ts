import { describe, expect, it } from "vitest"
import { jsonByteLength } from "@/lib/api/validate"
import {
  MAX_SYNC_APIS,
  MAX_SYNC_BYTES,
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
        "node_modules/evil/app/api/pwn/route.ts",
        "node_modules/evil/database.types.ts",
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

  it("차단 경로가 추출기 소비 가능 형태여도 payload에 실리지 않는다 (이중 방어 실질 검증)", () => {
    expect(result.payload.apis.some((a) => a.endpoint === "/api/pwn")).toBe(false)
    expect(result.payload.tables.some((t) => t.name === "evil_table")).toBe(false)
  })

  it("라우트 6개·테이블 2개를 추출한다", () => {
    expect(result.payload.apis).toHaveLength(6)
    expect(result.payload.tables.map((t) => t.name).sort()).toEqual(["project_members", "projects"])
  })

  it("scannedCount = 차단 제외 검토 파일 수, skippedPaths = 소비 안 된 파일", () => {
    expect(result.report.scannedCount).toBe(7)
    // ASM-070 — README.md는 이제 기획 문서로 소비돼 skippedPaths에서 빠지고 report.docs로 간다.
    expect(result.report.skippedPaths.sort()).toEqual(["supabase/migrations/0001_init.sql"])
  })

  it("기획 md 문서(README.md)는 payload가 아니라 report.docs로 읽어온다 (ASM-070)", () => {
    expect(result.report.docs?.map((d) => d.path)).toEqual(["README.md"])
    // 문서 내용은 payload 계약에 섞이지 않는다.
    expect(JSON.stringify(result.payload)).not.toContain("README")
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

  it(`개수 캡 통과 후에도 바이트 캡(${MAX_SYNC_BYTES}B) 초과면 테이블 단위로 덜어낸다`, () => {
    // 테이블 20개 × 컬럼 50개 × 긴 컬럼명 ≈ 2MB — 개수 캡은 전부 통과하는 크기
    const longName = "c".repeat(2000)
    const tableBody = (name: string) =>
      `      ${name}: {\n        Row: {\n${Array.from({ length: 50 }, (_, i) => `          ${longName}_${i}: string`).join("\n")}\n        }\n        Relationships: []\n      }`
    const names = Array.from({ length: 20 }, (_, i) => `t${i}`)
    const text = `export type Database = {\n  public: {\n    Tables: {\n${names.map(tableBody).join("\n")}\n    }\n  }\n}\n`
    const { payload, report } = extractRepo([{ path: "database.types.ts", text }])
    expect(jsonByteLength({ apis: payload.apis, tables: payload.tables })).toBeLessThanOrEqual(MAX_SYNC_BYTES)
    expect(payload.tables.length).toBeGreaterThan(0)
    expect(payload.tables.length).toBeLessThan(20)
    expect(report.capNotes?.some((n) => n.includes("바이트"))).toBe(true)
  })

  it("메서드 0 라우트 파일은 capNotes로 정직 보고한다", () => {
    const { payload, report } = extractRepo([
      { path: "app/api/silent/route.ts", text: "export const runtime = \"nodejs\"\n" },
    ])
    expect(payload.apis).toHaveLength(0)
    expect(report.capNotes?.some((n) => n.includes("app/api/silent/route.ts"))).toBe(true)
  })
})
