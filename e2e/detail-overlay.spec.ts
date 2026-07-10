import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// 명세 상세 플로팅 창 (SW2 · PRD §6 Floating Detail Panel · ASM-080) — 우패널(RightPanel)은 삭제됐고,
// 기능 상세(SpecInspector)를 떠 있는 창(OverlayPanel window)으로 여는 경로를 검증한다.
// AI/DB 실호출 0: workspace·design·apis·db-tables·suggestions 전부 page.route 모킹, 나머지 /api/** 는 abort.

const WORKSPACE = { id: "f1", productId: "p1", name: "산책 메이트 스펙", isMain: true }

// 요구사항 제목은 기능명과 확실히 구별한다("산책 기록 요구사항" vs "산책 기록하기") — 셀렉터 모호성 제거.
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
  // 미모킹 API 전부 차단 — 실 Supabase·Anthropic으로 새지 않게.
  await page.route("**/api/**", (route) => route.abort())
  await page.route("**/api/workspaces/f1", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WORKSPACE) })
  )
  await page.route("**/api/workspaces/f1/design", (route) => {
    // 상세는 표시(GET)만 — PATCH가 발사되면 카운터로 잡아 회귀를 드러낸다(AI/DB 실호출 0 원칙).
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

// 기능명세서(기본 뷰·디렉토리)에서 요구사항 → 기능 순으로 선택한다. 플로팅 창 안 동명 노출과
// 겹치지 않게 중앙(main)으로 스코프해 클릭한다.
async function selectFeature(page: Page): Promise<void> {
  const main = page.locator("main")
  await main.getByRole("button", { name: /산책 기록 요구사항/ }).click()
  await main.getByRole("button", { name: /산책 기록하기/ }).click()
}

test.describe("플로팅 상세 패널 (SW2)", () => {
  test("기능 선택 → 플로팅 창 자동 오픈(ASM-077) → 기능 상세(이름·설명·연결) 노출 → Esc로 닫힘", async ({ page }) => {
    await seedSession(page)
    const { counters } = await mockEditorApis(page)
    await page.goto("/editor/f1")
    await expect(page.getByText("Storyboard")).toBeVisible()

    await selectFeature(page)

    // ASM-077 — 선택만으로 자동 오픈(기본 꺼짐 → 아이템 클릭 시 뜬다). 명시 "상세 띄우기" 버튼을 누르지 않는다.
    const dialog = page.getByRole("dialog", { name: "상세" })
    await expect(dialog).toBeVisible()

    // 창 안에 기능 상세(SpecInspector) — 기능명·설명·연결된 요구사항이 그대로 렌더된다.
    await expect(dialog.getByText("산책 기록하기")).toBeVisible()
    await expect(dialog.getByText("산책 시작·종료를 기록해요")).toBeVisible()
    await expect(dialog.getByText("연결된 요구사항")).toBeVisible()
    await expect(dialog.getByText("산책 기록 요구사항")).toBeVisible()

    // 표시만 — 상세를 여닫는 동안 design PATCH(저장)는 한 번도 나가지 않는다.
    expect(counters.designPatch).toBe(0)

    // Esc 닫기(OverlayPanel 몫).
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
  })

  test("닫기 버튼(상세 닫기)으로 닫히고, TopBar '상세 띄우기'로 재오픈된다", async ({ page }) => {
    await seedSession(page)
    await mockEditorApis(page)
    await page.goto("/editor/f1")
    await expect(page.getByText("Storyboard")).toBeVisible()

    // 선택만으로 자동 오픈(ASM-077). 상세 표면은 플로팅 창 하나로 통일(ASM-080 — 명세·테이블 공용).
    await selectFeature(page)
    const dialog = page.getByRole("dialog", { name: "상세" })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText("산책 기록하기")).toBeVisible()

    // 창 안 "상세 닫기" 버튼으로 닫는다 — 닫으면 닫힌 채로(기본 꺼짐).
    await dialog.getByRole("button", { name: "상세 닫기" }).click()
    await expect(dialog).toBeHidden()

    // 닫힌 상태에서 TopBar "상세 띄우기"로 수동 재오픈도 된다(명시 버튼은 유지).
    await page.getByRole("button", { name: "상세 띄우기" }).click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText("산책 기록하기")).toBeVisible()
  })
})
