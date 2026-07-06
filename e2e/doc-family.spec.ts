import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// 문서 패밀리 (ASM-054) — 문서 종류 전환(PRD → 기술 명세 → 데이터 사전) 배선 검증.
// AI 호출 0 원칙: workspace·design·apis·db-tables·note 전부 page.route 모킹.

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
  grounded: true,
  isUserEdited: false,
  generatedAt: "2026-07-01T00:00:00Z",
}

async function mockDocApis(page: Page): Promise<void> {
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
  await page.route("**/api/workspaces/f1/db-tables/t1/note", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ note: NOTE }) })
  )
}

test.describe("문서 패밀리 (ASM-054)", () => {
  test("문서 종류 전환 — PRD → 기술 명세(API·테이블) → 데이터 사전(AI 해석 인라인)", async ({ page }) => {
    await seedSession(page)
    await mockDocApis(page)
    await page.goto("/editor/f1")
    await expect(page.getByText("제품 구조")).toBeVisible()

    // 문서 뷰 진입 — 기본 종류는 PRD(요구사항 투사).
    await page.getByRole("button", { name: /^문서 —/ }).click()
    await expect(page.getByRole("group", { name: "문서 종류" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "산책 기록", exact: true })).toBeVisible()

    // 기술 명세 — 기능 단위 섹션에 연결 API(메서드·엔드포인트)와 연결 테이블이 나온다.
    await page.getByRole("button", { name: "기술 명세" }).click()
    await expect(page.getByRole("heading", { name: "산책 기록 화면" })).toBeVisible()
    await expect(page.getByText("/api/walks")).toBeVisible()
    await expect(page.getByText("연결 DB 테이블")).toBeVisible()
    await expect(page.getByText("walks", { exact: true })).toBeVisible()

    // 데이터 사전 — 테이블 단위 + 저장된 AI 해석 노트가 인라인으로 붙는다("AI 추정" 표시 유지).
    await page.getByRole("button", { name: "데이터 사전" }).click()
    await expect(page.getByRole("heading", { name: "walks" })).toBeVisible()
    await expect(page.getByText("user_id 테이블의", { exact: false }).or(page.getByText("users 테이블을 가리켜요", { exact: false }))).toBeVisible()
    await expect(page.getByText("산책 한 번이 한 줄로 저장돼요")).toBeVisible()
    // 우패널 AI 제안 영역의 동명 배지와 겹치지 않게 테이블 섹션으로 스코프.
    await expect(page.locator("#dictp-table-t1").getByText("AI 추정")).toBeVisible()

    // PRD로 복귀 — 전환이 왕복으로도 산다.
    await page.getByRole("button", { name: "PRD" }).click()
    await expect(page.getByRole("heading", { name: "산책 기록", exact: true })).toBeVisible()
  })
})
