import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// 내보내기 — 구현 컨텍스트 모달(ASM-030, #64+#34).
// 진입점 2곳(TopBar=프리셀렉트 없음 / 벌크바=체크 요구사항 연결 기능 프리셀렉트)과
// 패키징 계약(재사용/신규 구분·플로우 경로·복사)을 UI 레벨에서 고정한다. AI 호출 0 — 전부 모킹.

const WORKSPACE = { id: "f1", productId: "p1", name: "산책 메이트 스펙", isMain: true }

const DESIGN = {
  requirements: [
    {
      id: "req-1",
      title: "산책 기록",
      description: "사용자는 산책을 기록할 수 있다",
      status: "approved",
      priority: "high",
      role: "회원",
      acceptanceCriteria: ["산책 시작을 누를 수 있다"],
    },
    {
      id: "req-2",
      title: "산책 공유",
      description: "",
      status: "draft",
      priority: "low",
      role: "",
      acceptanceCriteria: [],
    },
  ],
  features: [
    {
      id: "feat-1",
      name: "산책 기록 화면",
      description: "기록 시작·종료",
      detailFeatures: [{ id: "df-1", title: "경로 저장", description: "" }],
      requirementIds: ["req-1"],
      pageIds: ["page-1"],
      apiIds: ["api-1", "api-2"],
    },
  ],
  pages: [
    { id: "page-1", name: "산책 홈", description: "", wireframeId: "wf-1" },
    { id: "page-2", name: "산책 상세", description: "", wireframeId: null },
  ],
  flows: [
    {
      id: "flow-1",
      name: "기록 플로우",
      edges: [{ id: "e-1", fromPageId: "page-1", toPageId: "page-2", trigger: "기록 종료 시" }],
    },
  ],
  wireframes: [{ id: "wf-1", elementIds: ["el-1"] }],
  elements: [
    {
      id: "el-1",
      label: "기록 시작 버튼",
      type: "button",
      action: "Click",
      states: [],
      result: "산책 상세로 이동",
      apiIds: ["api-1"],
      dbTableIds: ["db-1"],
    },
  ],
}

const APIS = [
  { id: "api-1", productId: "p1", method: "GET", endpoint: "/walks", summary: "산책 목록", status: "active", source: "code" },
  { id: "api-2", productId: "p1", method: "POST", endpoint: "/walks", summary: "산책 저장", status: "planned", source: "code" },
]

const DB_TABLES = [
  {
    id: "db-1",
    productId: "p1",
    name: "walks",
    description: "산책 기록",
    columns: [{ name: "id", type: "uuid", nullable: false, isPrimaryKey: true }],
    source: "code",
  },
]

async function mockEditorApis(page: Page): Promise<void> {
  await page.route("**/api/**", (route) => route.abort())
  await page.route("**/api/workspaces/f1", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WORKSPACE) })
  )
  await page.route("**/api/workspaces/f1/design", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ design: DESIGN }) })
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
  await expect(page.getByText("제품 구조")).toBeVisible()
}

test.use({ permissions: ["clipboard-read", "clipboard-write"] })

test.describe("내보내기 모달 (ASM-030)", () => {
  test("TopBar 진입 — 선택 → 미리보기(재사용/신규·플로우·수용기준) → 복사", async ({ page }) => {
    await openEditor(page)

    // 상단바 내보내기(#9 해제) — 프리셀렉트 없음: 안내 카피 + 액션 비활성(사유 헬퍼).
    await page.getByRole("banner").getByRole("button", { name: "내보내기" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("기능을 선택하면 미리보기가 나와요.")).toBeVisible()
    await expect(dialog.getByRole("button", { name: "복사하기" })).toBeDisabled()
    await expect(dialog.getByText("내보낼 기능을 선택해 주세요.")).toBeVisible()

    // Post-MVP 방향 제시 — Confluence·Figma는 "곧" 비활성.
    await expect(dialog.getByRole("button", { name: "Confluence" })).toHaveAttribute("aria-disabled", "true")
    await expect(dialog.getByRole("button", { name: "Figma" })).toHaveAttribute("aria-disabled", "true")

    // 기능 선택 → 패키징 계약이 미리보기에 나타난다.
    await dialog.getByLabel("산책 기록 화면").check()
    const preview = dialog.locator("pre")
    await expect(preview).toContainText("# 구현 컨텍스트 — 산책 메이트 스펙")
    await expect(preview).toContainText("산책 시작을 누를 수 있다")
    await expect(preview).toContainText("산책 홈 → 산책 상세 — 기록 종료 시")
    await expect(preview).toContainText("GET /walks")
    await expect(preview).toContainText("POST /walks")
    await expect(preview).toContainText("신규")
    await expect(preview).toContainText("walks")

    // 복사 — 클립보드에 프롬프트 전문이 실린다.
    await dialog.getByRole("button", { name: "복사하기" }).click()
    await expect(dialog.getByText("복사했어요")).toBeVisible()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toContain("# 구현 컨텍스트 — 산책 메이트 스펙")
    expect(copied).toContain("지어내지 말 것")
  })

  test("벌크바 진입(#34) — 체크된 요구사항의 연결 기능이 프리셀렉트된다", async ({ page }) => {
    await openEditor(page)

    // req-1 체크 → 벌크바 → 내보내기.
    await page.getByLabel("산책 기록 선택").check()
    await page.getByRole("main").getByRole("button", { name: "내보내기" }).click()

    // feat-1(연결 기능)이 이미 선택돼 미리보기가 바로 나온다.
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByLabel("산책 기록 화면")).toBeChecked()
    await expect(dialog.locator("pre")).toContainText("산책 기록 화면")

    // 해제하면 미리보기 대신 안내 — 빈 선택으로는 내보낼 수 없다.
    await dialog.getByLabel("산책 기록 화면").uncheck()
    await expect(dialog.getByText("기능을 선택하면 미리보기가 나와요.")).toBeVisible()
    await expect(dialog.getByRole("button", { name: ".md로 받기" })).toBeDisabled()
  })
})
