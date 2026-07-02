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

// 요청 body를 기록해 "입력 1회 → 그 아이디어로 생성"을 와이어 레벨에서 검증한다.
type CapturedBodies = { productName?: unknown; fileIdea?: unknown }

// 프로젝트 목록은 생성 전 0개 → POST 후 1개로 바뀌는 상태ful 모킹(reloadProjects 재조회 반영).
async function mockOnboardingApis(page: Page, filesStatus: number): Promise<CapturedBodies> {
  const captured: CapturedBodies = {}
  // 미모킹 API는 전부 차단(가장 먼저 등록 = 가장 나중에 매칭) — 실 Supabase로 새지 않게.
  await page.route("**/api/**", (route) => route.abort())
  const created: (typeof PRODUCT)[] = []
  await page.route("**/api/products", (route) => {
    if (route.request().method() === "POST") {
      captured.productName = (route.request().postDataJSON() as { name?: unknown }).name
      created.push(PRODUCT)
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(PRODUCT) })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ products: created }),
    })
  })
  // 쿼리는 * 로 느슨하게 — 파라미터가 늘어도 실 API로 새지 않는다(경로 세그먼트는 * 가 안 넘음).
  await page.route("**/api/workspaces*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ workspaces: [] }) })
  )
  await page.route("**/api/products/p1/files", (route) => {
    captured.fileIdea = (route.request().postDataJSON() as { idea?: unknown }).idea
    return route.fulfill({
      status: filesStatus,
      contentType: "application/json",
      body: JSON.stringify(filesStatus === 201 ? { file: FILE } : { error: "rate_limited" }),
    })
  })
  return captured
}

test.describe("온보딩 경로 C", () => {
  test("프로젝트 0 → 아이디어 → 만들기 모달 → 생성 → 에디터 도달", async ({ page }) => {
    await seedSession(page)
    const captured = await mockOnboardingApis(page, 201)
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
    // 에디터 검증은 URL 깊이까지 — 에디터 데이터는 차단돼 에러 상태로 렌더(에디터 e2e 범위).
    await dialog.getByPlaceholder("예: 산책 메이트 앱").fill(PRODUCT.name)
    await dialog.getByRole("button", { name: "만들기" }).click()
    await expect(page).toHaveURL(/\/editor\/f1/)

    // 와이어 검증 — 정확히 그 이름·그 아이디어로 API가 호출됐다.
    expect(captured.productName).toBe(PRODUCT.name)
    expect(captured.fileIdea).toBe(IDEA)
  })

  test("생성 429(rate limit) → 재시도 안내 토스트 + 아이디어 보존", async ({ page }) => {
    await seedSession(page)
    await mockOnboardingApis(page, 429)
    await page.goto("/")

    // placeholder는 선택 상태에 따라 바뀌므로 textarea 자체를 잡는다(대시보드에 textarea는 컴포저 1개).
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
    // 새 프로젝트가 "선택된" 상태(컴포저 힌트로 확인) + 보내기 활성 = 원클릭 재시도.
    await expect(page.getByText(`${PRODUCT.name} 기준`)).toBeVisible()
    await expect(page.getByRole("button", { name: "만들기", exact: true })).toBeEnabled()
  })
})
