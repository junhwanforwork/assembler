import { test, expect, type Page } from "@playwright/test"
import { mockProjects, seedSession } from "./helpers"

// 에디터 챗+변경 계획 도크 (ASM-018) — DoD: 챗 입력 → 도크 승인 ≤ 3 인터랙션으로 그래프 반영.
// AI 호출 0 원칙: chat·suggestions·design PATCH 전부 page.route 모킹.

const WORKSPACE = { id: "f1", productId: "p1", name: "산책 메이트 스펙", isMain: true }

// 참조 관계(feature→req·page, page→wireframe)를 심는다 — update op의 역참조 전파(ASM-038)가
// 영향 범위 섹션을 띄우려면 대상을 참조하는 객체가 실재해야 한다.
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
      pageIds: ["page-1"],
      apiIds: [],
    },
  ],
  pages: [{ id: "page-1", name: "기록 페이지", description: "", wireframeId: "wf-1" }],
  flows: [],
  wireframes: [{ id: "wf-1", elementIds: [] }],
  elements: [],
}

// AI가 만든 변경 계획 — 요구사항 1건 추가 + 기존 1건 수정(add/update payload = 항목 전체).
const PLAN_BLOCKS = [
  { kind: "text", text: "법인 카드 요구사항을 계획으로 만들었어요." },
  {
    kind: "plan",
    plan: {
      title: "결제 요구사항 추가",
      summary: "요구사항 1건을 추가하고 1건을 다듬어요.",
      ops: [
        {
          id: "op-0",
          collection: "requirements",
          action: "add",
          targetId: "req-2",
          summary: "결제 요구사항을 추가해요",
          payload: {
            id: "req-2",
            title: "결제",
            description: "사용자는 결제할 수 있다",
            status: "draft",
            priority: "medium",
            role: "회원",
            acceptanceCriteria: [],
          },
        },
        {
          id: "op-1",
          collection: "requirements",
          action: "update",
          targetId: "req-1",
          summary: "산책 기록 요구사항을 다듬어요",
          payload: {
            id: "req-1",
            title: "산책 기록",
            description: "사용자는 산책을 상세히 기록할 수 있다",
            status: "draft",
            priority: "high",
            role: "회원",
            acceptanceCriteria: [],
          },
        },
      ],
    },
  },
]

async function mockEditorApis(
  page: Page,
  opts: { chatDelayMs?: number } = {},
): Promise<{ patched: unknown[]; suggestions: number }> {
  const captured = { patched: [] as unknown[], suggestions: 0 }
  // 발화 정책(ASM-048) 검증용 — 라우트 처리 여부와 무관하게 시도된 suggestions 요청을 전부 센다.
  page.on("request", (req) => {
    if (/\/api\/workspaces\/[^/]+\/suggestions/.test(req.url())) captured.suggestions += 1
  })
  // 미모킹 API 전부 차단 — 실 Supabase·Anthropic으로 새지 않게.
  await page.route("**/api/**", (route) => route.abort())
  await page.route("**/api/workspaces/f1", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WORKSPACE) })
  )
  await page.route("**/api/workspaces/f1/design", (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, unknown>
      captured.patched.push(body)
      // 서버 계약: 머지된 최종본을 돌려준다.
      const merged = { ...DESIGN, ...(body as object) }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ saved: true, design: merged }),
      })
    }
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
  await page.route("**/api/workspaces/f1/chat", async (route) => {
    // 늦은 응답 시나리오(ASM-048) — 도크 언마운트 뒤 도착하는 응답을 재현한다.
    if (opts.chatDelayMs) await new Promise((resolve) => setTimeout(resolve, opts.chatDelayMs))
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ blocks: PLAN_BLOCKS }) })
  })
  return captured
}

