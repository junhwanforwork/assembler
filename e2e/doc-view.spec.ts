import { test, expect } from "@playwright/test"

// 문서 뷰 수용 스펙 (그림2). /goal의 GREEN 목표 — 현재는 RED(3분할 상세 패널 미구현),
// Phase C에서 DocView를 재구성하면 통과한다. 데이터: SAMPLE_GRAPH(req-login = R-100 진행중 등).
// 도달: /preview GraphShell → 문서 탭. (AI 호출 0 — 픽스처.)

test.describe("doc-view (그림2)", () => {
  test("문서 탭에 요구사항 상세(상태·역할·수용기준)가 보인다", async ({ page }) => {
    await page.goto("/preview")
    await page.getByRole("tab", { name: "문서" }).click()

    // 요구사항 선택 — 목록에서 R-100 요구사항을 연다(있으면 클릭, 없으면 아래 단언이 RED).
    const reqItem = page.getByText("사용자는 로그인할 수 있어야 한다.").first()
    await reqItem.click().catch(() => {})

    // AC4 — 상세 패널: 표시ID·상태·역할·수용 기준.
    await expect(page.getByText("R-100")).toBeVisible()
    await expect(page.getByText("진행중")).toBeVisible()
    await expect(page.getByText("일반 사용자")).toBeVisible()
    await expect(page.getByText("수용 기준")).toBeVisible()
    await expect(page.getByText("이메일·비밀번호로 로그인할 수 있어야 한다.")).toBeVisible()
  })

  test("기능 아래 상세기능 트리가 보인다", async ({ page }) => {
    await page.goto("/preview")
    await page.getByRole("tab", { name: "문서" }).click()

    // AC3 — 상세기능(이메일 입력·비밀번호 입력·로그인하기)이 기능 하위로 노출.
    await expect(page.getByText("이메일 입력")).toBeVisible()
    await expect(page.getByText("로그인하기")).toBeVisible()
  })
})
