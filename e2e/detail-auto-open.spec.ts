import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// ASM-077 — 선택 시 상세 플로팅 자동 오픈(기본 꺼짐). 창업자 지시("정보는 기본 꺼짐, 아이템 클릭 시 플로팅으로 뜬다").
// 검증: 로드 시 창 안 뜸 → 아이템 클릭 시 자동 오픈("상세 띄우기" 버튼 없이) → 내용 노출 → Esc 닫힘.
// AI/DB 실호출 0: 필요한 GET만 page.route 모킹, 나머지 /api/** 는 abort. design PATCH가 나가면 카운터로 회귀를 드러낸다.

const WORKSPACE = { id: "f1", productId: "p1", name: "산책 메이트 스펙", isMain: true }

// 요구사항 제목은 기능명과 확실히 구별한다("산책 기록 요구사항" vs "산책 기록하기") — 셀렉터 모호성 제거.
// req-1은 SpecView가 로드 때 자동 보정(syncSpecSelection)하는 첫 항목 — 그래도 창은 안 떠야 한다(비클릭 경로).
// req-2는 자동 보정 대상이 아니므로 "요구사항 클릭만으로 자동 오픈"을 깔끔히 검증한다.
const DESIGN = {
  requirements: [
    {
      id: "req-1",
      title: "산책 기록 요구사항",
      description: "사용자는 산책을 기록할 수 있다",
      status: "draft",
      priority: "high",
      role: "회원",
      acceptanceCriteria: [],
    },
    {
      id: "req-2",
      title: "알림 요구사항",
      description: "사용자는 알림을 받을 수 있다",
      status: "draft",
      priority: "medium",
      role: "회원",
      acceptanceCriteria: [],
    },
  ],
  features: [
    {
      id: "feat-1",
      name: "산책 기록하기",
      description: "산책 시작·종료를 기록해요",
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

async function mockEditorApis(page: Page): Promise<{ counters: { designPatch: number } }> {
  const counters = { designPatch: 0 }
  // 미모킹 API 전부 차단 — 실 Supabase·Anthropic으로 새지 않게(AI/DB 실호출 0).
  await page.route("**/api/**", (route) => route.abort())
  await page.route("**/api/workspaces/f1", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WORKSPACE) })
  )
  await page.route("**/api/workspaces/f1/design", (route) => {
    if (route.request().method() === "PATCH") counters.designPatch += 1
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ design: DESIGN }) })
  })
  await page.route("**/api/products/p1/apis", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ apis: [] }) })
  )
  await page.route("**/api/products/p1/db-tables", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ dbTables: [] }) })
  )
  await page.route("**/api/workspaces/f1/suggestions", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ suggestions: [] }) })
  )
  return { counters }
}

test.describe("상세 플로팅 자동 오픈 (ASM-077 · 기본 꺼짐)", () => {
  test("로드 시 창은 꺼져 있고, 기능 클릭 시 자동으로 떠 내용을 노출한다 → Esc로 닫힌다 (AI/DB 실호출 0)", async ({ page }) => {
    await seedSession(page)
    const { counters } = await mockEditorApis(page)
    await page.goto("/editor/f1")
    await expect(page.getByRole("complementary", { name: "AI 프롬프트" })).toBeVisible()

    // 기본 꺼짐 — 아직 클릭 전. SpecView가 로드 때 첫 요구사항을 자동 보정(syncSpecSelection)하지만 창은 뜨지 않는다.
    await expect(page.getByRole("dialog", { name: "상세" })).toBeHidden()

    // 아이템 클릭 → 자동 오픈. "상세 띄우기" 버튼을 누르지 않는다.
    const main = page.locator("main")
    await main.getByRole("button", { name: /산책 기록 요구사항/ }).click()
    await main.getByRole("button", { name: /산책 기록하기/ }).click()

    const dialog = page.getByRole("dialog", { name: "상세" })
    await expect(dialog).toBeVisible()

    // 내용 노출 — 기능명·설명·연결된 요구사항 섹션 + "트리에서 열기" 어포던스(거짓 버튼 아님).
    await expect(dialog.getByText("산책 기록하기")).toBeVisible()
    await expect(dialog.getByText("산책 시작·종료를 기록해요")).toBeVisible()
    await expect(dialog.getByText("연결된 요구사항")).toBeVisible()
    await expect(dialog.getByRole("button", { name: "트리에서 열기" })).toBeVisible()

    // AI/DB 실호출 0 — 여닫는 동안 design PATCH(저장)는 한 번도 나가지 않는다.
    expect(counters.designPatch).toBe(0)

    // Esc 닫힘(OverlayPanel 몫).
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
  })

  test("자동 보정 대상이 아닌 요구사항을 클릭만 해도 자동으로 뜬다", async ({ page }) => {
    await seedSession(page)
    await mockEditorApis(page)
    await page.goto("/editor/f1")
    await expect(page.getByRole("complementary", { name: "AI 프롬프트" })).toBeVisible()

    // 로드 직후 기본 꺼짐 확인.
    await expect(page.getByRole("dialog", { name: "상세" })).toBeHidden()

    // req-2(첫 항목 아님)를 클릭 → 최심 선택이 새 값으로 바뀌며 자동 오픈.
    const main = page.locator("main")
    await main.getByRole("button", { name: /알림 요구사항/ }).click()

    const dialog = page.getByRole("dialog", { name: "상세" })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText("알림 요구사항")).toBeVisible()
  })
})
