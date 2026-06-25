import { test, expect } from "@playwright/test"

// 플로우 맵 수용 스펙 (그림1). /goal의 GREEN 목표 — 현재는 RED(텍스트 리스트뿐, 다이어그램 미구현),
// Phase D에서 흐름 탭을 SVG 페이지맵으로 재구성하면 통과한다. 데이터: 기존 Page·UserFlow.
// 도달: /preview GraphShell → 흐름 탭.

test.describe("flow-map (그림1)", () => {
  test("흐름 탭이 연결선 있는 페이지 지도로 렌더된다(텍스트 리스트 아님)", async ({ page }) => {
    await page.goto("/preview")
    await page.getByRole("tab", { name: "흐름" }).click()

    // AC1·AC2 — 다이어그램 컨테이너(접근명 "화면 흐름 지도")가 있어야 한다(Phase D가 부여).
    const map = page.getByRole("img", { name: "화면 흐름 지도" })
    await expect(map).toBeVisible()

    // AC3 — 노드 사이를 잇는 SVG 엣지(path)가 1개 이상(=리스트가 아니라 연결된 지도).
    const edges = map.locator("svg path")
    await expect(edges.first()).toBeVisible()

    // 노드 라벨(페이지 이름)도 지도 안에 보인다.
    await expect(page.getByText("Login")).toBeVisible()
  })
})
