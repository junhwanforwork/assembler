import { describe, expect, it } from "vitest"
import { loadFixtureRepo, loadMigrationsRepo } from "./fixtures/load"
import { extractDbTables, isDatabaseTypesPath, isMigrationSqlPath } from "./schema"

describe("경로 판별", () => {
  it.each(["database.types.ts", "src/lib/database.types.ts"])("database.types: %s", (path) => {
    expect(isDatabaseTypesPath(path)).toBe(true)
  })
  it.each(["src/lib/types/assembler.ts", "database.types.test.ts"])("database.types 아님: %s", (path) => {
    expect(isDatabaseTypesPath(path)).toBe(false)
  })
  it.each(["supabase/migrations/0001_init.sql", "apps/web/supabase/migrations/20260101_a.sql"])(
    "마이그레이션: %s",
    (path) => {
      expect(isMigrationSqlPath(path)).toBe(true)
    }
  )
  it.each(["supabase/seed.sql", "migrations/0001.sql", "supabase/migrations/nested/0001.sql"])(
    "마이그레이션 아님: %s",
    (path) => {
      expect(isMigrationSqlPath(path)).toBe(false)
    }
  )
})

describe("extractDbTables — 1순위 database.types.ts", () => {
  const tables = extractDbTables(loadFixtureRepo())

  it("Tables 블록의 테이블만 추출한다 (Views·Enums 제외, 마이그레이션은 1순위에 밀림)", () => {
    expect(tables.map((t) => t.name).sort()).toEqual(["project_members", "projects"])
  })

  it("Row 필드를 TS→PG 표기·nullable로 매핑하고 id만 PK로 표기한다", () => {
    const projects = tables.find((t) => t.name === "projects")
    expect(projects).toEqual({
      name: "projects",
      description: "",
      source: "code",
      columns: [
        { name: "created_at", type: "text", nullable: false, isPrimaryKey: false },
        { name: "data", type: "jsonb", nullable: true, isPrimaryKey: false },
        { name: "id", type: "text", nullable: false, isPrimaryKey: true },
        { name: "is_public", type: "boolean", nullable: false, isPrimaryKey: false },
        { name: "name", type: "text", nullable: false, isPrimaryKey: false },
        { name: "owner_id", type: "text", nullable: true, isPrimaryKey: false },
        { name: "tags", type: "text[]", nullable: false, isPrimaryKey: false },
        { name: "view_count", type: "int", nullable: false, isPrimaryKey: false },
      ],
    })
  })

  it("id 필드가 없으면 PK를 지어내지 않고, 미지 타입은 원문 그대로 둔다", () => {
    const members = tables.find((t) => t.name === "project_members")
    expect(members?.columns.some((c) => c.isPrimaryKey)).toBe(false)
    const role = members?.columns.find((c) => c.name === "role")
    expect(role?.type).toBe('Database["public"]["Enums"]["member_role"]')
  })

  it("references는 이 소스에선 지어내지 않는다 (전 컬럼 생략)", () => {
    for (const t of tables) {
      for (const c of t.columns) expect(c.references).toBeUndefined()
    }
  })
})

describe("extractDbTables — 2순위 migrations SQL", () => {
  const tables = extractDbTables(loadMigrationsRepo())

  it("CREATE TABLE만 파싱한다 (create type·alter·index 무시)", () => {
    expect(tables.map((t) => t.name).sort()).toEqual(["customers", "orders"])
  })

  it("인라인 PK·references·not null·다단어 타입·괄호 타입을 파싱한다", () => {
    const orders = tables.find((t) => t.name === "orders")
    expect(orders?.columns).toEqual([
      { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
      { name: "customer_id", type: "uuid", nullable: false, isPrimaryKey: false, references: "customers.id" },
      { name: "amount", type: "numeric(10,2)", nullable: true, isPrimaryKey: false },
      { name: "placed_at", type: "timestamp with time zone", nullable: false, isPrimaryKey: false },
      { name: "memo", type: "text", nullable: true, isPrimaryKey: false },
      { name: "status", type: "order_status", nullable: false, isPrimaryKey: false },
    ])
  })

  it("테이블 수준 primary key (...) 를 해당 컬럼 PK로 반영한다", () => {
    const customers = tables.find((t) => t.name === "customers")
    expect(customers?.columns).toEqual([
      { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
      { name: "email", type: "text", nullable: false, isPrimaryKey: false },
      { name: "signup_source", type: "text", nullable: true, isPrimaryKey: false },
    ])
  })

  it("references에 컬럼이 없으면 테이블명만 남긴다 (컬럼을 지어내지 않음)", () => {
    const sql = "create table a (\n  b_id uuid references b\n);\n"
    const tables = extractDbTables([{ path: "supabase/migrations/0002_a.sql", text: sql }])
    expect(tables[0]?.columns[0]?.references).toBe("b")
  })
})

describe("extractDbTables — 빈 입력", () => {
  it("빈 배열", () => {
    expect(extractDbTables([])).toEqual([])
  })
})
