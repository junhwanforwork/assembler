import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// 뷰 전환 세로 레일 + 좌측 개수 제거 + 카피 정리(ASM-078).
// ① 왼쪽 세로 아이콘 레일로 dir/table/card/node 4뷰 전환 + 활성=aria-pressed.
// ② 좌측 Storyboard·코드 진실 행에 개수 숫자 미노출(라벨만).
// ③ Product Requirement 헤더/빈상태 카피가 새 문구로 노출.
// AI/DB 실호출 0 — 미지정 /api/** 차단 후 필요분만 결정적 응답.

const WORKSPACE = { id: "f1", productId: "p1", name: "로그인 스펙", isMain: true }

function makeDesign() {
  return {
    requirements: [
      {
        id: "req-1",
        title: "인증",
        description: "사용자는 로그인할 수 있다",
        status: "approved",
        priority: "high",
        role: "회원",
        acceptanceCriteria: ["이메일로 로그인할 수 있다"],
      },
    ],
    features: [
      {
        id: "feat-1",
        name: "로그인 기능",
        description: "이메일·비밀번호 로그인",
        detailFeatures: [],
        requirementIds: ["req-1"],
        pageIds: ["page-1"],
        apiIds: ["api-1"],
        dbTableIds: ["db-1"],
        implStatus: "implemented",
        changeStatus: "changed",
      },
      {
        id: "feat-2",
        name: "회원가입 기능",
        description: "",
        detailFeatures: [],
        requirementIds: ["req-1"],
        pageIds: [],
        apiIds: [],
      },
    ],
    pages: [],
    flows: [],
    wireframes: [],
    elements: [],
  }
}

// 개수 미노출 검증을 유의미하게 — apis·dbTables를 0이 아닌 값으로 시드한다.
const APIS = [
  { id: "api-1", method: "POST", path: "/login" },
  { id: "api-2", method: "POST", path: "/signup" },
  { id: "api-3", method: "GET", path: "/me" },
]
const DB_TABLES = [
  { id: "db-1", name: "users" },
  { id: "db-2", name: "sessions" },
]

async function mockEditorApis(page: Page): Promise<void> {
  const current = makeDesign()
  await page.route("**/api/**", (route) => route.abort())
  await page.route("**/api/workspaces/f1", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WORKSPACE) })
  )
  await page.route("**/api/workspaces/f1/design", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ design: current }) })
  )
  await page.route("**/api/products/p1/apis", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ apis: APIS }) })
  )
  await page.route("**/api/products/p1/db-tables", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ dbTables: DB_TABLES }) })
  )
  await page.route("**/api/workspaces/f1/suggestions", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ suggestions: [] }) })
  )
}

async function openEditor(page: Page): Promise<void> {
  await seedSession(page)
  await mockEditorApis(page)
  await page.goto("/editor/f1")
  await expect(page.getByText("Storyboard")).toBeVisible()
}

test.describe("뷰 전환 세로 레일 + 개수/카피 정리 (ASM-078)", () => {
  test("세로 레일로 4뷰 전환 + 활성 표시(aria-pressed)", async ({ page }) => {
    await openEditor(page)

    const rail = page.getByRole("group", { name: "명세 보기" })
    await expect(rail).toBeVisible()

    // 가로 Segmented가 아니라 아이콘 버튼 4개(aria-label로 식별).
    await expect(rail.getByRole("button", { name: "디렉토리" })).toBeVisible()
    await expect(rail.getByRole("button", { name: "테이블" })).toBeVisible()
    await expect(rail.getByRole("button", { name: "카드" })).toBeVisible()
    await expect(rail.getByRole("button", { name: "노드" })).toBeVisible()

    // 기본 = 디렉토리(dir) 활성.
    await expect(rail.getByRole("button", { name: "디렉토리" })).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByRole("main").getByText("기능 / 상세 기능")).toBeVisible()

    // 테이블 전환 — 활성 이동 + 표 헤더.
    await rail.getByRole("button", { name: "테이블" }).click()
    await expect(rail.getByRole("button", { name: "테이블" })).toHaveAttribute("aria-pressed", "true")
    await expect(rail.getByRole("button", { name: "디렉토리" })).toHaveAttribute("aria-pressed", "false")
    await expect(page.getByRole("columnheader", { name: "기능명" })).toBeVisible()

    // 카드 전환 — 활성 이동 + 카드 그리드(표 헤더 사라짐).
    await rail.getByRole("button", { name: "카드" }).click()
    await expect(rail.getByRole("button", { name: "카드" })).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByRole("columnheader", { name: "기능명" })).toHaveCount(0)
    await expect(page.getByRole("main").getByRole("button", { name: /로그인 기능/ })).toBeVisible()

    // 노드 전환 — 활성 이동 + PRD 루트.
    await rail.getByRole("button", { name: "노드" }).click()
    await expect(rail.getByRole("button", { name: "노드" })).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByRole("main").getByText("PRD")).toBeVisible()
  })

  test("좌측 메뉴에 개수 숫자를 노출하지 않는다(라벨만)", async ({ page }) => {
    await openEditor(page)

    const rail = page.getByRole("complementary")
    // Storyboard 행 — 라벨만, 숫자 없음(features=2여도 '기능 명세서'만). aria-label도 개수 없이 라벨과 동일.
    await expect(rail.getByRole("button", { name: "기능 명세서", exact: true })).toHaveText("기능 명세서")
    await expect(rail.getByRole("button", { name: "Product Requirement", exact: true })).toHaveText("Product Requirement")
    // 코드 진실 행 — DB(테이블 2개)·API(엔드포인트 3개)여도 숫자 없음.
    await expect(rail.getByRole("button", { name: "DB", exact: true })).toHaveText("DB")
    await expect(rail.getByRole("button", { name: "API", exact: true })).toHaveText("API")
  })

  test("Product Requirement 카피가 새 문구로 노출된다", async ({ page }) => {
    await openEditor(page)

    const rail = page.getByRole("complementary")
    await rail.getByRole("button", { name: /Product Requirement/ }).click()

    // 헤더 힌트 — '붙는지 보여드려요' 폐기, 새 문구.
    await expect(page.getByText("요구사항과 그에 딸린 기능을 함께 봐요")).toBeVisible()
    await expect(page.getByText("요구사항마다 어떤 기능이 붙는지 보여드려요")).toHaveCount(0)
  })
})