test.describe("에디터 챗 도크 (ASM-018)", () => {
  test("챗 입력 → 계획 자동 오픈 → 적용하기 = 3 인터랙션으로 그래프 반영(DoD)", async ({ page }) => {
    await seedSession(page)
    const captured = await mockEditorApis(page)
    await page.goto("/editor/f1")

    // 에디터 도달 — 좌측 "설계" 레일(ASM-017 개명).
    await expect(page.getByText("Storyboard")).toBeVisible()

    // 인터랙션 1: 챗 입력 + Enter.
    const input = page.getByLabel("AI 챗 입력")
    await input.fill("결제 기능 추가해줘")
    await input.press("Enter")

    // 변경 계획 도착 → 도크 자동 오픈 + 계획 카드.
    await expect(page.getByText("결제 요구사항 추가", { exact: true })).toBeVisible()
    await expect(page.getByText("결제 요구사항을 추가해요")).toBeVisible()

    // 인터랙션 2: 적용하기 → 스코프드 PATCH(#62).
    await page.getByRole("button", { name: "적용하기" }).click()
    await expect(page.getByText("변경 계획을 스펙에 반영했어요.")).toBeVisible()

    // 와이어 레벨 검증 — 바뀐 컬렉션(requirements)만 보냈고, 추가 항목이 실려 있다.
    expect(captured.patched).toHaveLength(1)
    const body = captured.patched[0] as { requirements?: { id: string }[] }
    expect(Object.keys(body)).toEqual(["requirements"])
    expect(body.requirements?.map((r) => r.id)).toEqual(["req-1", "req-2"])

    // 그래프 반영 확인 — LeftRail 문서(요구사항 수) 뱃지가 1→2.
    await expect(page.getByRole("button", { name: /문서/ }).getByText("2")).toBeVisible()
  })

  test("버리기 = 확인 1단계 후 폐기, PATCH 없음(#61)", async ({ page }) => {
    await seedSession(page)
    const captured = await mockEditorApis(page)
    await page.goto("/editor/f1")

    const input = page.getByLabel("AI 챗 입력")
    await input.fill("결제 기능 추가해줘")
    await input.press("Enter")
    await expect(page.getByText("결제 요구사항 추가", { exact: true })).toBeVisible()

    await page.getByRole("button", { name: "버리기" }).click()
    await expect(page.getByText("이 계획을 버릴까요?")).toBeVisible()
    await page.getByRole("button", { name: "버리기" }).click()

    // 카드가 사라지고 저장은 일어나지 않는다.
    await expect(page.getByText("결제 요구사항 추가", { exact: true })).toHaveCount(0)
    expect(captured.patched).toHaveLength(0)
  })

  test("update op → 영향 범위 칩 렌더 + 기능 칩 클릭 = 명세 점프 (ASM-038)", async ({ page }) => {
    await seedSession(page)
    await mockEditorApis(page)
    await page.goto("/editor/f1")

    const input = page.getByLabel("AI 챗 입력")
    await input.fill("산책 기록 요구사항 다듬어줘")
    await input.press("Enter")
    await expect(page.getByText("결제 요구사항 추가", { exact: true })).toBeVisible()

    // update op(req-1)의 역참조 전파 — 직접 대상(요구사항) 칩과 전이 영향(기능) 칩이 그려진다.
    await expect(page.getByText("영향 범위")).toBeVisible()
    await expect(page.getByRole("button", { name: "요구사항 산책 기록" })).toBeVisible()
    const featureChip = page.getByRole("button", { name: "기능 산책 기록하기" })
    await expect(featureChip).toBeVisible()

    // 칩 클릭 = 명세 선택 점프(useSpecJump) — 인스펙터가 기능 상세(연결된 요구사항 섹션)를 비춘다.
    await featureChip.click()
    await expect(page.getByText("연결된 요구사항")).toBeVisible()

    // applying 중 칩 차단(ASM-038) — PATCH 응답을 지연시켜 적용 중 창을 고정하고 disabled 단언.
    await page.route("**/api/workspaces/f1/design", async (route) => {
      if (route.request().method() !== "PATCH") return route.fallback()
      await new Promise((resolve) => setTimeout(resolve, 700))
      const body = route.request().postDataJSON() as Record<string, unknown>
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ saved: true, design: { ...DESIGN, ...(body as object) } }),
      })
    })
    await page.getByRole("button", { name: "적용하기" }).click()
    await expect(featureChip).toBeDisabled()
    await expect(page.getByText("변경 계획을 스펙에 반영했어요.")).toBeVisible()
  })
})

