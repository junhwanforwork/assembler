import { test, expect, type Page } from "@playwright/test"
import { seedSession } from "./helpers"

// ASM-085 — FeatureStatusControls: 구현/변경 Select + 역할별 확인 Segmented.
// AI·DB 실호출 0 — design GET/PATCH를 스테이트풀 모킹(머지 계약 재현). editor-editing.spec.ts 패턴 복제.

const WORKSPACE = { id: "f1", productId: "p1", name: "산책 메이트 스펙", isMain: true }

function makeDesign() {
  return {
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
        // 설정본 — implStatus/changeStatus/reviews 채워 렌더·편집 검증.
        id: "feat-1",
        name: "산책 기록 화면",
        description: "기록 시작·종료",
        detailFeatures: [],
        requirementIds: ["req-1"],
        pageIds: [],
        apiIds: [],
        implStatus: "in_progress",
        changeStatus: "changed",
        reviews: { planner: "checked" },
      },
      {
        // 레거시본 — 상태 필드 없음. 기본값(미정/변경없음/미확인)으로 렌더돼야 한다.
        id: "feat-legacy",
        name: "산책 공유 화면",
        description: "",
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
}

// 스테이트풀 design 모킹 — PATCH의 "준 컬렉션은 통째 교체" 머지 계약을 재현해 후속 GET도 일관된 그래프를 돌려준다.
// patchDelayMs: 저장 중 disabled 관찰용(⑥) — PATCH 응답을 지연.
async function mockEditorApis(page: Page): Promise<{
  patched: Record<string, unknown>[]
  setPatchDelay: (ms: number) => void
}> {
  const captured = { patched: [] as Record<string, unknown>[] }
  let current = makeDesign()
  let patchDelayMs = 0
  const setPatchDelay = (ms: number) => {
    patchDelayMs = ms
  }
  await page.route("**/api/**", (route) => route.abort())
  await page.route("**/api/workspaces/f1", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WORKSPACE) })
  )
  await page.route("**/api/workspaces/f1/design", async (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, unknown>
      captured.patched.push(body)
      if (patchDelayMs) await new Promise((r) => setTimeout(r, patchDelayMs))
      current = { ...current, ...(body as Partial<ReturnType<typeof makeDesign>>) }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ saved: true, design: current }),
      })
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ design: current }) })
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
  return { ...captured, setPatchDelay }
}

async function openEditor(page: Page) {
  await seedSession(page)
  const mock = await mockEditorApis(page)
  await page.goto("/editor/f1")
  await expect(page.getByRole("complementary", { name: "AI 프롬프트" })).toBeVisible()
  return mock
}

function detail(page: Page) {
  return page.getByRole("dialog", { name: "상세" })
}

async function openFeature(page: Page, name: RegExp) {
  await page.getByRole("button", { name }).first().click()
  await expect(detail(page).getByRole("heading", { name: "상태" })).toBeVisible()
}

