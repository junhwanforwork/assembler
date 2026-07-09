import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// Product Requirement 리스트 (SW2) — Storyboard의 요구사항 리스트 뷰 배선 검증.
// "어떤 요구사항을 위해 → 이런 기능들을" 이해시키고, 기능 클릭 시 기능 명세서로 점프한다.
// AI 호출 0 원칙: workspace·design·apis·db-tables·suggestions·note 전부 page.route 모킹(실 opus 호출 금지).

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
      acceptanceCriteria: ["시작·종료 시각을 남길 수 있다"],
    },
    {
      id: "req-2",
      title: "산책 통계",
      description: "사용자는 주간 통계를 볼 수 있다",
      status: "draft",
      priority: "medium",
      role: "회원",
      acceptanceCriteria: [],
    },
  ],
  features: [
    {
      id: "feat-1",
      name: "산책 기록 화면",
      description: "기록 시작·종료",
      detailFeatures: [{ id: "d1", title: "시작 버튼", description: "기록을 시작해요" }],
      requirementIds: ["req-1"],
      pageIds: [],
      apiIds: ["api-1"],
      dbTableIds: ["t1"],
    },
    {
      id: "feat-2",
      name: "주간 통계 카드",
      description: "이번 주 산책 합계",
      detailFeatures: [],
      requirementIds: ["req-2"],
      pageIds: [],
      apiIds: [],
    },
  ],
  pages: [],
  flows: [],
  wireframes: [],
  elements: [],
}

const EMPTY_DESIGN = {
  requirements: [],
  features: [],
  pages: [],
  flows: [],
  wireframes: [],
  elements: [],
}

async function mockEditorApis(page: Page, design: unknown): Promise<void> {
  await page.route("**/api/**", (route) => route.abort())
  await page.route("**/api/workspaces/f1", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WORKSPACE) })
  )
  await page.route("**/api/workspaces/f1/design", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ design }) })
  )
  await page.route("**/api/products/p1/apis", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ apis: [] }) })
  )
  await page.route("**/api/products/p1/db-tables", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ dbTables: [] }) })
  )
  await page.route("**/api/workspaces/f1/suggestions", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ suggestions: [] }) })
  )
}

test.describe("Product Requirement 리스트 (SW2)", () => {
  test("Storyboard 진입 → 요구사항 리스트 → 세부 기능 펼침 → 기능 클릭 시 기능 명세서로 점프", async ({ page }) => {
    await seedSession(page)
    await mockEditorApis(page, DESIGN)
    await page.goto("/editor/f1")
    await expect(page.getByText("Storyboard")).toBeVisible()

    // 좌 레일 Storyboard 최상단 — Product Requirement 행(요구사항이 상위)으로 진입.
    const rail = page.getByRole("complementary")
    await rail.getByRole("button", { name: /Product Requirement/ }).click()

    // PR 뷰 렌더 — 뷰 제목(중앙 헤더 span) + 요구사항 제목(h2)·상태 pill.
    await expect(page.getByRole("main").getByText("Product Requirement")).toBeVisible()
    await expect(page.getByRole("heading", { name: "산책 기록", exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "산책 통계", exact: true })).toBeVisible()

    // 각 요구사항 아래 세부 기능이 펼쳐져 보인다("어떤 요구사항 → 이런 기능들"). 중앙 뷰로 스코프
    // (우패널 인스펙터에도 동명 기능 카드가 있어 main 한정).
    const main = page.getByRole("main")
    await expect(main.getByRole("button", { name: /산책 기록 화면/ })).toBeVisible()
    await expect(main.getByRole("button", { name: /주간 통계 카드/ })).toBeVisible()

    // 기능 클릭 → 기능 명세서(SpecView)로 점프.
    await main.getByRole("button", { name: /산책 기록 화면/ }).click()
    await expect(page.getByRole("main").getByText("기능 명세서")).toBeVisible()
  })

  test("빈 상태 — 요구사항이 없으면 Composer 안내를 정직하게 보여준다", async ({ page }) => {
    await seedSession(page)
    await mockEditorApis(page, EMPTY_DESIGN)
    await page.goto("/editor/f1")
    await expect(page.getByText("Storyboard")).toBeVisible()

    const rail = page.getByRole("complementary")
    await rail.getByRole("button", { name: /Product Requirement/ }).click()

    await expect(page.getByText("아직 요구사항이 없어요. Composer로 만들어 보세요.")).toBeVisible()
  })

  test("좌 레일 그룹명 정리 — '문서·md' → '문서'(문서 family는 그대로 유지)", async ({ page }) => {
    await seedSession(page)
    await mockEditorApis(page, DESIGN)
    await page.goto("/editor/f1")
    await expect(page.getByText("Storyboard")).toBeVisible()

    const rail = page.getByRole("complementary")
    // 옛 그룹명은 사라지고, 문서 family(PRD/기술 명세/데이터 사전)는 그대로 남는다.
    await expect(rail.getByText("문서·md")).toHaveCount(0)
    await expect(rail.getByRole("button", { name: "PRD", exact: true })).toBeVisible()
    await expect(rail.getByRole("button", { name: "기술 명세", exact: true })).toBeVisible()
    await expect(rail.getByRole("button", { name: "데이터 사전", exact: true })).toBeVisible()
  })
})
