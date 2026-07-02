import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// 온보딩 경로 C (ASM-014) — 프로젝트 0 → 아이디어 → 만들기 모달 → 생성 → 파일 → 에디터.
// AI 호출 0 원칙: 모든 API는 page.route 모킹. DoD = 입력 1회 + 이름 1회로 /editor 도달.

const IDEA = "산책 기록을 지도에 남기는 앱"
const PRODUCT = { id: "p1", name: "산책 메이트", description: "" }
const FILE = {
  id: "f1",
  productId: "p1",
  name: IDEA,
  isMain: false,
  counts: { requirements: 1, features: 2, pages: 3, flows: 1, wireframes: 0, elements: 0 },
}

// 프로젝트 목록은 생성 전 0개 → POST 후 1개로 바뀌는 상태ful 모킹(reloadProjects 재조회 반영).
async function mockOnboardingApis(page: Page, filesStatus: number) {
  const created: (typeof PRODUCT)[] = []
  await page.route("**/api/products", (route) => {
    if (route.request().method() === "POST") {
      created.push(PRODUCT)
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(PRODUCT) })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ products: created }),
    })
  })
  await page.route("**/api/workspaces?productId=p1", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ workspaces: [] }) })
  )
  await page.route("**/api/products/p1/files", (route) =>
    route.fulfill({
      status: filesStatus,
      contentType: "application/json",
      body: JSON.stringify(filesStatus === 201 ? { file: FILE } : { error: "rate_limited" }),
    })
  )
}

test.describe("온보딩 경로 C", () => {
  test("프로젝트 0 → 아이디어 → 만들기 모달 → 생성 → 에디터 도달", async ({ page }) => {
    await seedSession(page)
    await mockOnboardingApis(page, 201)
    await page.goto("/")

    // 프로젝트가 없어도 컴포저는 잠기지 않는다 — 빈 상태도 행동 안내.
    const composer = page.getByPlaceholder("만들고 싶은 제품이나 기능 아이디어를 적어보세요…")
    await expect(composer).toBeEnabled()
    await expect(page.getByText("위에 아이디어를 적으면 첫 파일을 만들어 드려요.")).toBeVisible()

    // 입력 1회 → 제출 → 만들기 모달(아이디어 미리보기로 보존 확인).
    await composer.fill(IDEA)
    await page.getByRole("button", { name: "만들기", exact: true }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("프로젝트 만들기")).toBeVisible()
    await expect(dialog.getByText(IDEA)).toBeVisible()

    // 이름 1회 → 만들기 → 파일 생성 → 에디터 도달(DoD).
    await dialog.getByPlaceholder("예: 산책 메이트 앱").fill(PRODUCT.name)
    await dialog.getByRole("button", { name: "만들기" }).click()
    await expect(page).toHaveURL(/\/editor\/f1/)
  })

  test("생성 429(rate limit) → 재시도 안내 토스트 + 아이디어 보존", async ({ page }) => {
    await seedSession(page)
    await mockOnboardingApis(page, 429)
    await page.goto("/")

    // placeholder는 선택 상태에 따라 바뀌므로 textarea 자체를 잡는다.
    const composer = page.locator("textarea")
    await composer.fill(IDEA)
    await page.getByRole("button", { name: "만들기", exact: true }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByPlaceholder("예: 산책 메이트 앱").fill(PRODUCT.name)
    await dialog.getByRole("button", { name: "만들기" }).click()

    // 429 → 해요체 재시도 안내, 에디터로 가지 않고 아이디어는 그대로 남는다.
    await expect(page.getByText("요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.")).toBeVisible()
    await expect(page).toHaveURL("/")
    await expect(composer).toHaveValue(IDEA)
    // 새 프로젝트는 선택돼 있어 한 번 더 누르면 바로 재시도된다.
    await expect(page.getByRole("button", { name: PRODUCT.name })).toBeVisible()
  })
})
