import { test, expect } from "@playwright/test"
import { seedSession, mockProjects } from "./helpers"

// 스모크 — 매 autopilot 사이클 실행. 안정 표면(홈 대시보드 · /preview GraphShell)만 검증.
// AI 호출 0: /preview는 SAMPLE_GRAPH 픽스처로 GraphShell을 렌더한다.

test.describe("smoke", () => {
  test("홈 대시보드가 렌더된다", async ({ page }) => {
    await seedSession(page)
    await mockProjects(page, []) // Supabase 의존 제거(결정적)
    await page.goto("/")
    // 빈 상태에선 "새 프로젝트 만들기"가 헤더+빈상태 CTA 둘 다 — .first()로 strict 충돌 회피.
    await expect(page.getByRole("button", { name: "새 프로젝트 만들기" }).first()).toBeVisible()
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