test.describe("ASM-085 — 기능 상태/리뷰 컨트롤", () => {
  test("① 구현 Select 변경 → features 스코프드 PATCH 1회(implStatus)", async ({ page }) => {
    const mock = await openEditor(page)
    await openFeature(page, /산책 기록 화면/)

    await detail(page).getByRole("button", { name: "구현 상태" }).click()
    await page.getByRole("option", { name: "구현됨" }).click()

    await expect.poll(() => mock.patched.length).toBe(1)
    const body = mock.patched[0] as { features?: { id: string; implStatus?: string }[] }
    expect(Object.keys(body)).toEqual(["features"])
    expect(body.features?.find((f) => f.id === "feat-1")?.implStatus).toBe("implemented")
  })

  test("② 변경 Select 변경 → features 스코프드 PATCH(changeStatus)", async ({ page }) => {
    const mock = await openEditor(page)
    await openFeature(page, /산책 기록 화면/)

    await detail(page).getByRole("button", { name: "변경 상태" }).click()
    await page.getByRole("option", { name: "확정" }).click()

    await expect.poll(() => mock.patched.length).toBe(1)
    const body = mock.patched[0] as { features?: { id: string; changeStatus?: string }[] }
    expect(Object.keys(body)).toEqual(["features"])
    expect(body.features?.find((f) => f.id === "feat-1")?.changeStatus).toBe("confirmed")
  })

  test("③ 역할 Segmented 미확인→확인 → reviews에 키 추가", async ({ page }) => {
    const mock = await openEditor(page)
    await openFeature(page, /산책 기록 화면/)

    // designer는 seed에 없어 기본값 미확인 → 확인 클릭.
    await detail(page).getByRole("group", { name: "디자인 확인" }).getByRole("button", { name: "확인", exact: true }).click()

    await expect.poll(() => mock.patched.length).toBe(1)
    const body = mock.patched[0] as { features?: { id: string; reviews?: Record<string, string> }[] }
    const reviews = body.features?.find((f) => f.id === "feat-1")?.reviews
    expect(reviews?.designer).toBe("checked")
    // 기존 planner 확인은 유지(머지).
    expect(reviews?.planner).toBe("checked")
  })

  test("④ 확인→미확인(not_checked) → reviews에서 키 삭제", async ({ page }) => {
    const mock = await openEditor(page)
    await openFeature(page, /산책 기록 화면/)

    // planner는 seed에서 checked → 미확인 클릭 = 키 삭제.
    await detail(page).getByRole("group", { name: "기획 확인" }).getByRole("button", { name: "미확인", exact: true }).click()

    await expect.poll(() => mock.patched.length).toBe(1)
    const body = mock.patched[0] as { features?: { id: string; reviews?: Record<string, string> }[] }
    const reviews = body.features?.find((f) => f.id === "feat-1")?.reviews ?? {}
    expect("planner" in reviews).toBe(false)
  })

  test("⑤ 같은 값 재선택 → PATCH 0", async ({ page }) => {
    const mock = await openEditor(page)
    await openFeature(page, /산책 기록 화면/)

    // implStatus 현재 진행중을 그대로 재선택.
    await detail(page).getByRole("button", { name: "구현 상태" }).click()
    await page.getByRole("option", { name: "진행중" }).click()

    // 무변경은 호출 자체를 건너뛴다 — 잠깐 기다려도 PATCH 0.
    await page.waitForTimeout(300)
    expect(mock.patched).toHaveLength(0)
  })

  test("⑥ 저장 중 컨트롤 disabled(이중 클릭 차단)", async ({ page }) => {
    const mock = await openEditor(page)
    await openFeature(page, /산책 기록 화면/)
    mock.setPatchDelay(800)

    const changeTrigger = detail(page).getByRole("button", { name: "변경 상태" })
    const implTrigger = detail(page).getByRole("button", { name: "구현 상태" })

    // 한 컨트롤 변경 → 저장 인플라이트 동안 다른 컨트롤도 잠긴다.
    await changeTrigger.click()
    await page.getByRole("option", { name: "확정" }).click()
    await expect(implTrigger).toBeDisabled()

    // 저장 완료 후 재활성 + PATCH는 1회만.
    await expect(implTrigger).toBeEnabled()
    expect(mock.patched).toHaveLength(1)
  })

  test("레거시본(상태 필드 없음)은 기본값으로 렌더", async ({ page }) => {
    await openEditor(page)
    await openFeature(page, /산책 공유 화면/)

    await expect(detail(page).getByRole("button", { name: "구현 상태" })).toContainText("미정")
    await expect(detail(page).getByRole("button", { name: "변경 상태" })).toContainText("변경없음")
    // 세 역할 모두 미확인이 active.
    for (const role of ["기획 확인", "디자인 확인", "개발 확인"]) {
      const notChecked = detail(page).getByRole("group", { name: role }).getByRole("button", { name: "미확인", exact: true })
      await expect(notChecked).toHaveAttribute("aria-pressed", "true")
    }
  })
})
