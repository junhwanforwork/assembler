import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// 기능 명세서 뷰 전환(SW2) — Segmented로 디렉토리/테이블/카드/노드 전환 + 각 뷰가 기능 렌더 +
// 기능 클릭 시 선택이 인스펙터(store)에 반영되는지 검증. AI/DB 실호출 0(모든 /api/** 차단 후 필요분만 모킹).

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
        pageIds: ["page-1", "page-2"],
        apiIds: ["api-1"],
        dbTableIds: ["db-1"],
        implStatus: "implemented",
        changeStatus: "changed",
        reviews: { planner: "checked", designer: "needs_discussion" },
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

async function mockEditorApis(page: Page): Promise<void> {
  const current = makeDesign()
  // AI/DB 실호출 0 — 미지정 /api/** 는 전부 차단, 필요한 경로만 결정적 응답.
  await page.route("**/api/**", (route) => route.abort())
  await page.route("**/api/workspaces/f1", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WORKSPACE) })
  )
  await page.route("**/api/workspaces/f1/design", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ design: current }) })
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

async function openEditor(page: Page): Promise<void> {
  await seedSession(page)
  await mockEditorApis(page)
  await page.goto("/editor/f1")
  await expect(page.getByText("Storyboard")).toBeVisible()
}

test.describe("기능 명세서 뷰 전환 (SW2)", () => {
  test("Segmented 4뷰 전환 — 디렉토리·테이블·카드·노드", async ({ page }) => {
    await openEditor(page)

    const seg = page.getByRole("group", { name: "명세 보기" })
    await expect(seg).toBeVisible()
    // 기본 = 디렉토리(dir). Segmented "디렉토리"가 눌린 상태 + 밀러 컬럼 헤더가 보인다.
    await expect(seg.getByRole("button", { name: "디렉토리" })).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByRole("main").getByText("기능 / 상세 기능")).toBeVisible()

    // 테이블 전환 — 표 컬럼 헤더 + 기능행 + SW1 상태 배지.
    await seg.getByRole("button", { name: "테이블" }).click()
    await expect(page.getByRole("columnheader", { name: "기능명" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "역할별 확인" })).toBeVisible()
    await expect(page.getByRole("main").getByRole("button", { name: "로그인 기능" })).toBeVisible()
    await expect(page.getByRole("main").getByText("구현됨")).toBeVisible()
    await expect(page.getByRole("main").getByText("변경됨")).toBeVisible()

    // 카드 전환 — 카드에 기능명 + 상태 노출.
    await seg.getByRole("button", { name: "카드" }).click()
    await expect(page.getByRole("columnheader", { name: "기능명" })).toHaveCount(0)
    await expect(page.getByRole("main").getByRole("button", { name: /로그인 기능/ })).toBeVisible()
    await expect(page.getByRole("main").getByRole("button", { name: /회원가입 기능/ })).toBeVisible()

    // 노드 전환 — PRD 루트 + 기능 노드 렌더.
    await seg.getByRole("button", { name: "노드" }).click()
    await expect(page.getByRole("main").getByText("PRD")).toBeVisible()
    await expect(page.getByRole("main").getByRole("button", { name: "로그인 기능" })).toBeVisible()
  })

  test("테이블에서 기능 클릭 → 인스펙터가 선택 기능을 비춘다", async ({ page }) => {
    await openEditor(page)

    await page.getByRole("group", { name: "명세 보기" }).getByRole("button", { name: "테이블" }).click()
    await page.getByRole("main").getByRole("button", { name: "회원가입 기능" }).click()

    // 상세 플로팅 창 FeaturePanel — 선택 기능명 + 상세 기능 섹션.
    await expect(page.getByRole("dialog", { name: "상세" }).getByText("회원가입 기능")).toBeVisible()
    await expect(page.getByRole("dialog", { name: "상세" }).getByRole("heading", { name: /상세 기능/ })).toBeVisible()
  })

  test("카드에서 기능 클릭 → 인스펙터가 선택 기능을 비춘다", async ({ page }) => {
    await openEditor(page)

    await page.getByRole("group", { name: "명세 보기" }).getByRole("button", { name: "카드" }).click()
    await page.getByRole("main").getByRole("button", { name: /로그인 기능/ }).click()

    await expect(page.getByRole("dialog", { name: "상세" }).getByText("로그인 기능")).toBeVisible()
    await expect(page.getByRole("dialog", { name: "상세" }).getByRole("heading", { name: /상세 기능/ })).toBeVisible()
  })

  test("빈 연결 값은 표에서 — 로 표시(회원가입: 페이지·API·DB 0)", async ({ page }) => {
    await openEditor(page)

    await page.getByRole("group", { name: "명세 보기" }).getByRole("button", { name: "테이블" }).click()
    // 회원가입 기능 행 — 미설정 연결·상태는 대시.
    const row = page.getByRole("row").filter({ hasText: "회원가입 기능" })
    await expect(row.getByText("—")).not.toHaveCount(0)
  })
})
