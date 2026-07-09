import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// 문서 패밀리 (ASM-054) — 문서 종류 전환(PRD → 기술 명세 → 데이터 사전) 배선 검증.
// AI 호출 0 원칙: workspace·design·apis·db-tables·note 전부 page.route 모킹.

const WORKSPACE = { id: "f1", productId: "p1", name: "산책 메이트 스펙", isMain: true }

// TOC 점프 검증용 추가 요구사항(ASM-065 재하달 ①) — 오버레이 창(72vh)·중앙 뷰 양쪽에서
// 마지막 섹션이 초기 화면 밖에 있어야 "점프가 어느 인스턴스를 움직였나"를 판정할 수 있다.
const EXTRA_REQS = Array.from({ length: 7 }, (_, i) => ({
  id: `req-x${i + 1}`,
  title: `산책 부가 요구 ${i + 1}`,
  description: "오버레이 TOC 점프 검증용 섹션이에요. 본문 높이를 확보해요.",
  status: "draft",
  priority: "high",
  role: "회원",
  acceptanceCriteria: ["기준 하나", "기준 둘", "기준 셋"],
}))

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
    ...EXTRA_REQS,
  ],
  features: [
    {
      id: "feat-1",
      name: "산책 기록 화면",
      description: "기록 시작·종료",
      detailFeatures: [],
      requirementIds: ["req-1"],
      pageIds: [],
      apiIds: ["api-1"],
      // 레인 1이 병행 신설 중인 필드 — 투사는 옵셔널로 읽는다(ASM-054 계약).
      dbTableIds: ["t1"],
    },
  ],
  pages: [],
  flows: [],
  wireframes: [],
  elements: [],
}

const APIS = [
  {
    id: "api-1",
    productId: "p1",
    method: "POST",
    endpoint: "/api/walks",
    summary: "산책 기록 저장",
    status: "active",
    source: "code",
  },
]

const DB_TABLES = [
  {
    id: "t1",
    productId: "p1",
    name: "walks",
    description: "산책 기록",
    columns: [
      { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
      { name: "user_id", type: "uuid", nullable: false, isPrimaryKey: false, references: "users.id" },
    ],
    source: "code",
  },
]

const NOTE = {
  id: "n1",
  dbTableId: "t1",
  productId: "p1",
  explanation: "산책 한 번이 한 줄로 저장돼요",
  // 구조화 해석(ASM-057) — 서버가 봉투를 디코드해 내려주는 계약 그대로 모킹.
  pros: ["산책 기록이 한 곳에 모여요"],
  cons: ["산책 코스 정보는 따로 없어요"],
  grounded: true,
  isUserEdited: false,
  generatedAt: "2026-07-01T00:00:00Z",
}

// noteGet 카운터 — 문서 종류 전환 왕복에서 노트 GET 재발사가 없는지(ASM-056 ⑦ 캐시) 판정용.
async function mockDocApis(page: Page): Promise<{ counters: { noteGet: number } }> {
  const counters = { noteGet: 0 }
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
  await page.route("**/api/workspaces/f1/db-tables/t1/note", (route) => {
    counters.noteGet += 1
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ note: NOTE }) })
  })
  return { counters }
}

