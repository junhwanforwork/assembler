import { test, expect } from "@playwright/test"
import { seedSession, mockProjects } from "./helpers"

// 스모크 — 매 autopilot 사이클 실행. 안정 표면(홈 대시보드 · /preview GraphShell)만 검증.
// AI 호출 0: /preview는 SAMPLE_GRAPH 픽스처로 GraphShell을 렌더한다.
// ⏸ skip(2026-07-02): 리셋 리빌드로 대상 표면 삭제 — /preview·/api/projects 없음, "/"는 새 asm_* DashboardClient.
//    새 표면(대시보드·에디터) e2e 재작성 시 이 파일을 대체한다(후속 티켓).

test.describe.skip("smoke", () => {
  test("홈 대시보드가 렌더된다(프로젝트 있을 때)", async ({ page }) => {
    await seedSession(page)
    // 프로젝트가 있으면 대시보드를 그린다(0개는 빈 빌더로 라우팅 — 아래 별도 케이스).
    await mockProjects(page, [
      { id: "p1", title: "샘플 프로젝트", screenCount: 2, updatedAt: "2026-06-25T00:00:00.000Z" },
    ])
    await page.goto("/")
    await expect(page.getByRole("button", { name: "새 프로젝트 만들기" }).first()).toBeVisible()
    await expect(page.getByText("샘플 프로젝트")).toBeVisible()
  })

  test("첫 방문(프로젝트 0개) → 빈 빌더로 진입한다 (ASS-207)", async ({ page }) => {
    await seedSession(page)
    // 목록 0개 → createProject(POST) → /project/{id} 진입. 빈 document → 빈 그래프 → CanvasEmptyState.
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
          body: JSON.stringify({ id: "e2e-empty" }),
        })
      return route.fallback()
    })
    await page.route("**/api/projects/e2e-empty", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ project: { title: "제목 없는 프로젝트", document: {} } }),
      })
    )
    await page.goto("/")
    await expect(page).toHaveURL(/\/project\/e2e-empty/)
    // 풀 chrome — 좌측 탐색기 + 중앙 빈 캔버스 안내.
    await expect(page.getByText("탐색기")).toBeVisible()
    await expect(page.getByText("아직 비어 있어요")).toBeVisible()
  })

  test("/preview 객체그래프 빌더(탐색기 트리 + 탭)가 렌더된다", async ({ page }) => {
    await page.goto("/preview")
    await expect(page.getByText("탐색기")).toBeVisible()
    await expect(page.getByRole("tab", { name: "흐름" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "문서" })).toBeVisible()
  })

  test("/preview 캔버스 탭 전환(흐름 → 문서)", async ({ page }) => {
    await page.goto("/preview")
    const docTab = page.getByRole("tab", { name: "문서" })
    await docTab.click()
    await expect(docTab).toHaveAttribute("aria-selected", "true")
  })
})
