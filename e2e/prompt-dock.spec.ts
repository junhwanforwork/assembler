import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// 프롬프트 좌측 도킹 패널(ASM-076) — 하단 챗 도크를 좌측 세로 패널로 이주.
// 검증: ① 좌측 노출(항상 열림) ② 우측 그립 드래그로 폭 리사이즈 ③ 테이블 클릭 시 상세 플로팅 창 오픈(우패널 부재·ASM-080).
// AI/DB 실호출 0: workspace·design·apis·db-tables·suggestions 전부 page.route 모킹.

const WORKSPACE = { id: "f1", productId: "p1", name: "산책 메이트 스펙", isMain: true }

const DESIGN = {
  requirements: [
    {
      id: "req-1",
      title: "산책 기록",
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

const DB_TABLES = [
  {
    id: "tbl-1",
    productId: "p1",
    name: "walks",
    description: "산책 기록 테이블",
    columns: [
      { name: "id", type: "uuid", isPrimaryKey: true, isForeignKey: false },
      { name: "user_id", type: "uuid", isPrimaryKey: false, isForeignKey: true },
    ],
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
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ apis: [] }) })
  )
  await page.route("**/api/products/p1/db-tables", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ dbTables: DB_TABLES }) })
  )
  await page.route("**/api/workspaces/f1/suggestions", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ suggestions: [] }) })
  )
}

test.describe("프롬프트 좌측 도킹 패널 (ASM-076)", () => {
  test("프롬프트 패널이 좌측에 항상 노출되고 챗 입력이 담겨 있다", async ({ page }) => {
    await seedSession(page)
    await mockEditorApis(page)
    await page.goto("/editor/f1")
    await expect(page.getByRole("complementary", { name: "AI 프롬프트" })).toBeVisible()

    const panel = page.getByRole("complementary", { name: "AI 프롬프트" })
    await expect(panel).toBeVisible()
    // 챗 입력이 패널 안에 있다(하단 도크가 아니라 좌측 패널로 이주).
    await expect(panel.getByLabel("AI 챗 입력")).toBeVisible()

    // 좌측 도킹 — 맨 왼쪽 엣지는 아이콘 레일(48px)이고, 프롬프트는 그 바로 오른쪽에 붙는다.
    const box = await panel.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(44)
    expect(box!.x).toBeLessThan(56)
  })

  test("우측 그립을 끌면 패널 폭이 넓어진다(280~400 리사이즈)", async ({ page }) => {
    await seedSession(page)
    await mockEditorApis(page)
    await page.goto("/editor/f1")
    await expect(page.getByRole("complementary", { name: "AI 프롬프트" })).toBeVisible()

    const panel = page.getByRole("complementary", { name: "AI 프롬프트" })
    const before = (await panel.boundingBox())!.width

    const grip = page.getByLabel("프롬프트 패널 폭 조절")
    const gb = (await grip.boundingBox())!
    await page.mouse.move(gb.x + gb.width / 2, gb.y + 120)
    await page.mouse.down()
    // 여러 단계로 끌어 pointermove가 확실히 발생하게 한다.
    await page.mouse.move(gb.x + gb.width / 2 + 30, gb.y + 120, { steps: 8 })
    await page.mouse.move(gb.x + gb.width / 2 + 70, gb.y + 120, { steps: 8 })
    await page.mouse.up()

    // 폭 변경은 CSS 변수→그리드 리플로우라 비동기 — poll로 반영을 기다린다.
    await expect.poll(async () => (await panel.boundingBox())!.width).toBeGreaterThan(before)
    // clamp 상한(400) 안.
    expect((await panel.boundingBox())!.width).toBeLessThanOrEqual(401)
  })

  test("테이블 클릭 시 상세 플로팅 창이 열려 테이블 인스펙터를 보여준다(우패널 부재·ASM-080)", async ({ page }) => {
    await seedSession(page)
    await mockEditorApis(page)
    await page.goto("/editor/f1")
    await expect(page.getByRole("complementary", { name: "AI 프롬프트" })).toBeVisible()

    // 상세 플로팅 창은 아직 안 떠 있고, 테이블 인스펙터 고유 문구도 안 보인다.
    await expect(page.getByRole("dialog", { name: "상세" })).toBeHidden()
    await expect(page.getByText("DB 테이블 · 코드에서 자동으로 와요")).toBeHidden()
    // 우패널(RightPanel)은 완전히 삭제됨 — 우패널 헤더의 "코멘트" 세그가 어디에도 없다.
    await expect(page.getByText("코멘트")).toHaveCount(0)

    // 좌 레일에서 DB(데이터) 뷰로 진입 → 테이블 노드 클릭.
    await page.getByRole("button", { name: "DB", exact: true }).click()
    await page.getByRole("button", { name: "walks 테이블 상세 보기" }).click()

    // 테이블 상세가 플로팅 창 안에서 열린다 — 상세 표면은 플로팅 하나로 통일.
    const dialog = page.getByRole("dialog", { name: "상세" })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText("DB 테이블 · 코드에서 자동으로 와요")).toBeVisible()
  })
})