test.describe("문서 패밀리 (ASM-054·ASM-065)", () => {
  test("좌 레일 하위행 — PRD → 기술 명세(API·테이블) → 데이터 사전(AI 해석 인라인)", async ({ page }) => {
    await seedSession(page)
    const { counters } = await mockDocApis(page)
    await page.goto("/editor/f1")
    await expect(page.getByText("제품 구조")).toBeVisible()

    // 좌 레일(ASM-065) — "문서" 행 아래 하위 3행이 상시 펼침. 중앙 Segmented와 이름이 겹치므로 aside로 스코프.
    const rail = page.getByRole("complementary")
    await rail.getByRole("button", { name: "PRD", exact: true }).click()
    await expect(page.getByRole("group", { name: "문서 종류" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "산책 기록", exact: true })).toBeVisible()

    // 기술 명세 — 기능 단위 섹션에 연결 API(메서드·엔드포인트)와 연결 테이블이 나온다.
    await rail.getByRole("button", { name: "기술 명세", exact: true }).click()
    await expect(page.getByRole("heading", { name: "산책 기록 화면" })).toBeVisible()
    await expect(page.getByText("/api/walks")).toBeVisible()
    await expect(page.getByText("연결 DB 테이블")).toBeVisible()
    await expect(page.getByText("walks", { exact: true })).toBeVisible()

    // 데이터 사전 — 테이블 단위 + 저장된 AI 해석 노트가 인라인으로 붙는다("AI 추정" 표시 유지).
    await rail.getByRole("button", { name: "데이터 사전", exact: true }).click()
    await expect(page.getByRole("heading", { name: "walks" })).toBeVisible()
    await expect(page.getByText("user_id 테이블의", { exact: false }).or(page.getByText("users 테이블을 가리켜요", { exact: false }))).toBeVisible()
    await expect(page.getByText("산책 한 번이 한 줄로 저장돼요")).toBeVisible()
    // 우패널 AI 제안 영역의 동명 배지와 겹치지 않게 테이블 섹션으로 스코프.
    await expect(page.locator("#dictp-table-t1").getByText("AI 추정")).toBeVisible()

    // 구조화 해석(ASM-057) — 좋은 점/주의할 점 섹션이 불릿으로 보인다.
    await expect(page.locator("#dictp-table-t1").getByText("좋은 점")).toBeVisible()
    await expect(page.locator("#dictp-table-t1").getByText("산책 기록이 한 곳에 모여요")).toBeVisible()
    await expect(page.locator("#dictp-table-t1").getByText("주의할 점")).toBeVisible()
    await expect(page.locator("#dictp-table-t1").getByText("산책 코스 정보는 따로 없어요")).toBeVisible()
    // 양성 대조군 — 첫 방문에 GET이 실제로 나갔어야 "재발사 0" 판정이 의미가 있다.
    const noteGetAfterFirstVisit = counters.noteGet
    expect(noteGetAfterFirstVisit).toBeGreaterThan(0)

    // PRD로 복귀는 중앙 Segmented 경로로 — 좌 레일과 같은 store 선택을 공유한다(등가 커버리지 유지).
    await page.getByRole("group", { name: "문서 종류" }).getByRole("button", { name: "PRD" }).click()
    await expect(page.getByRole("heading", { name: "산책 기록", exact: true })).toBeVisible()

    // 데이터 사전 재진입 — 워크스페이스 노트 캐시가 GET 전량 재발사를 막는다(ASM-056 ⑦).
    await rail.getByRole("button", { name: "데이터 사전", exact: true }).click()
    await expect(page.getByText("산책 한 번이 한 줄로 저장돼요")).toBeVisible()
    expect(counters.noteGet).toBe(noteGetAfterFirstVisit)
  })

  test("문서 오버레이 창(ASM-065) — 다른 뷰에서 띄워 보고, 종류 선택·노트 캐시를 중앙 뷰와 공유한다", async ({ page }) => {
    await seedSession(page)
    const { counters } = await mockDocApis(page)
    await page.goto("/editor/f1")
    await expect(page.getByText("제품 구조")).toBeVisible()

    // 기본 뷰(기능명세서)에 머문 채 오버레이로 문서를 띄운다 — 중앙 문서 뷰 대체가 아닌 추가 경로.
    await page.getByRole("button", { name: "문서 띄우기" }).click()
    const dialog = page.getByRole("dialog", { name: "문서" })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("heading", { name: "산책 기록", exact: true })).toBeVisible()

    // 오버레이 안 종류 전환 — 기술 명세 본문이 창 안에 렌더된다.
    await dialog.getByRole("button", { name: "기술 명세" }).click()
    await expect(dialog.getByText("/api/walks")).toBeVisible()

    // Esc 닫기(OverlayPanel 몫) — 닫힌 뒤 중앙은 여전히 기능명세서 뷰(오버레이가 뷰를 바꾸지 않는다).
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(page.getByRole("group", { name: "문서 종류" })).toBeHidden()

    // 종류 선택 공유 — 오버레이에서 고른 "기술 명세"가 중앙 문서 뷰 진입("문서" 행) 때 그대로 산다.
    await page.getByRole("button", { name: /^문서 —/ }).click()
    await expect(page.getByRole("heading", { name: "산책 기록 화면" })).toBeVisible()

    // 중앙 데이터 사전 방문으로 노트 GET 1회 발사 → 캐시 적재.
    const rail = page.getByRole("complementary")
    await rail.getByRole("button", { name: "데이터 사전", exact: true }).click()
    await expect(page.getByText("산책 한 번이 한 줄로 저장돼요")).toBeVisible()
    const noteGetAfterCenterVisit = counters.noteGet
    expect(noteGetAfterCenterVisit).toBeGreaterThan(0)

    // 오버레이 재오픈(공유 docKind=데이터 사전) — 노트 GET이 캐시 히트로 0회 재발사(ASM-056 ⑦ 공유).
    await page.getByRole("button", { name: "문서 띄우기" }).click()
    await expect(dialog.getByText("산책 한 번이 한 줄로 저장돼요")).toBeVisible()
    expect(counters.noteGet).toBe(noteGetAfterCenterVisit)
  })

  test("오버레이 TOC 점프(재하달 ①) — 중앙 문서 뷰와 동시 렌더에서도 오버레이 안에서 동작한다(id 중복 제거)", async ({ page }) => {
    await seedSession(page)
    await mockDocApis(page)
    await page.goto("/editor/f1")
    await expect(page.getByText("제품 구조")).toBeVisible()

    // 중앙을 문서(PRD) 뷰로 두고 오버레이를 연다 — 같은 문서가 양쪽에 렌더되는 QA 실증 상황.
    const rail = page.getByRole("complementary")
    await rail.getByRole("button", { name: "PRD", exact: true }).click()
    await expect(page.getByRole("heading", { name: "산책 기록", exact: true })).toBeVisible()
    await page.getByRole("button", { name: "문서 띄우기" }).click()
    const dialog = page.getByRole("dialog", { name: "문서" })
    await expect(dialog).toBeVisible()

    // 마지막 섹션은 양쪽 모두 초기 화면 밖(전제 확인 — 점프 판정의 양성 대조군).
    const overlayLastSection = dialog.locator("#doc-overlay-docp-req-req-x7")
    const centerLastSection = page.locator("main").locator("#docp-req-req-x7")
    await expect(overlayLastSection).not.toBeInViewport()
    await expect(centerLastSection).not.toBeInViewport()

    // 오버레이 TOC에서 마지막 요구사항으로 점프 — 스크롤은 오버레이 인스턴스에서 일어나야 한다.
    await dialog
      .getByRole("navigation", { name: "문서 목차" })
      .getByRole("button", { name: "산책 부가 요구 7" })
      .click()
    await expect(overlayLastSection).toBeInViewport()
    // 가려진 중앙 인스턴스는 움직이지 않는다 — id 중복 시절엔 항상 이쪽이 스크롤됐다(회귀 가드).
    await expect(centerLastSection).not.toBeInViewport()
  })
})
