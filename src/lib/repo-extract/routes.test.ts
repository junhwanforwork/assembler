import { describe, expect, it } from "vitest"
import { loadFixtureRepo } from "./fixtures/load"
import { extractNextRoutes, isRouteFilePath } from "./routes"

function sortKeys(items: { method: string; endpoint: string }[]): string[] {
  return items.map((a) => `${a.method} ${a.endpoint}`).sort()
}

describe("isRouteFilePath", () => {
  it.each([
    "app/api/surveys/[id]/route.ts",
    "app/(admin)/api/admin/users/route.ts",
    "src/app/api/health/route.js",
    "app/route.ts",
  ])("라우트 파일: %s", (path) => {
    expect(isRouteFilePath(path)).toBe(true)
  })

  it.each([
    "src/lib/route.ts",
    "app/api/surveys/handlers.ts",
    "app/api/route.tsx",
    "docs/app/route.md",
  ])("라우트 아님: %s", (path) => {
    expect(isRouteFilePath(path)).toBe(false)
  })
})

describe("extractNextRoutes", () => {
  it("픽스처 레포에서 두 export 문법·동적 세그먼트·route group·js를 전부 추출한다", () => {
    const routeFiles = loadFixtureRepo().filter((f) => isRouteFilePath(f.path))
    const apis = extractNextRoutes(routeFiles)
    expect(sortKeys(apis)).toEqual(
      [
        "GET /api/surveys/[id]",
        "DELETE /api/surveys/[id]",
        "POST /api/admin/users",
        "GET /api/health",
        "GET /api/notes",
        "PATCH /api/notes",
      ].sort()
    )
  })

  it("summary는 빈 문자열, status=active, source=code로 고정한다", () => {
    const apis = extractNextRoutes([
      { path: "app/api/ping/route.ts", text: "export function GET(): Response { return new Response() }\n" },
    ])
    expect(apis).toEqual([
      { method: "GET", endpoint: "/api/ping", summary: "", status: "active", source: "code" },
    ])
  })

  it("app 루트 route.ts는 endpoint '/'가 된다", () => {
    const apis = extractNextRoutes([{ path: "app/route.ts", text: "export function GET() {}\n" }])
    expect(apis.map((a) => a.endpoint)).toEqual(["/"])
  })

  it("주석·들여쓴 문자열 속 export와 메서드 아닌 export는 무시한다", () => {
    const text = [
      "// export async function DELETE() {}",
      "const doc = `",
      "  export function PUT() {}",
      "`",
      "export const revalidate = 60",
      "export async function GET(): Promise<Response> {",
      "  return new Response(doc)",
      "}",
    ].join("\n")
    const apis = extractNextRoutes([{ path: "app/api/notes/route.ts", text }])
    expect(sortKeys(apis)).toEqual(["GET /api/notes"])
  })

  it("같은 method+endpoint는 한 번만 담는다 (중복 upsert 키 방지)", () => {
    const text = "export function GET() {}\nexport const GET = handler\n"
    const apis = extractNextRoutes([{ path: "app/api/dup/route.ts", text }])
    expect(apis).toHaveLength(1)
  })

  it("빈 입력이면 빈 배열", () => {
    expect(extractNextRoutes([])).toEqual([])
  })
})
