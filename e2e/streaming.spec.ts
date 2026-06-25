import { test, expect } from "@playwright/test"
import { seedSession, mockGenerateStream } from "./helpers"

// ASS-204 — 스트리밍 생성 점진 공개. 빈 빌더(ASS-207)에서 대화 → 레이어 도착마다 chrome이 채워진다.
// AI 호출 0: /api/generate 를 SSE 프레임으로 모킹(mockGenerateStream).

// 최소 유효 ProjectGraph 스냅샷 빌더 — 서버가 정규화해 보낸다고 가정한 형태.
function graph(extra: Record<string, unknown>) {
  return {
    id: "p",
    name: "테스트 프로젝트",
    description: "",
    requirements: [],
    features: [],
    pages: [],
    wireframes: [],
    uiElements: [],
    apis: [],
    databases: [],
    pageFlows: [],
    userFlow: { id: "uf", edges: [] },
    ...extra,
  }
}

const REQ_SNAPSHOT = graph({
  requirements: [{ id: "r1", title: "회원가입 요구", description: "" }],
  features: [
    {
      id: "f1",
      name: "회원가입",
      description: "",
      businessRules: [],
      requirementIds: ["r1"],
      pageIds: [],
      apiIds: [],
      databaseIds: [],
      requiredData: [],
      optionalData: [],
    },
  ],
})

test.describe("streaming generation (ASS-204)", () => {
  test("빈 빌더에서 생성 → 레이어가 점진적으로 채워진다", async ({ page }) => {
    await seedSession(page)
    // 빈 빌더 진입 경로(ASS-207): 목록 0 → POST → /project/{id} → 빈 document.
    await page.route("**/api/projects", (route) => {
      const method = route.request().method()
      if (method === "GET")
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ projects: [] }),
        })
      if (method === "POST")
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "e2e-stream" }),
        })
      return route.fallback()
    })
    // GET(빈 그래프 로드) + PUT(done 저장) 모두 200.
    await page.route("**/api/projects/e2e-stream", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ project: { title: "제목 없는 프로젝트", document: {} } }),
      })
    )
    await mockGenerateStream(page, [
      { type: "layer", layer: "requirements", graph: REQ_SNAPSHOT },
      { type: "done", graph: REQ_SNAPSHOT },
    ])

    await page.goto("/")
    await expect(page).toHaveURL(/\/project\/e2e-stream/)
    // 시작 상태: 빈 캔버스 안내.
    await expect(page.getByText("아직 비어 있어요")).toBeVisible()

    // 채팅 도크에 아이디어 입력 → 생성.
    await page.getByPlaceholder("무엇을 만들까요?").fill("회원가입이 있는 앱")
    await page.getByRole("button", { name: "생성하기" }).click()

    // 첫 레이어가 머지되면 빈 안내가 사라지고 트리에 기능이 나타난다.
    await expect(page.getByText("아직 비어 있어요")).toHaveCount(0)
    await expect(page.getByText("회원가입").first()).toBeVisible()
  })
})