// suggestions는 유료 AI 호출 — 사용자가 의도한 명시 트리거(도크 토글·재시도)에서만 발화해야 한다.
test.describe("suggestions 발화 정책 (ASM-048)", () => {
  test("인풋 포커스·타이핑만으로는 suggestions를 호출하지 않는다(항상 열린 좌측 패널)", async ({ page }) => {
    await seedSession(page)
    const captured = await mockEditorApis(page)
    await page.goto("/editor/f1")
    await expect(page.getByText("Storyboard")).toBeVisible()

    // 프롬프트가 좌측 도킹 패널로 이주(ASM-076) — 접이식 토글 없이 항상 열려 있다.
    const input = page.getByLabel("AI 챗 입력")
    await input.focus()
    await input.fill("결제")
    // 포커스·타이핑은 유료 suggestions 호출을 내지 않는다(ASM-048).
    await expect(input).toBeVisible()
    await page.waitForTimeout(500)
    expect(captured.suggestions).toBe(0)
  })

  test("챗 전송·계획 자동 오픈 경로에서도 suggestions는 발화하지 않는다", async ({ page }) => {
    await seedSession(page)
    const captured = await mockEditorApis(page)
    await page.goto("/editor/f1")
    await expect(page.getByText("Storyboard")).toBeVisible()

    const input = page.getByLabel("AI 챗 입력")
    await input.fill("결제 기능 추가해줘")
    await input.press("Enter")
    // 계획 도착 → 도크 자동 오픈까지 일어나되 suggestions는 침묵.
    await expect(page.getByText("결제 요구사항 추가", { exact: true })).toBeVisible()
    await page.waitForTimeout(500)
    expect(captured.suggestions).toBe(0)
  })

  test("명시 트리거만 발화 — '추천 보기'로 1회, 실패 후 재시도 버튼으로 재발화", async ({ page }) => {
    await seedSession(page)
    const captured = await mockEditorApis(page)
    // 첫 요청은 실패시켜 재시도 버튼 경로까지 검증한다.
    let sugCalls = 0
    await page.route("**/api/workspaces/f1/suggestions", (route) => {
      sugCalls += 1
      if (sugCalls === 1) return route.fulfill({ status: 500, contentType: "application/json", body: "{}" })
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ suggestions: [{ id: "sug-1", title: "산책 알림 추가", detail: "산책 시간을 알려줘요" }] }),
      })
    })
    await page.goto("/editor/f1")
    await expect(page.getByText("Storyboard")).toBeVisible()

    // 항상 열린 패널에는 도크 토글이 없다 — 명시 트리거는 "추천 보기" 버튼(ASM-048 유료 발화 관문).
    await page.getByRole("button", { name: "추천 보기" }).click()
    await expect(page.getByText("추천을 불러오지 못했어요.")).toBeVisible()
    expect(captured.suggestions).toBe(1)

    await page.getByRole("button", { name: "다시 시도하기" }).click()
    await expect(page.getByRole("button", { name: /산책 알림 추가/ })).toBeVisible()
    expect(captured.suggestions).toBe(2)
  })

  test("늦은 챗 응답은 언마운트된 도크에서 suggestions를 발화하지 못한다", async ({ page }) => {
    await seedSession(page)
    const captured = await mockEditorApis(page, { chatDelayMs: 1200 })
    await mockProjects(page) // 대시보드 이탈 후 화면이 죽지 않게 목록만 고정 응답
    await page.goto("/editor/f1")
    await expect(page.getByText("Storyboard")).toBeVisible()

    const input = page.getByLabel("AI 챗 입력")
    await input.fill("결제 기능 추가해줘")
    await input.press("Enter")
    // 응답이 오기 전에 SPA 내비게이션으로 에디터 이탈 — 도크 언마운트, 요청은 계속 산다.
    await page.getByLabel("대시보드로 돌아가기").click()
    await expect(page).toHaveURL("/")

    // 늦은 응답 도착 이후까지 기다려도 유료 호출은 0이어야 한다.
    await page.waitForTimeout(2500)
    expect(captured.suggestions).toBe(0)
  })
})
